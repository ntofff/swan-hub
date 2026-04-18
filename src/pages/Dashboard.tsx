// ============================================================
// SWAN · HUB — Dashboard
// KPIs plugin-extensibles + Brief SWAN + Graphiques évolution
// ============================================================

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVE_PLUGINS } from '@/config/tokens';
import { VoicePlayer } from '@/components/VoicePlayer';

type Period = 'day' | 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  day:   "Aujourd'hui",
  week:  'Cette semaine',
  month: 'Ce mois',
  year:  'Cette année',
};

// ────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile, hasAccessToPlugin } = useAuth();
  const [period, setPeriod] = useState<Period>('month');

  // Plugins accessibles par l'utilisateur
  const accessiblePlugins = useMemo(
    () => ACTIVE_PLUGINS.filter((p) => hasAccessToPlugin(p.id)),
    [hasAccessToPlugin]
  );

  // ── Requête globale des KPIs ────────────────────────────
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ['dashboard_kpis', period],
    queryFn: async () => {
      const periodStart = getPeriodStart(period);
      const periodStartISO = periodStart.toISOString();

      const [tasks, reports, missions, quotes, invoices, trips, logbook] = await Promise.all([
        supabase.from('tasks').select('done, archived, updated_at, deadline, created_at'),
        supabase.from('reports').select('created_at'),
        supabase.from('missions').select('status, quote_amount, created_at, end_date'),
        supabase.from('quotes').select('amount_ht, tva_rate, status, created_at'),
        supabase.from('invoices').select('amount_ht, tva_rate, status, issue_date, payment_terms, created_at'),
        supabase.from('trips').select('distance, date, created_at'),
        supabase.from('logbook').select('created_at'),
      ]);

      return {
        tasks:    tasks.data ?? [],
        reports:  reports.data ?? [],
        missions: missions.data ?? [],
        quotes:   quotes.data ?? [],
        invoices: invoices.data ?? [],
        trips:    trips.data ?? [],
        logbook:  logbook.data ?? [],
        periodStart,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // ── Calcul des KPIs calculés ────────────────────────────
  const kpis = useMemo(() => {
    if (!kpiData) return null;

    const now = Date.now();
    const startMs = kpiData.periodStart.getTime();

    // Tâches
    const tasksInPeriod = kpiData.tasks.filter(
      (t: any) => new Date(t.updated_at).getTime() >= startMs
    );
    const tasksDone    = tasksInPeriod.filter((t: any) => t.done && !t.archived).length;
    const tasksPending = kpiData.tasks.filter((t: any) => !t.done && !t.archived).length;
    const tasksOverdue = kpiData.tasks.filter(
      (t: any) => !t.done && !t.archived && t.deadline && new Date(t.deadline).getTime() < now
    ).length;
    const completionRate = tasksInPeriod.length
      ? Math.round((tasksDone / tasksInPeriod.length) * 100)
      : 0;

    // Factures encaissées (Payé) dans la période
    const paidInPeriod = kpiData.invoices.filter(
      (i: any) => i.status === 'Payé' && new Date(i.issue_date).getTime() >= startMs
    );
    const caPeriod = paidInPeriod.reduce(
      (sum: number, i: any) => sum + (Number(i.amount_ht) || 0),
      0
    );

    // Factures en attente de paiement
    const pendingInvoices = kpiData.invoices.filter(
      (i: any) => ['Envoyé', 'En retard'].includes(i.status)
    );
    const pendingAmount = pendingInvoices.reduce(
      (sum: number, i: any) => sum + (Number(i.amount_ht) || 0),
      0
    );

    // Missions
    const activeMissions = kpiData.missions.filter((m: any) => m.status === 'Actif').length;
    const missionsDoneInPeriod = kpiData.missions.filter(
      (m: any) => m.status === 'Terminé' && new Date(m.created_at).getTime() >= startMs
    ).length;
    const missionsOverdue = kpiData.missions.filter(
      (m: any) => m.status === 'Actif' && m.end_date && new Date(m.end_date).getTime() < now
    ).length;

    // Rapports dans la période
    const reportsInPeriod = kpiData.reports.filter(
      (r: any) => new Date(r.created_at).getTime() >= startMs
    ).length;

    // Véhicule
    const kmInPeriod = kpiData.trips
      .filter((t: any) => new Date(t.date).getTime() >= startMs)
      .reduce((sum: number, t: any) => sum + (Number(t.distance) || 0), 0);

    // Journal
    const logbookInPeriod = kpiData.logbook.filter(
      (l: any) => new Date(l.created_at).getTime() >= startMs
    ).length;

    return {
      // Business critiques
      caPeriod,
      pendingAmount,
      pendingCount: pendingInvoices.length,

      // Productivité
      tasksDone,
      tasksPending,
      tasksOverdue,
      completionRate,

      // Missions
      activeMissions,
      missionsDoneInPeriod,
      missionsOverdue,

      // Activité
      reportsInPeriod,
      kmInPeriod,
      logbookInPeriod,
    };
  }, [kpiData]);

  // ── Construction du résumé SWAN pour lecture vocale ─────
  const swanSummary = useMemo(() => {
    if (!kpis) return '';
    const parts: string[] = [];
    const firstName = profile?.full_name?.split(' ')[0];

    parts.push(firstName ? `Bonjour ${firstName}, voici votre tableau de bord pour ${PERIOD_LABELS[period].toLowerCase()}.` : `Voici votre tableau de bord.`);

    if (kpis.caPeriod > 0) {
      parts.push(`Votre chiffre d'affaires encaissé s'élève à ${Math.round(kpis.caPeriod)} euros hors taxes.`);
    }
    if (kpis.pendingAmount > 0) {
      parts.push(`${kpis.pendingCount} facture${kpis.pendingCount > 1 ? 's' : ''} sont en attente de paiement pour un montant de ${Math.round(kpis.pendingAmount)} euros.`);
    }
    if (kpis.tasksOverdue > 0) {
      parts.push(`Attention, ${kpis.tasksOverdue} tâche${kpis.tasksOverdue > 1 ? 's sont' : ' est'} en retard.`);
    }
    if (kpis.activeMissions > 0) {
      parts.push(`${kpis.activeMissions} mission${kpis.activeMissions > 1 ? 's sont actives' : ' est active'}.`);
    }
    if (parts.length === 1) {
      parts.push(`Rien d'urgent à signaler pour le moment.`);
    }
    return parts.join(' ');
  }, [kpis, period, profile]);

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* ── Header ─────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1 className="page-header-title">Tableau de bord</h1>
          <p className="page-header-subtitle">Votre activité en un coup d'œil</p>
        </div>
      </header>

      {/* ── Sélecteur de période ──────────────── */}
      <div className="px-4" style={{ marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-1)',
            padding: 4,
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1,
                minWidth: 'max-content',
                minHeight: 'var(--tap-min)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                background: period === p ? 'var(--color-primary)' : 'transparent',
                color: period === p ? 'var(--color-primary-text)' : 'var(--color-text-2)',
                border: 'none',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--duration-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Résumé SWAN avec lecture vocale ────── */}
      {kpis && swanSummary && (
        <div className="px-4" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card card-glow" style={{ padding: 'var(--space-4)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary)' }}>
                  Résumé SWAN
                </span>
              </div>
              <VoicePlayer text={swanSummary} label="Écouter" compact />
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)', lineHeight: 1.6 }}>
              {swanSummary}
            </p>
          </div>
        </div>
      )}

      {/* ── KPIs CRITIQUES (grands) ────────────── */}
      {isLoading ? (
        <KpiSkeleton />
      ) : kpis ? (
        <div className="px-4 stagger" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
            Vue d'ensemble
          </h2>
          <div className="grid-2">
            <KpiCard
              label="CA encaissé"
              value={formatAmount(kpis.caPeriod)}
              unit="€ HT"
              size="large"
              accent
            />
            <KpiCard
              label="En attente"
              value={formatAmount(kpis.pendingAmount)}
              unit="€ HT"
              size="large"
              subtitle={`${kpis.pendingCount} facture${kpis.pendingCount > 1 ? 's' : ''}`}
              tone={kpis.pendingAmount > 0 ? 'warning' : 'neutral'}
            />
          </div>
        </div>
      ) : null}

      {/* ── KPIs Productivité ──────────────────── */}
      {kpis && (
        <div className="px-4 stagger" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
            Productivité
          </h2>
          <div className="grid-2">
            <KpiCard label="Tâches complétées" value={kpis.tasksDone.toString()} unit="" />
            <KpiCard
              label="Tâches en retard"
              value={kpis.tasksOverdue.toString()}
              unit=""
              tone={kpis.tasksOverdue > 0 ? 'danger' : 'neutral'}
            />
            <KpiCard label="Missions actives" value={kpis.activeMissions.toString()} unit="" />
            <KpiCard label="Taux complétion" value={kpis.completionRate.toString()} unit="%" />
          </div>
        </div>
      )}

      {/* ── KPIs Activité ──────────────────────── */}
      {kpis && (
        <div className="px-4 stagger" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="text-label" style={{ marginBottom: 'var(--space-3)' }}>
            Activité
          </h2>
          <div className="grid-2">
            <KpiCard label="Rapports créés" value={kpis.reportsInPeriod.toString()} unit="" />
            <KpiCard label="Km parcourus" value={Math.round(kpis.kmInPeriod).toString()} unit="km" />
            <KpiCard label="Entrées journal" value={kpis.logbookInPeriod.toString()} unit="" />
            <KpiCard label="Missions terminées" value={kpis.missionsDoneInPeriod.toString()} unit="" />
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════

interface KpiCardProps {
  label: string;
  value: string;
  unit: string;
  subtitle?: string;
  size?: 'normal' | 'large';
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  accent?: boolean;
}

function KpiCard({ label, value, unit, subtitle, size = 'normal', tone = 'neutral', accent }: KpiCardProps) {
  const toneColor = {
    neutral: 'var(--color-text-1)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger:  'var(--color-danger)',
  }[tone];

  return (
    <div
      className="kpi-card"
      style={{
        background: accent ? 'linear-gradient(145deg, rgba(201,169,97,0.08), var(--color-surface))' : undefined,
        borderColor: accent ? 'rgba(201,169,97,0.3)' : undefined,
      }}
    >
      <div className="kpi-label">{label}</div>
      <div
        className={`kpi-value ${size === 'large' ? 'kpi-value-lg' : ''}`}
        style={{ color: toneColor }}
      >
        {value}
        {unit && <span style={{ fontSize: '60%', color: 'var(--color-text-3)', marginLeft: 4 }}>{unit}</span>}
      </div>
      {subtitle && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>{subtitle}</div>
      )}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="px-4">
      <div className="grid-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card">
            <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 28, width: '80%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function getPeriodStart(period: Period): Date {
  const now = new Date();
  const d = new Date(now);
  switch (period) {
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
    case 'week':
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      break;
    case 'month':
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case 'year':
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
  }
  return d;
}

function formatAmount(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}
