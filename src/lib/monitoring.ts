import { supabase } from '@/integrations/supabase/client';
import { APP_BUILD_LABEL, APP_COMMIT } from '@/config/build';

const STORAGE_KEY = 'swan_frontend_error_events';
const MAX_LOCAL_EVENTS = 50;

export type FrontendErrorEvent = {
  id?: string;
  message: string;
  stack?: string | null;
  source: string;
  route: string;
  user_agent: string;
  build: string;
  commit: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

let installed = false;
let reporting = false;

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const serializeReason = (reason: unknown) => {
  if (reason instanceof Error) {
    return {
      message: reason.message || reason.name,
      stack: reason.stack ?? null,
    };
  }
  if (typeof reason === 'string') {
    return { message: reason, stack: null };
  }
  try {
    return { message: JSON.stringify(reason), stack: null };
  } catch {
    return { message: String(reason), stack: null };
  }
};

export function getLocalFrontendErrors(): FrontendErrorEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalFrontendError(event: FrontendErrorEvent) {
  if (!isBrowser()) return;
  const next = [event, ...getLocalFrontendErrors()].slice(0, MAX_LOCAL_EVENTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local storage can be unavailable in private contexts.
  }
}

export async function captureFrontendError(
  error: unknown,
  options: { source?: string; metadata?: Record<string, unknown> } = {}
) {
  if (reporting) return;
  reporting = true;

  try {
    const serialized = serializeReason(error);
    const event: FrontendErrorEvent = {
      message: serialized.message || 'Erreur frontend inconnue',
      stack: serialized.stack,
      source: options.source || 'frontend',
      route: isBrowser() ? window.location.pathname + window.location.search : '/',
      user_agent: isBrowser() ? window.navigator.userAgent : 'server',
      build: APP_BUILD_LABEL,
      commit: APP_COMMIT,
      metadata: options.metadata ?? {},
      created_at: new Date().toISOString(),
    };

    saveLocalFrontendError(event);

    const { data: userData } = await supabase.auth.getUser();
    await (supabase as any).from('frontend_error_events').insert({
      ...event,
      user_id: userData.user?.id ?? null,
    });
  } catch {
    // Monitoring must never trigger a second crash.
  } finally {
    reporting = false;
  }
}

export function installFrontendMonitoring() {
  if (!isBrowser() || installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    void captureFrontendError(event.error || event.message, {
      source: 'window_error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    void captureFrontendError(event.reason, {
      source: 'unhandled_rejection',
    });
  });
}
