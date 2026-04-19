// ============================================================
// SWAN · HUB — App Layout
// Bottom nav mobile + Sidebar desktop + Outlet pour les pages
// ============================================================

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, BarChart3, User, Shield, FileText, CheckSquare, Receipt } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

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
              letterSpacing: '-0.03em',
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
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon size={18} strokeWidth={2} />
              <span>{item.label}</span>
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
        {items.map((item) => (
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
      </nav>
    </div>
  );
}
