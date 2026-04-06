import { PageHeader } from "@/components/layout/PageHeader";
import { Users, CreditCard, Puzzle, MessageSquare, BarChart3, Shield, Settings, ChevronRight } from "lucide-react";

const stats = [
  { label: "Utilisateurs", value: "1 247", change: "+12%" },
  { label: "Actifs aujourd'hui", value: "342", change: "+5%" },
  { label: "MRR", value: "8 420 €", change: "+18%" },
  { label: "Retours", value: "89", change: "+7" },
];

const recentSignups = [
  { name: "Julie Moreau", email: "julie@example.com", id: "USR-2024-1247", plan: "Pro", date: "Il y a 2 min" },
  { name: "Thomas Bernard", email: "thomas@example.com", id: "USR-2024-1246", plan: "Gratuit", date: "Il y a 1h" },
  { name: "Clara Petit", email: "clara@example.com", id: "USR-2024-1245", plan: "Gratuit", date: "Il y a 3h" },
];

const pluginStats = [
  { name: "Tâches", activations: 1089, usage: "Élevé" },
  { name: "Outil Rapport", activations: 945, usage: "Élevé" },
  { name: "Carnet véhicule", activations: 723, usage: "Moyen" },
  { name: "Missions", activations: 612, usage: "Moyen" },
  { name: "Devis & Factures", activations: 534, usage: "Moyen" },
  { name: "Journal de bord", activations: 478, usage: "Faible" },
];

const recentFeedback = [
  { user: "USR-2024-0891", plugin: "Véhicule", type: "Suggestion", text: "Ajouter l'intégration GPS pour les itinéraires auto", time: "Il y a 30 min" },
  { user: "USR-2024-0342", plugin: "Tâches", type: "Bug", text: "Le filtre priorité ne se sauvegarde pas", time: "Il y a 2h" },
  { user: "USR-2024-1102", plugin: "Devis", type: "Prob. UX", text: "Bouton convertir en facture difficile à trouver", time: "Il y a 5h" },
];

const usageLabelColors: Record<string, string> = {
  "Élevé": "bg-success/10 text-success",
  "Moyen": "bg-warning/10 text-warning",
  "Faible": "bg-secondary text-muted-foreground",
};

const AdminPage = () => (
  <div className="fade-in max-w-5xl mx-auto">
    <div className="flex items-center justify-between px-4 pt-6 pb-4">
      <div>
        <h1 className="text-xl font-bold font-heading flex items-center gap-2">
          <Shield size={20} className="text-primary" /> Console Admin
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Administration du Hub SWAN</p>
      </div>
      <button className="p-2 rounded-xl bg-secondary text-muted-foreground"><Settings size={18} /></button>
    </div>
    <div className="px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className="text-xl font-bold font-heading mt-1">{s.value}</div>
            <div className="text-[10px] text-primary mt-1">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users size={14} /> Inscriptions récentes</h2>
          <div className="glass-card divide-y divide-border">
            {recentSignups.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground">{u.email} · {u.id}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.plan === 'Pro' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{u.plan}</span>
                <span className="text-[10px] text-muted-foreground">{u.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Puzzle size={14} /> Analytique plugins</h2>
          <div className="glass-card divide-y divide-border">
            {pluginStats.map(p => (
              <div key={p.name} className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm flex-1">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.activations}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${usageLabelColors[p.usage]}`}>{p.usage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><MessageSquare size={14} /> Retours récents</h2>
          <div className="glass-card divide-y divide-border">
            {recentFeedback.map((f, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-muted-foreground">{f.user}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{f.plugin}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${f.type === 'Bug' ? 'bg-destructive/10 text-destructive' : f.type === 'Suggestion' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>{f.type}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{f.time}</span>
                </div>
                <p className="text-sm">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 mb-8">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions admin</h2>
        <div className="glass-card divide-y divide-border">
          {["Gérer les utilisateurs", "Paiements & Abonnements", "Promotions & Réductions", "Gestionnaire de thèmes", "Journaux d'audit", "Accorder accès plugin"].map(a => (
            <button key={a} className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-left hover:bg-secondary/50 transition-colors">
              {a} <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default AdminPage;
