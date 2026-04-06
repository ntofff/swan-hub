import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export const AppLayout = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/hub-admin-console");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={`pb-20 md:pb-6 ${isAdmin ? '' : 'max-w-lg mx-auto md:max-w-4xl'}`}>
        <Outlet />
      </main>
      {!isAdmin && <BottomNav />}
    </div>
  );
};
