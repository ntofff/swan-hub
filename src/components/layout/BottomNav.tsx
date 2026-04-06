import { NavLink } from "react-router-dom";
import { Home, Puzzle, User, Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const navItems = [
  { to: "/", icon: Home, labelKey: "nav.home" },
  { to: "/plugins", icon: Puzzle, labelKey: "nav.plugins" },
  { to: "/profile", icon: User, labelKey: "nav.profile" },
  { to: "/about", icon: Info, labelKey: "nav.about" },
];

export const BottomNav = () => {
  const { t } = useLanguage();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border md:hidden">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
            <Icon size={20} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">{t(labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export const DesktopNav = () => {
  const { t } = useLanguage();
  return (
    <nav className="hidden md:flex items-center gap-1 bg-card/80 backdrop-blur-lg border border-border rounded-full px-2 py-1.5">
      {navItems.map(({ to, icon: Icon, labelKey }) => (
        <NavLink key={to} to={to} end={to === "/"}
          className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <Icon size={16} strokeWidth={1.8} />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
};
