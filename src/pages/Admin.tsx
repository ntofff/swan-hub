// ============================================================
// SWAN · HUB — Dashboard Admin
// Gestion : users, VIP, bêta, plugins, broadcasts, sécurité
// ============================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Megaphone, ShieldAlert, Gift, Search,
  Crown, Star, Ban, Plus, Send, Eye, EyeOff, TrendingUp,
  AlertTriangle, CheckCircle2, Activity, CreditCard, KeyRound,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVE_PLUGINS } from '@/config/tokens';
import { toast } from 'sonner';

type Tab = 'overview' | 'users' | 'billing' | 'broadcasts' | 'security';

export default function Admin() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  if (!isAdmin) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: 'var(--color-danger)', margin: '0 auto var(--space-3)' }} />
        <p>Accès admin requis.</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 'var(--space-8)' }}>
      <header className="page-header">
        <div>
          <h1 className="page-header-title">
            <span className="text-gold">Admin</span>
          </h1>
          <p className="page-header-subtitle">Console d'administration SWAN HUB</p>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div
        className="px-4"
        style={{
          marginBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)', minWidth: 'max-content' }}>
          <TabButton active={tab === 'overview'}   onClick={() => setTab('overview')} icon={<Activity size={16} />}  label="Vue d'ensemble" />
          <TabButton active={tab === 'users'}      onClick={() => setTab('users')}    icon={<Users size={16} />}     label="Utilisateurs" />
          <TabButton active={tab === 'billing'}    onClick={() => setTab('billing')}  icon={<CreditCard size={16} />} label="Abonnements" />
          <TabButton active={tab === 'broadcasts'} onClick={() => setTab('broadcasts')} icon={<Megaphone size={16} />} label="Messages" />
          <TabButton active={tab === 'security'}   onClick={() => setTab('security')} icon={<ShieldAlert size={16} />} label="Sécurité" />
        </div>
      </div>

      {/* ── Contenu ── */}
      {tab === 'overview'   && <AdminOverview />}
      {tab === 'users'      && <AdminUsers />}
      {tab === 'billing'    && <AdminSubscriptions />}
      {tab === 'broadcasts' && <AdminBroadcasts />}
      {tab === 'security'   && <AdminSecurity />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VUE D'ENSEMBLE
// ════════════════════════════════════════════════════════════

function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const [profiles, tasks, reports, invoices] = await Promise.all([
        supabase.from('profiles').select('plan, is_vip, is_beta, created_at'),
        supabase.from('tasks').select('id'),
        supabase.from('reports').select('id'),
        supabase.from('invoices').select('amount_ht, status'),
      ]);

      const users = profiles.data ?? [];
      const newLast30d = users.filter(
        (u: any) => Date.now() - new Date(u.created_at).getTime() < 30 * 86_400_000
      ).length;

      const paidInvoices = (invoices.data ?? []).filter((i: any) => i.status === 'Payé');
      const totalCA = paidInvoices.reduce((s, i: any) => s + (Number(i.amount_ht) || 0), 0);

      return {
        totalUsers: users.length,
        newLast30d,
        vipCount:  users.filter((u: any) => u.is_vip).length,
        betaCount: users.filter((u: any) => u.is_beta).length,
        freeCount: users.filter((u: any) => u.plan === 'free').length,
        paidCount: users.filter((u: any) => u.plan !== 'free').length,
        totalTasks: tasks.data?.length ?? 0,
        totalReports: reports.data?.length ?? 0,
        totalCA,
      };
    },
    staleTime: 60_000,
  });

  if (!stats) return <div className="px-4"><div className="skeleton" style={{ height: 200 }} /></div>;

  return (
    <div className="px-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="grid-2 stagger">
        <OverviewCard label="Utilisateurs" value={stats.totalUsers.toString()} trend={`+${stats.newLast30d} ce mois`} />
        <OverviewCard label="CA encaissé" value={`${Math.round(stats.totalCA)} €`} />
        <OverviewCard label="Comptes VIP" value={stats.vipCount.toString()} icon={<Crown size={14} />} />
        <OverviewCard label="Bêta testeurs" value={stats.betaCount.toString()} icon={<Star size={14} />} />
      </div>

      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Répartition des plans
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <PlanStat label="Gratuits" count={stats.freeCount} total={stats.totalUsers} color="var(--color-info)" />
          <PlanStat label="Payants" count={stats.paidCount} total={stats.totalUsers} color="var(--color-success)" />
        </div>
      </div>

      <div className="grid-2">
        <OverviewCard label="Tâches créées" value={stats.totalTasks.toString()} />
        <OverviewCard label="Rapports créés" value={stats.totalReports.toString()} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// UTILISATEURS
// ════════════════════════════════════════════════════════════

function AdminUsers() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'vip' | 'beta' | 'blocked'>('all');

  const { data: users = [], refetch } = useQuery({
    queryKey: ['admin_users', search, filter],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      if (filter === 'vip')  query = query.eq('is_vip', true);
      if (filter === 'beta') query = query.eq('is_beta', true);
      const { data } = await query;
      return data ?? [];
    },
  });

  const toggleVip = async (userId: string, currentVip: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_vip: !currentVip,
        vip_granted_at: !currentVip ? new Date().toISOString() : null,
      })
      .eq('user_id', userId);

    if (error) {
      toast.error('Erreur');
      return;
    }
    toast.success(currentVip ? 'Statut VIP retiré' : 'Statut VIP attribué');
    refetch();
  };

  const toggleBeta = async (userId: string, currentBeta: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_beta: !currentBeta })
      .eq('user_id', userId);

    if (error) {
      toast.error('Erreur');
      return;
    }
    toast.success(currentBeta ? 'Statut bêta retiré' : 'Statut bêta attribué');
    refetch();
  };

  return (
    <div className="px-4">
      {/* Search */}
      <div className="input-group" style={{ marginBottom: 'var(--space-3)' }}>
        <Search size={16} className="input-icon-left" />
        <input
          type="text"
          className="input input-with-icon-left"
          placeholder="Rechercher par nom ou email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
        {(['all', 'vip', 'beta'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            {f === 'all' ? 'Tous' : f === 'vip' ? 'VIP' : 'Bêta'}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {users.map((u: any) => (
          <div key={u.user_id} className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-1)' }}>
                    {u.full_name || 'Sans nom'}
                  </span>
                  {u.is_vip && <Crown size={12} style={{ color: 'var(--color-primary)' }} />}
                  {u.is_beta && <Star size={12} style={{ color: 'var(--color-info)' }} />}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 2 }}>
                  {u.email} · plan : {u.plan}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                <button
                  onClick={() => toggleVip(u.user_id, u.is_vip)}
                  className="btn btn-sm btn-ghost"
                  title={u.is_vip ? 'Retirer VIP' : 'Accorder VIP'}
                >
                  <Crown size={14} style={{ color: u.is_vip ? 'var(--color-primary)' : 'var(--color-text-3)' }} />
                </button>
                <button
                  onClick={() => toggleBeta(u.user_id, u.is_beta)}
                  className="btn btn-sm btn-ghost"
                  title={u.is_beta ? 'Retirer bêta' : 'Accorder bêta'}
                >
                  <Star size={14} style={{ color: u.is_beta ? 'var(--color-info)' : 'var(--color-text-3)' }} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-3)' }}>
            Aucun utilisateur trouvé.
          </p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ABONNEMENTS
// ════════════════════════════════════════════════════════════

function AdminSubscriptions() {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [plan, setPlan] = useState<'carte' | 'pro'>('carte');
  const [pluginIds, setPluginIds] = useState<string[]>(['report']);
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const { data: users = [], refetch } = useQuery({
    queryKey: ['admin_subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-subscriptions', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.users ?? [];
    },
  });

  const selectedUser = users.find((user: any) => user.user_id === selectedUserId);

  const togglePlugin = (pluginId: string) => {
    setPluginIds((current) => (
      current.includes(pluginId)
        ? current.filter((id) => id !== pluginId)
        : [...current, pluginId]
    ));
  };

  const grantAccess = async () => {
    if (!selectedUserId) {
      toast.error('Sélectionnez un utilisateur');
      return;
    }
    if (plan === 'carte' && pluginIds.length === 0) {
      toast.error('Sélectionnez au moins un plugin');
      return;
    }

    setBusy(true);
    const grantedPlugins = plan === 'pro' ? ACTIVE_PLUGINS.map((plugin) => plugin.id) : pluginIds;
    const { data, error } = await supabase.functions.invoke('admin-subscriptions', {
      body: {
        action: 'grant',
        userId: selectedUserId,
        plan,
        pluginIds: grantedPlugins,
        months,
        note,
      },
    });
    setBusy(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erreur abonnement');
      return;
    }

    toast.success(`Accès accordé jusqu'au ${new Date(data.until).toLocaleDateString('fr-FR')}`);
    refetch();
  };

  const resetPassword = async (userId: string) => {
    if (!confirm('Créer un mot de passe temporaire pour cet utilisateur ?')) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-subscriptions', {
      body: { action: 'reset-password', userId },
    });
    setBusy(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erreur mot de passe');
      return;
    }

    setTemporaryPassword(data.temporaryPassword);
    toast.success('Mot de passe temporaire généré');
  };

  return (
    <div className="px-4" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          Accorder un accès manuel
        </h3>

        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <label>
            <span className="field-label">Utilisateur</span>
            <select className="input" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Choisir un compte</option>
              {users.map((user: any) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.full_name || user.email || user.user_id}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <button className={`btn ${plan === 'carte' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlan('carte')}>
              À la carte
            </button>
            <button className={`btn ${plan === 'pro' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlan('pro')}>
              Pro illimité
            </button>
          </div>

          {plan === 'carte' && (
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <span className="field-label">Plugins payés</span>
              {ACTIVE_PLUGINS.map((plugin) => (
                <button
                  key={plugin.id}
                  type="button"
                  onClick={() => togglePlugin(plugin.id)}
                  className="card card-interactive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    border: `1.5px solid ${pluginIds.includes(plugin.id) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: pluginIds.includes(plugin.id) ? 'var(--color-primary-glow)' : 'var(--color-surface)',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{plugin.name}</span>
                  {pluginIds.includes(plugin.id) && <CheckCircle2 size={16} style={{ color: 'var(--color-primary)' }} />}
                </button>
              ))}
            </div>
          )}

          <label>
            <span className="field-label">Durée</span>
            <input
              className="input"
              type="number"
              min={1}
              step={1}
              value={months}
              onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>

          <label>
            <span className="field-label">Note admin</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: geste commercial, bêta..." />
          </label>

          <button className="btn btn-primary btn-full" disabled={busy || !selectedUserId} onClick={grantAccess}>
            <CreditCard size={16} />
            Accorder l'accès
          </button>

          {selectedUser && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', lineHeight: 1.5 }}>
              Compte sélectionné : {selectedUser.email || selectedUser.full_name || selectedUser.user_id}
            </p>
          )}
        </div>
      </div>

      {temporaryPassword && (
        <div className="card" style={{ padding: 'var(--space-4)', borderColor: 'var(--color-warning)', background: 'var(--color-warning-bg)' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 6 }}>Mot de passe temporaire</p>
          <code style={{ fontSize: 'var(--text-sm)', wordBreak: 'break-all' }}>{temporaryPassword}</code>
        </div>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {users.map((user: any) => (
          <div key={user.user_id} className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800 }}>
                  {user.full_name || 'Sans nom'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 2 }}>
                  {user.email || user.user_id}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', marginTop: 6, lineHeight: 1.45 }}>
                  Plan : {user.plan} · statut : {user.subscription_status || 'essai/local'}
                  {user.subscription_current_period_end && ` · fin : ${new Date(user.subscription_current_period_end).toLocaleDateString('fr-FR')}`}
                  {user.manual_access_until && ` · manuel : ${new Date(user.manual_access_until).toLocaleDateString('fr-FR')}`}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 4 }}>
                  Essai : {(user.trial_plugin_ids || []).join(', ') || '-'} · Payés : {(user.paid_plugin_ids || []).join(', ') || '-'}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => resetPassword(user.user_id)}>
                <KeyRound size={14} />
                Reset MDP
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BROADCASTS
// ════════════════════════════════════════════════════════════

function AdminBroadcasts() {
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [category, setCategory] = useState<'news' | 'promo' | 'maintenance' | 'seasonal'>('news');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title || !body) {
      toast.error('Titre et message requis');
      return;
    }
    setSending(true);
    const { error } = await supabase.from('broadcasts').insert({
      title,
      body,
      category,
      channels: ['in_app'],
      target_type: 'all',
      sent_at: new Date().toISOString(),
    });
    setSending(false);

    if (error) {
      toast.error('Erreur d\'envoi : ' + error.message);
      return;
    }
    toast.success('Message envoyé à tous les utilisateurs');
    setTitle('');
    setBody('');
  };

  return (
    <div className="px-4">
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Composer un message
        </h3>

        <div style={{ marginBottom: 'var(--space-3)' }}>
          <label className="text-label" style={{ display: 'block', marginBottom: 6 }}>Catégorie</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as any)}>
            <option value="news">Nouveauté</option>
            <option value="promo">Promotion</option>
            <option value="maintenance">Maintenance</option>
            <option value="seasonal">Saisonnier</option>
          </select>
        </div>

        <div style={{ marginBottom: 'var(--space-3)' }}>
          <label className="text-label" style={{ display: 'block', marginBottom: 6 }}>Titre</label>
          <input
            className="input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Nouvel outil Contacts disponible"
          />
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label className="text-label" style={{ display: 'block', marginBottom: 6 }}>Message</label>
          <textarea
            className="input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contenu du message..."
            rows={5}
          />
        </div>

        <button onClick={send} disabled={sending} className="btn btn-primary btn-full">
          {sending ? 'Envoi...' : <><Send size={16} /> Envoyer à tous</>}
        </button>
      </div>

      <div
        className="card"
        style={{
          padding: 'var(--space-3)',
          background: 'var(--color-warning-bg)',
          borderColor: 'var(--color-warning)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Maximum 1 broadcast par semaine recommandé pour ne pas spammer les utilisateurs.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SÉCURITÉ
// ════════════════════════════════════════════════════════════

function AdminSecurity() {
  const { data: events = [] } = useQuery({
    queryKey: ['admin_security_events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const critical = events.filter((e: any) => e.severity === 'critical').length;
  const warning  = events.filter((e: any) => e.severity === 'warning').length;

  return (
    <div className="px-4">
      <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
        <OverviewCard label="Alertes critiques" value={critical.toString()} icon={<AlertTriangle size={14} />} />
        <OverviewCard label="Avertissements" value={warning.toString()} icon={<ShieldAlert size={14} />} />
      </div>

      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
        Événements récents
      </h3>

      {events.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <CheckCircle2 size={24} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-2)' }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)' }}>
            Aucun événement récent. Tout est sous contrôle.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {events.map((e: any) => (
            <div
              key={e.id}
              className="card"
              style={{
                padding: 'var(--space-3)',
                borderLeft: `3px solid ${
                  e.severity === 'critical' ? 'var(--color-danger)' :
                  e.severity === 'warning'  ? 'var(--color-warning)' :
                  'var(--color-info)'
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{e.event_type}</span>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-3)' }}>
                  {new Date(e.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>
                {JSON.stringify(e.details || {}).slice(0, 80)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMPOSANTS
// ════════════════════════════════════════════════════════════

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        border: 'none',
        background: 'none',
        color: active ? 'var(--color-primary)' : 'var(--color-text-2)',
        fontSize: 'var(--text-sm)',
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
        transition: 'all var(--duration-fast)',
        whiteSpace: 'nowrap',
        minHeight: 'var(--tap-min)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function OverviewCard({ label, value, trend, icon }: { label: string; value: string; trend?: string; icon?: React.ReactNode }) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {icon && <span style={{ color: 'var(--color-primary)' }}>{icon}</span>}
        <div className="kpi-label" style={{ margin: 0 }}>{label}</div>
      </div>
      <div className="kpi-value">{value}</div>
      {trend && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 500 }}>
          <TrendingUp size={10} style={{ display: 'inline', marginRight: 2 }} />
          {trend}
        </div>
      )}
    </div>
  );
}

function PlanStat({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)' }}>{label}</span>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{count} ({percent}%)</span>
      </div>
      <div
        style={{
          height: 6,
          background: 'var(--color-surface-2)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', width: `${percent}%`, background: color, transition: 'width var(--duration-normal)' }} />
      </div>
    </div>
  );
}
