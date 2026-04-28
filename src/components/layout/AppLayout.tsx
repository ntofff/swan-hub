// ============================================================
// SWAN · HUB — App Layout
// Bottom nav mobile + Sidebar desktop + Outlet pour les pages
// ============================================================

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, BarChart3, User, Shield, FileText, CheckSquare, Receipt, Coffee, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// ── Items de navigation ───────────────────────────────────────
interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/',          label: 'Accueil',    icon: Home },
  { path: '/plugins',   label: 'Outils',     icon: LayoutGrid },
  { path: '/dashboard', label: 'Tableau',    icon: BarChart3 },
  { path: '/profile',   label: 'Profil',     icon: User },
];

const ADMIN_ITEM: NavItem = {
  path: '/admin', label: 'Admin', icon: Shield, adminOnly: true,
};

const PRICING_ITEM: NavItem = {
  path: '/pricing', label: 'Tarifs', icon: Coffee,
};

const QUICK_CREATE_ITEMS = [
  { path: '/plugins/report', label: 'Rapport', icon: FileText },
  { path: '/plugins/tasks?new=1', label: 'Tâche', icon: CheckSquare },
  { path: '/plugins/quotes?tab=devis&new=1', label: 'Devis', icon: Receipt },
];

// ── Composant ─────────────────────────────────────────────────
export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: feedbackCount = 0 } = useQuery({
    queryKey: ['feedback_notifications_count'],
    enabled: isAdmin,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('feedback')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      if (error) throw error;
      return count || 0;
    },
  });

  const NOTIFICATION_ITEM: NavItem = { path: '/notifications', label: 'Retours', icon: Bell, adminOnly: true };
  const sidebarItems = isAdmin ? [...NAV_ITEMS, PRICING_ITEM, NOTIFICATION_ITEM, ADMIN_ITEM] : [...NAV_ITEMS, PRICING_ITEM];
  const bottomItems = NAV_ITEMS;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-container">
      {/* ── Sidebar Desktop ─────────────────────── */}
      <aside className="sidebar">
        <div style={{ padding: '0 var(--space-4) var(--space-8)' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 800,
              letterSpacing: 0,
            }}
            className="text-gold"
          >
            SWAN · HUB
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-3)',
              marginTop: '2px',
              letterSpacing: '0.02em',
            }}
          >
            L'assistant numérique simplifié
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {sidebarItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon size={18} strokeWidth={2} />
              <span>{item.label}</span>
              {item.path === '/notifications' && feedbackCount > 0 && (
                <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5">
                  {feedbackCount > 99 ? '99+' : feedbackCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-quick-create">
          <div className="sidebar-quick-label">Créer vite</div>
          {QUICK_CREATE_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="sidebar-quick-item"
            >
              <item.icon size={16} strokeWidth={2.2} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: 'var(--space-4)' }}>
          <div
            style={{
              fontSize: 'var(--text-2xs)',
              color: 'var(--color-text-3)',
              textAlign: 'center',
              letterSpacing: '0.05em',
            }}
          >
            v1.0.0 · sécurisé 🇫🇷
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────── */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ── Bottom Nav Mobile ───────────────────── */}
      <nav className="bottom-nav" role="navigation" aria-label="Navigation principale">
        {bottomItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
            aria-label={item.label}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            <item.icon size={20} strokeWidth={2} />
            <span>{item.label}</span>
            <span className="nav-dot" aria-hidden="true" />
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => navigate('/notifications')}
            className={`bottom-nav-item ${isActive('/notifications') ? 'active' : ''}`}
            aria-label="Retours"
            aria-current={isActive('/notifications') ? 'page' : undefined}
          >
            <span className="relative">
              <Bell size={20} strokeWidth={2} />
              {feedbackCount > 0 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1">
                  {feedbackCount > 9 ? '9+' : feedbackCount}
                </span>
              )}
            </span>
            <span>Retours</span>
            <span className="nav-dot" aria-hidden="true" />
          </button>
        )}
      </nav>
    </div>
  );
}
