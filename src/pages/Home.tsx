// ============================================================
// SWAN · HUB — Page d'Accueil
// Brief SWAN · Outils · Activité récente
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, CheckSquare, Target, Receipt, BookOpen, Car,
  Users, Wallet, Calendar, Banknote, Timer, Package, ShieldCheck,
  Sparkles, ChevronRight, Sun, Moon, Bell, Crown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { FeedbackButton } from '@/components/FeedbackButton';
import { TutorialButton } from '@/components/TutorialButton';
import { VoicePlayer } from '@/components/VoicePlayer';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVE_PLUGINS, SWAN_COPY } from '@/config/tokens';
import { HOME_TUTORIAL } from '@/config/tutorials';

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
  const { setTheme, isDark, toggleTextSize, isLargeText } = useTheme();

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
      <section className="field-workspace">
        <div className="field-zone-header">
          <h2 className="field-zone-title">Activité récente</h2>
          <span className="field-zone-help">Derniers éléments</span>
        </div>

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
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-1)' }}>
              SWAN
            </span>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-3)' }}>
              Votre brief
            </span>
          </div>

          <div style={{ marginBottom: 'var(--space-3)' }}>
            <VoicePlayer text={voiceText} label="Écouter" compact />
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
