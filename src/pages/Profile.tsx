import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { User, Shield, Eye, Download, Trash2, CreditCard, Palette, ChevronRight } from "lucide-react";

const profileSections = [
  { label: "Paramètres de sécurité", icon: Shield, desc: "Mot de passe, 2FA" },
  { label: "Paramètres de confidentialité", icon: Eye, desc: "Données, cookies, RGPD" },
  { label: "Thème", icon: Palette, desc: "Dark Night" },
  { label: "Changer de plan", icon: CreditCard, desc: "Gratuit → Pro" },
  { label: "Exporter mes données", icon: Download, desc: "Télécharger toutes les données" },
  { label: "Supprimer le compte", icon: Trash2, desc: "Suppression permanente", danger: true },
];

const ProfilePage = () => (
  <div className="fade-in">
    <PageHeader title="Profil" />
    <div className="px-4 md:px-0">
      <div className="glass-card-glow p-5 flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
          <User size={24} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold font-heading">Alex Martin</div>
          <div className="text-xs text-muted-foreground">alex@example.com</div>
          <div className="text-[10px] text-muted-foreground mt-1">ID : USR-2024-0042</div>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">Gratuit</span>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mb-2 font-heading uppercase tracking-wider">Plugins actifs</h2>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {["Outil Rapport", "Journal", "Tâches", "Missions", "Devis", "Véhicule"].map(p => (
          <span key={p} className="text-[10px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{p}</span>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mb-2 font-heading uppercase tracking-wider">Activités</h2>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {[
          { name: "Consulting", color: "38 50% 58%" },
          { name: "Photographie", color: "270 50% 60%" },
          { name: "Transport", color: "142 71% 45%" },
        ].map(a => (
          <span key={a.name} className="text-[10px] px-2.5 py-1 rounded-full border" style={{ borderColor: `hsl(${a.color} / 0.4)`, color: `hsl(${a.color})` }}>{a.name}</span>
        ))}
      </div>

      <div className="glass-card divide-y divide-border">
        {profileSections.map(s => (
          <button key={s.label} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 ${s.danger ? 'text-destructive' : ''}`}>
            <s.icon size={18} className={s.danger ? 'text-destructive' : 'text-muted-foreground'} />
            <div className="flex-1">
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-[10px] text-muted-foreground">{s.desc}</div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>

    <div className="px-4 md:px-0 mt-8 mb-8 flex flex-wrap gap-4 justify-center">
      {["Politique de confidentialité", "Conditions d'utilisation", "Préférences cookies", "Droits RGPD"].map(l => (
        <button key={l} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">{l}</button>
      ))}
    </div>
    <FeedbackButton context="profile" />
  </div>
);

export default ProfilePage;
