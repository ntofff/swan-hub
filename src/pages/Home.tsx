// ============================================================
// SWAN · HUB — Page d'Accueil
// Brief SWAN · Outils · Activité récente
// ============================================================

import { useState, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, CheckSquare, Target, Receipt, BookOpen, Car,
  Users, Wallet, Calendar, Banknote, Timer, Package, ShieldCheck,
  Sparkles, ChevronRight, Sun, Moon, Bell, Crown,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { FeedbackButton } from '@/components/FeedbackButton';
import { TutorialButton } from '@/components/TutorialButton';
import { VoicePlayer } from '@/components/VoicePlayer';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVE_PLUGINS, SWAN_COPY } from '@/config/tokens';
import { HOME_TUTORIAL } from '@/config/tutorials';
import { APP_BUILD_LABEL, APP_COMMIT } from '@/config/build';

// ── Map des icônes (Lucide) ───────────────────────────────────
const ICON_MAP: Record<string, any> = {
  FileText, CheckSquare, Target, Receipt, BookOpen, Car,
  Users, Wallet, Calendar, Banknote, Timer, Package, ShieldCheck,
};

const TOOL_COLORS = ACTIVE_PLUGINS.reduce<Record<string, string>>((acc, plugin) => {
  acc[plugin.id] = plugin.color;
  return acc;
}, {});

const getToolColor = (toolId: string) => TOOL_COLORS[toolId] || '38 50% 58%';

// ── Utilitaires ───────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return SWAN_COPY.greetings.morning;
  if (hour < 18) return SWAN_COPY.greetings.afternoon;
  return SWAN_COPY.greetings.evening;
}

function formatRelativeTime(date: string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 3_600_000) {
    const mins = Math.max(1, Math.floor(diff / 60_000));
    return `il y a ${mins} min`;
  }
  if (diff < 86_400_000) {
    return `il y a ${Math.floor(diff / 3_600_000)}h`;
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getTimestamp(date?: string | null): number {
  if (!date) return 0;
  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function shortText(value?: string | null, fallback = 'Sans titre'): string {
  const text = (value || fallback).trim();
  return text.length > 70 ? `${text.slice(0, 67)}...` : text;
}

// ── Composant principal ───────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { user, profile, hasAccessToPlugin } = useAuth();
  const { setTheme, isDark, toggleTextSize, isLargeText } = useTheme();
  const [activityOpen, setActivityOpen] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const greeting = getGreeting();
  const isVip = profile?.is_vip ?? false;
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const trialReminderVisible = profile?.plan === 'free' && trialDaysLeft !== null && trialDaysLeft <= 7;
  const visibleToolIds = profile?.is_vip
    ? null
    : profile?.visible_plugin_ids?.length
      ? profile.visible_plugin_ids
      : null;
  const displayedPlugins = ACTIVE_PLUGINS
    .filter((plugin) => hasAccessToPlugin(plugin.id))
    .filter((plugin) => !visibleToolIds || visibleToolIds.includes(plugin.id))
    .slice(0, 8);

  // ── Brief SWAN : agrégat des données clés du jour ──────────
  const { data: briefData, isLoading: briefLoading } = useQuery({
    queryKey: ['home_brief'],
    queryFn: async () => {
      const [tasks, quotes, missions] = await Promise.all([
        supabase
          .from('tasks')
          .select('text, done, deadline, priority')
          .eq('done', false)
          .eq('archived', false)
          .order('deadline', { ascending: true, nullsFirst: false })
          .limit(10),
        supabase
          .from('invoices')
          .select('title, amount_ht, status, issue_date, payment_terms')
          .in('status', ['Envoyé', 'En retard'])
          .order('issue_date', { ascending: false })
          .limit(10),
        supabase
          .from('missions')
          .select('title, status, end_date')
          .eq('status', 'Actif')
          .limit(10),
      ]);
      return {
        tasks: tasks.data ?? [],
        quotes: quotes.data ?? [],
        missions: missions.data ?? [],
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // ── Calcul des informations clés pour le brief ─────────────
  const briefInfo = useMemo(() => {
    if (!briefData) return null;
    const now = Date.now();

    const overdueTasks = briefData.tasks.filter(
      (t: any) => t.deadline && new Date(t.deadline).getTime() < now
    ).length;

    const todayTasks = briefData.tasks.filter((t: any) => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }).length;

    const overdueInvoices = briefData.quotes.filter((q: any) => {
      if (!q.issue_date || !q.payment_terms) return false;
      const due = new Date(q.issue_date).getTime() + q.payment_terms * 86_400_000;
      return due < now && q.status !== 'Payé';
    });

    const pendingAmount = overdueInvoices.reduce(
      (sum: number, q: any) => sum + (Number(q.amount_ht) || 0),
      0
    );

    const activeMissions = briefData.missions.length;

    return {
      overdueTasks,
      todayTasks,
      overdueInvoices: overdueInvoices.length,
      pendingAmount,
      activeMissions,
      hasUrgent: overdueTasks > 0 || overdueInvoices.length > 0,
    };
  }, [briefData]);

  // ── Activité récente ────────────────────────────────────────
  const { data: activity = [] } = useQuery({
    queryKey: ['home_activity'],
    queryFn: async () => {
      const [
        reports,
        tasks,
        quotes,
        invoices,
        missions,
        logEntries,
        trips,
        vehicles,
        drivers,
        routes,
        expenses,
        inventory,
      ] = await Promise.allSettled([
        supabase
          .from('reports')
          .select('id, title, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('tasks')
          .select('id, text, done, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase
          .from('quotes')
          .select('id, title, quote_number, client, status, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase
          .from('invoices')
          .select('id, title, invoice_number, client, status, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase
          .from('missions')
          .select('id, title, status, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase
          .from('log_entries')
          .select('id, text, priority, entry_date, created_at')
          .eq('user_id', user!.id)
          .order('entry_date', { ascending: false })
          .limit(8),
        supabase
          .from('trips')
          .select('id, purpose, start_location, end_location, date, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('vehicles')
          .select('id, name, brand_model, license_plate, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase
          .from('drivers')
          .select('id, name, role, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase
          .from('frequent_routes')
          .select('id, name, start_location, end_location, created_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(8),
        (supabase as any)
          .from('expense_receipts')
          .select('id, title, vendor, amount_ttc, status, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(8),
        (supabase as any)
          .from('inventory_items')
          .select('id, name, category, assigned_to, location, status, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(8),
      ]);

      const dataOf = (result: PromiseSettledResult<any>) => (
        result.status === 'fulfilled' && !result.value.error ? result.value.data ?? [] : []
      );

      const items = [
        ...dataOf(reports).map((r: any) => ({
          id: `r-${r.id}`,
          text: shortText(r.title, 'Rapport sans titre'),
          type: 'report',
          icon: FileText,
          path: '/plugins/report',
          time: formatRelativeTime(r.updated_at || r.created_at),
          timestamp: getTimestamp(r.updated_at || r.created_at),
          label: 'Rapport',
          color: getToolColor('report'),
        })),
        ...dataOf(tasks).map((t: any) => ({
          id: `t-${t.id}`,
          text: shortText(t.text, 'Tâche sans titre'),
          type: 'task',
          icon: CheckSquare,
          path: '/plugins/tasks',
          time: formatRelativeTime(t.updated_at),
          timestamp: getTimestamp(t.updated_at),
          label: 'Tâche',
          done: t.done,
          color: getToolColor('tasks'),
        })),
        ...dataOf(quotes).map((q: any) => ({
          id: `q-${q.id}`,
          text: shortText(`${q.quote_number ? `${q.quote_number} - ` : ''}${q.title || q.client || 'Devis sans titre'}`),
          type: 'quote',
          icon: Receipt,
          path: '/plugins/quotes',
          time: formatRelativeTime(q.updated_at || q.created_at),
          timestamp: getTimestamp(q.updated_at || q.created_at),
          label: 'Devis',
          color: getToolColor('quotes'),
        })),
        ...dataOf(invoices).map((i: any) => ({
          id: `i-${i.id}`,
          text: shortText(`${i.invoice_number ? `${i.invoice_number} - ` : ''}${i.title || i.client || 'Facture sans titre'}`),
          type: 'invoice',
          icon: Receipt,
          path: '/plugins/quotes',
          time: formatRelativeTime(i.updated_at || i.created_at),
          timestamp: getTimestamp(i.updated_at || i.created_at),
          label: 'Facture',
          color: getToolColor('quotes'),
        })),
        ...dataOf(missions).map((m: any) => ({
          id: `m-${m.id}`,
          text: shortText(m.title, 'Mission sans titre'),
          type: 'mission',
          icon: Target,
          path: '/plugins/missions',
          time: formatRelativeTime(m.updated_at || m.created_at),
          timestamp: getTimestamp(m.updated_at || m.created_at),
          label: 'Mission',
          color: getToolColor('missions'),
        })),
        ...dataOf(logEntries).map((entry: any) => ({
          id: `l-${entry.id}`,
          text: shortText(entry.text, 'Note sans titre'),
          type: 'logbook',
          icon: BookOpen,
          path: '/plugins/logbook',
          time: formatRelativeTime(entry.entry_date || entry.created_at),
          timestamp: getTimestamp(entry.entry_date || entry.created_at),
          label: 'Journal',
          color: getToolColor('logbook'),
        })),
        ...dataOf(trips).map((trip: any) => ({
          id: `trip-${trip.id}`,
          text: shortText(trip.purpose || `${trip.start_location || 'Départ'} → ${trip.end_location || 'Arrivée'}`, 'Trajet'),
          type: 'trip',
          icon: Car,
          path: '/plugins/vehicle',
          time: formatRelativeTime(trip.updated_at || trip.created_at || trip.date),
          timestamp: getTimestamp(trip.updated_at || trip.created_at || trip.date),
          label: 'Trajet',
          color: getToolColor('vehicle'),
        })),
        ...dataOf(vehicles).map((vehicle: any) => ({
          id: `vehicle-${vehicle.id}`,
          text: shortText(vehicle.name || vehicle.brand_model || vehicle.license_plate, 'Véhicule'),
          type: 'vehicle',
          icon: Car,
          path: '/plugins/vehicle',
          time: formatRelativeTime(vehicle.updated_at || vehicle.created_at),
          timestamp: getTimestamp(vehicle.updated_at || vehicle.created_at),
          label: 'Véhicule',
          color: getToolColor('vehicle'),
        })),
        ...dataOf(drivers).map((driver: any) => ({
          id: `driver-${driver.id}`,
          text: shortText(driver.name, 'Conducteur'),
          type: 'driver',
          icon: Users,
          path: '/plugins/vehicle',
          time: formatRelativeTime(driver.updated_at || driver.created_at),
          timestamp: getTimestamp(driver.updated_at || driver.created_at),
          label: 'Conducteur',
          color: getToolColor('vehicle'),
        })),
        ...dataOf(routes).map((route: any) => ({
          id: `route-${route.id}`,
          text: shortText(route.name || `${route.start_location || 'Départ'} → ${route.end_location || 'Arrivée'}`, 'Itinéraire'),
          type: 'route',
          icon: Car,
          path: '/plugins/vehicle',
          time: formatRelativeTime(route.created_at),
          timestamp: getTimestamp(route.created_at),
          label: 'Itinéraire',
          color: getToolColor('vehicle'),
        })),
        ...dataOf(expenses).map((expense: any) => ({
          id: `expense-${expense.id}`,
          text: shortText(`${expense.title || 'Note de frais'}${expense.vendor ? ` - ${expense.vendor}` : ''}`),
          type: 'expense',
          icon: Banknote,
          path: '/plugins/expenses',
          time: formatRelativeTime(expense.updated_at || expense.created_at),
          timestamp: getTimestamp(expense.updated_at || expense.created_at),
          label: 'Note de frais',
          color: getToolColor('expenses'),
        })),
        ...dataOf(inventory).map((item: any) => ({
          id: `inventory-${item.id}`,
          text: shortText(`${item.name || 'Matériel'}${item.assigned_to ? ` - ${item.assigned_to}` : ''}`),
          type: 'inventory',
          icon: Package,
          path: '/plugins/inventory',
          time: formatRelativeTime(item.updated_at || item.created_at),
          timestamp: getTimestamp(item.updated_at || item.created_at),
          label: 'Inventaire',
          color: getToolColor('inventory'),
        })),
      ];
      return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const previewActivity = activity.slice(0, 4);

  // ── Toggle thème rapide (cycle night/sun) ──────────────────
  const quickToggleTheme = () => {
    setTheme(isDark ? 'sun' : 'night-gold');
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* ── Header ─────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1 className="text-gold" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: 0 }}>
            SWAN · HUB
          </h1>
          <p className="page-header-subtitle">
            {firstName ? `${greeting}, ${firstName}` : greeting}
            {isVip && (
              <span className="badge badge-vip" style={{ marginLeft: 'var(--space-2)' }}>
                <Crown size={10} />
                VIP
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <TutorialButton {...HOME_TUTORIAL} />
          <button
            className="btn-icon-sm btn btn-ghost"
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
          <button
            className={`btn-icon-sm btn ${isLargeText ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={toggleTextSize}
            aria-label={isLargeText ? 'Réduire le texte' : 'Grossir le texte'}
            title={isLargeText ? 'Réduire le texte' : 'Grossir le texte'}
          >
            <span className="text-size-toggle" aria-hidden="true">Aa</span>
          </button>
          <button
            className="btn-icon-sm btn btn-ghost"
            onClick={quickToggleTheme}
            aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {trialReminderVisible && (
        <section className="px-4" style={{ marginBottom: 'var(--space-4)' }}>
          <div
            className="card"
            style={{
              padding: 'var(--space-4)',
              background: trialDaysLeft && trialDaysLeft > 0 ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
              borderColor: trialDaysLeft && trialDaysLeft > 0 ? 'var(--color-warning)' : 'var(--color-danger)',
            }}
          >
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 4 }}>
              {trialDaysLeft && trialDaysLeft > 0 ? 'Votre essai se termine bientôt' : 'Votre essai Découverte est terminé'}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
              {trialDaysLeft && trialDaysLeft > 0
                ? `Il reste ${trialDaysLeft} jour${trialDaysLeft > 1 ? 's' : ''}. Choisissez les outils à conserver pour 1,20 € TTC par outil.`
                : 'Choisissez les outils à conserver pour les réactiver.'}
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/pricing')}>
              Gérer mes outils
              <ChevronRight size={14} />
            </button>
          </div>
        </section>
      )}

      {/* ── Brief SWAN ─────────────────────────── */}
      <section className="field-workspace" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="field-zone-header">
          <h2 className="field-zone-title">Votre point du jour</h2>
          <span className="field-zone-help">Aujourd'hui</span>
        </div>
        <SwanBrief
          firstName={firstName}
          loading={briefLoading}
          info={briefInfo}
          isVip={isVip}
          onActionTasks={() => navigate('/plugins/tasks')}
          onActionQuotes={() => navigate('/plugins/quotes')}
          onActionMissions={() => navigate('/plugins/missions')}
        />
      </section>

      {/* ── Plugins actifs (grille) ────────────── */}
      <section className="field-workspace" style={{ marginBottom: 'var(--space-6)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-3)',
          }}
        >
          <h2 className="field-zone-title">Mes outils</h2>
          <button
            onClick={() => navigate('/plugins')}
            className="btn btn-ghost btn-sm"
            style={{ minHeight: 'auto', padding: '4px 8px' }}
          >
            Tous
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid-3 stagger">
          {displayedPlugins.map((plugin) => {
            const Icon = ICON_MAP[plugin.icon] || FileText;
            return (
              <button
                key={plugin.id}
                onClick={() => navigate(plugin.route)}
                className="plugin-card"
                aria-label={plugin.name}
              >
                <div
                  className="plugin-icon-wrapper"
                  style={{ backgroundColor: `hsl(${plugin.color} / 0.12)` }}
                >
                  <Icon size={22} style={{ color: `hsl(${plugin.color})` }} strokeWidth={2} />
                </div>
                <span className="plugin-name">{plugin.name}</span>
              </button>
            );
          })}
          {displayedPlugins.length === 0 && (
            <button className="plugin-card" onClick={() => navigate('/pricing')}>
              <div className="plugin-icon-wrapper" style={{ background: 'var(--color-primary-glow)' }}>
                <Crown size={22} style={{ color: 'var(--color-primary)' }} />
              </div>
              <span className="plugin-name">Choisir mes outils</span>
            </button>
          )}
        </div>
      </section>

      {/* ── Activité récente ───────────────────── */}
      <section className="field-workspace">
        <div className="field-zone-header">
          <h2 className="field-zone-title">Activité récente</h2>
          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            className="btn btn-ghost btn-sm"
            style={{ minHeight: 'auto', padding: '4px 8px' }}
          >
            Voir le fil
            <ChevronRight size={14} />
          </button>
        </div>

        {activity.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <Sparkles size={24} style={{ color: 'var(--color-primary)', margin: '0 auto var(--space-3)' }} />
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)' }}>
              Prêt à démarrer
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: '4px' }}>
              Créez votre premier élément dans un outil
            </p>
          </div>
        ) : (
          <div
            className="card card-interactive"
            role="button"
            tabIndex={0}
            onClick={() => setActivityOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActivityOpen(true);
            }}
            style={{ padding: 0 }}
          >
            {previewActivity.map((item: any, i: number) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivityOpen(true);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                  background: 'transparent',
                  border: 'none',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--color-text-1)',
                  transition: 'background var(--duration-fast) var(--ease-out)',
                  minHeight: 'var(--tap-min)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <item.icon size={16} style={{ color: `hsl(${item.color})`, flexShrink: 0 }} />
                <span
                  style={{
                    flex: 1,
                    fontSize: 'var(--text-sm)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.text}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', flexShrink: 0 }}>
                  {item.time}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div
        title={`Commit ${APP_COMMIT}`}
        style={{
          textAlign: 'center',
          fontSize: 'var(--text-2xs)',
          color: 'var(--color-text-3)',
          opacity: 0.28,
          fontWeight: 600,
          letterSpacing: '0.01em',
          margin: 'var(--space-5) 0 var(--space-2)',
          userSelect: 'none',
        }}
      >
        {APP_BUILD_LABEL}
      </div>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent
          className="w-[92vw] max-w-[520px] max-h-[78dvh] overflow-hidden rounded-2xl p-4"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <DialogHeader>
            <DialogTitle>Fil d'activité</DialogTitle>
            <DialogDescription>
              Les dernières actions de tous vos outils, du plus récent au plus ancien.
            </DialogDescription>
          </DialogHeader>
          <div style={{ overflowY: 'auto', paddingRight: 4, display: 'grid', gap: 'var(--space-2)', maxHeight: 'calc(78dvh - 140px)' }}>
            {activity.length === 0 ? (
              <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                <Sparkles size={22} style={{ color: 'var(--color-primary)', margin: '0 auto var(--space-2)' }} />
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Aucune activité pour le moment</p>
              </div>
            ) : (
              activity.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivityOpen(false);
                    navigate(item.path);
                  }}
                  className="plugin-record"
                  style={{
                    '--record-color': `hsl(${item.color})`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    textAlign: 'left',
                    width: '100%',
                  } as CSSProperties}
                >
                  <div
                    className="plugin-icon-wrapper"
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      backgroundColor: `hsl(${item.color} / 0.12)`,
                    }}
                  >
                    <item.icon size={18} style={{ color: `hsl(${item.color})` }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 2 }}>
                      <span className="badge badge-info">{item.label}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontWeight: 700 }}>{item.time}</span>
                    </div>
                    <p className="plugin-record-title" style={{ fontSize: 'var(--text-base)' }}>
                      {item.text}
                    </p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FeedbackButton context="home" />
    </div>
  );
}

// ============================================================
// SWAN BRIEF — Carte résumé en haut de la home
// ============================================================
interface SwanBriefProps {
  firstName: string;
  loading: boolean;
  info: ReturnType<typeof useMemo> | any;
  isVip: boolean;
  onActionTasks: () => void;
  onActionQuotes: () => void;
  onActionMissions: () => void;
}

function SwanBrief({ firstName, loading, info, isVip, onActionTasks, onActionQuotes, onActionMissions }: SwanBriefProps) {
  if (loading) {
    return (
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div className="swan-message">
          <div className="swan-avatar">S</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="skeleton" style={{ height: '14px', width: '60%' }} />
            <div className="skeleton" style={{ height: '14px', width: '90%' }} />
            <div className="skeleton" style={{ height: '14px', width: '70%' }} />
          </div>
        </div>
      </div>
    );
  }

  const amountStr = (info?.pendingAmount || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const actionItems = [
    ...(info?.overdueTasks > 0
      ? [{
          label: `${info.overdueTasks} tâche${info.overdueTasks > 1 ? 's' : ''} en retard`,
          detail: 'À traiter en priorité pour éviter l’oubli.',
          button: 'Ouvrir les tâches',
          onClick: onActionTasks,
        }]
      : info?.todayTasks > 0
      ? [{
          label: `${info.todayTasks} tâche${info.todayTasks > 1 ? 's' : ''} prévue${info.todayTasks > 1 ? 's' : ''} aujourd’hui`,
          detail: 'À faire dans la journée.',
          button: 'Voir les tâches',
          onClick: onActionTasks,
        }]
      : []),
    ...(info?.overdueInvoices > 0
      ? [{
          label: `${info.overdueInvoices} facture${info.overdueInvoices > 1 ? 's' : ''} à relancer`,
          detail: `${amountStr} € en attente de paiement.`,
          button: 'Voir les factures',
          onClick: onActionQuotes,
        }]
      : []),
    ...(info?.activeMissions > 0
      ? [{
          label: `${info.activeMissions} mission${info.activeMissions > 1 ? 's' : ''} en cours`,
          detail: 'Gardez un oeil sur ce qui est ouvert.',
          button: 'Voir les missions',
          onClick: onActionMissions,
        }]
      : []),
  ];

  const hasActions = actionItems.length > 0;
  const hasUrgent = info?.hasUrgent ?? false;
  const intro = hasActions
    ? firstName
      ? `Voici votre point du jour, ${firstName}.`
      : 'Voici votre point du jour.'
    : isVip
    ? `Ravi de vous retrouver${firstName ? ', ' + firstName : ''}. Votre journée s'annonce calme.`
    : `Bonne journée${firstName ? ' ' + firstName : ''}. Rien d'urgent à signaler pour le moment.`;
  const voiceText = hasActions
    ? `${intro} ${actionItems.map((item) => `${item.label}. ${item.detail}`).join(' ')}`
    : `${intro} Je reste à votre disposition.`;

  return (
    <div className={`card ${hasUrgent ? 'card-glow' : ''}`} style={{ padding: 'var(--space-4)' }}>
      <div className="swan-message">
        <div className="swan-avatar" aria-label="SWAN">
          S
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-2)',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-1)' }}>
                SWAN
              </span>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-3)' }}>
                Votre brief
              </span>
            </div>
            <VoicePlayer text={voiceText} label="Écouter le brief" variant="round" />
          </div>

          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-1)',
              lineHeight: 1.6,
              marginBottom: hasActions ? 'var(--space-3)' : 0,
            }}
          >
            {intro}
          </p>

          {hasActions && (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {actionItems.map((item) => (
                  <div key={item.label} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-primary)',
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-1)' }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 2 }}>
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {actionItems.map((item) => (
                  <button key={item.button} className="btn btn-sm btn-secondary" onClick={item.onClick}>
                    {item.button}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
