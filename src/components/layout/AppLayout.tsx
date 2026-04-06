import { Outlet, useLocation } from "react-router-dom";
import { BottomNav, DesktopNav } from "./BottomNav";

export const AppLayout = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/hub-admin-console");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop/Tablet top nav */}
      {!isAdmin && (
        <header className="hidden md:flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <span className="text-lg font-bold font-heading text-gradient-gold">SWAN</span>
          <DesktopNav />
        </header>
      )}
      <main className={`pb-20 md:pb-6 ${isAdmin ? '' : 'max-w-lg mx-auto md:max-w-4xl'}`}>
        <Outlet />
      </main>
      {!isAdmin && <BottomNav />}
    </div>
  );
};
