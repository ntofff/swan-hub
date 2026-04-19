// ============================================================
// SWAN · HUB — Page d'Accueil
// Brief SWAN · Plugins rapides · KPIs du jour · Activité récente
// ============================================================

import { useState, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, CheckSquare, Target, Receipt, BookOpen, Car,
  Users, Wallet, Calendar, Banknote, Timer, Package, ShieldCheck,
  Sparkles, ChevronRight, Sun, Moon, Bell, Crown, Plus, Route,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVE_PLUGINS, SWAN_COPY } from '@/config/tokens';

// ── Map des icônes (Lucide) ───────────────────────────────────
const ICON_MAP: Record<string, any> = {
  FileText, CheckSquare, Target, Receipt, BookOpen, Car,
  Users, Wallet, Calendar, Banknote, Timer, Package, ShieldCheck,
};

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

// ── Composant principal ───────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const greeting = getGreeting();
  const isVip = profile?.is_vip ?? false;

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
      const [reports, tasks] = await Promise.all([
        supabase
          .from('reports')
          .select('id, title, created_at')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('tasks')
          .select('id, text, done, updated_at')
          .order('updated_at', { ascending: false })
          .limit(3),
      ]);
      const items = [
        ...(reports.data ?? []).map((r: any) => ({
          id: `r-${r.id}`,
          text: r.title,
          type: 'report',
          icon: FileText,
          path: '/plugins/report',
          time: formatRelativeTime(r.created_at),
        })),
        ...(tasks.data ?? []).map((t: any) => ({
          id: `t-${t.id}`,
          text: t.text.slice(0, 50),
          type: 'task',
          icon: CheckSquare,
          path: '/plugins/tasks',
          time: formatRelativeTime(t.updated_at),
          done: t.done,
        })),
      ];
      return items.slice(0, 6);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // ── Toggle thème rapide (cycle night/sun) ──────────────────
  const quickToggleTheme = () => {
    setTheme(isDark ? 'sun' : 'night-gold');
  };

  const quickActions = [
    { label: 'Rapport', desc: 'Terrain + photos', icon: FileText, path: '/plugins/report', color: '38 50% 58%' },
    { label: 'Tâche', desc: 'À faire maintenant', icon: CheckSquare, path: '/plugins/tasks?new=1', color: '142 71% 45%' },
    { label: 'Devis', desc: 'Client + montant', icon: Receipt, path: '/plugins/quotes?tab=devis&new=1', color: '270 50% 60%' },
    { label: 'Trajet', desc: 'Km + IK', icon: Route, path: '/plugins/vehicle?tab=trips&new=1', color: '38 92% 50%' },
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* ── Header ─────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1 className="text-gold" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.03em' }}>
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
          <button
            className="btn-icon-sm btn btn-ghost"
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
          >
            <Bell size={18} />
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

      {/* ── Brief SWAN ─────────────────────────── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <SwanBrief
          firstName={firstName}
          loading={briefLoading}
          info={briefInfo}
          isVip={isVip}
          onActionTasks={() => navigate('/plugins/tasks')}
          onActionQuotes={() => navigate('/plugins/quotes')}
        />
      </section>

      {/* ── Actions rapides terrain ───────────── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-3)',
          }}
        >
          <h2 className="text-label">Actions rapides</h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
            3 touches max
          </span>
        </div>

        <div className="field-responsive-grid">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="plugin-record flex items-center gap-3 text-left"
              style={{ '--record-color': `hsl(${action.color})` } as CSSProperties}
            >
              <div
                className="plugin-icon-wrapper"
                style={{ backgroundColor: `hsl(${action.color} / 0.12)` }}
              >
                <action.icon size={22} style={{ color: `hsl(${action.color})` }} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="plugin-record-title flex items-center gap-2">
                  <Plus size={15} />
                  {action.label}
                </div>
                <div className="plugin-record-meta mt-1">{action.desc}</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </section>

      {/* ── Plugins actifs (grille) ────────────── */}
      <section className="px-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-3)',
          }}
        >
          <h2 className="text-label">Mes outils</h2>
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
          {ACTIVE_PLUGINS.slice(0, 6).map((plugin) => {
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
        </div>
      </section>

      {/* ── Activité récente ───────────────────── */}
      <section className="px-4">
        <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
          Activité récente
        </h2>

        {activity.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <Sparkles size={24} style={{ color: 'var(--color-primary)', margin: '0 auto var(--space-3)' }} />
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)' }}>
              Prêt à démarrer
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: '4px' }}>
              Créez votre premier rapport ou votre première tâche
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {activity.map((item: any, i: number) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
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
                <item.icon size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
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
}

function SwanBrief({ firstName, loading, info, isVip, onActionTasks, onActionQuotes }: SwanBriefProps) {
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

  // Construction du message contextuel
  const getMessage = (): string => {
    if (!info || (info.overdueTasks === 0 && info.overdueInvoices === 0 && info.todayTasks === 0 && info.activeMissions === 0)) {
      return isVip
        ? `Ravi de vous retrouver${firstName ? ', ' + firstName : ''}. Votre journée s'annonce calme. Profitez-en pour avancer sur un sujet de fond ou prendre un café.`
        : `Bonne journée${firstName ? ' ' + firstName : ''}. Rien d'urgent à signaler pour le moment. Je reste à votre disposition.`;
    }

    const parts: string[] = [];

    if (info.overdueTasks > 0) {
      parts.push(
        `Vous avez ${info.overdueTasks} tâche${info.overdueTasks > 1 ? 's' : ''} en retard`
      );
    } else if (info.todayTasks > 0) {
      parts.push(
        `${info.todayTasks} tâche${info.todayTasks > 1 ? 's' : ''} à traiter aujourd'hui`
      );
    }

    if (info.overdueInvoices > 0) {
      const amountStr = info.pendingAmount.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      parts.push(
        `${info.overdueInvoices} facture${info.overdueInvoices > 1 ? 's' : ''} en attente de paiement (${amountStr} €)`
      );
    }

    if (info.activeMissions > 0 && parts.length < 2) {
      parts.push(`${info.activeMissions} mission${info.activeMissions > 1 ? 's' : ''} en cours`);
    }

    const intro = isVip && firstName
      ? `Bonjour ${firstName}. `
      : firstName
      ? `Voici votre point du jour. `
      : `Voici votre point du jour. `;

    return intro + parts.join(', ') + '.';
  };

  const hasUrgent = info?.hasUrgent ?? false;

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
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-1)' }}>
              SWAN
            </span>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-3)' }}>
              Votre brief
            </span>
          </div>

          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-1)',
              lineHeight: 1.6,
              marginBottom: info?.hasUrgent ? 'var(--space-3)' : 0,
            }}
          >
            {getMessage()}
          </p>

          {/* Actions rapides si urgence */}
          {hasUrgent && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {info.overdueTasks > 0 && (
                <button className="btn btn-sm btn-secondary" onClick={onActionTasks}>
                  Voir les tâches
                  <ChevronRight size={14} />
                </button>
              )}
              {info.overdueInvoices > 0 && (
                <button className="btn btn-sm btn-secondary" onClick={onActionQuotes}>
                  Voir les factures
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
