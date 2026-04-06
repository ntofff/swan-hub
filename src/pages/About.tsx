import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Puzzle, Zap, Shield, Layers, Play } from "lucide-react";

const benefits = [
  { icon: Puzzle, title: "Modulaire", desc: "Activez uniquement les outils nécessaires" },
  { icon: Zap, title: "Rapide", desc: "3 taps max pour toute action principale" },
  { icon: Shield, title: "Sécurisé", desc: "Privacy-first, conforme RGPD" },
  { icon: Layers, title: "Multi-Activité", desc: "Gérez toutes vos activités en un seul endroit" },
];

const AboutPage = () => (
  <div className="fade-in">
    <PageHeader title="À propos" />
    <div className="px-4 md:px-0">
      <div className="glass-card-glow p-6 text-center mb-6">
        <h2 className="text-3xl font-bold font-heading text-gradient-gold mb-2">SWAN</h2>
        <p className="text-sm text-muted-foreground mb-1">Simple Work Activity Network</p>
        <p className="text-sm text-secondary-foreground mt-4 leading-relaxed">
          Une plateforme de productivité modulaire premium conçue pour les professionnels indépendants et les utilisateurs multi-activités.
          Activez uniquement les outils dont vous avez besoin, restez organisé et travaillez plus intelligemment.
        </p>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Pourquoi SWAN</h2>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {benefits.map(b => (
          <div key={b.title} className="glass-card p-4 flex flex-col gap-2">
            <b.icon size={20} className="text-primary" />
            <div className="text-sm font-semibold">{b.title}</div>
            <div className="text-xs text-muted-foreground">{b.desc}</div>
          </div>
        ))}
      </div>

      <div className="glass-card p-8 flex flex-col items-center gap-3 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Play size={28} className="text-primary ml-1" />
        </div>
        <p className="text-sm text-muted-foreground">Voir la présentation du produit</p>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Plugins disponibles</h2>
      <div className="glass-card divide-y divide-border mb-6">
        {["Outil Rapport", "Journal de bord", "Tâches", "Gestionnaire de missions", "Devis & Factures", "Carnet de véhicule", "CRM Lite (bientôt)", "Suivi budget (bientôt)", "Outil réservation (bientôt)"].map(p => (
          <div key={p} className="px-4 py-3 text-sm">{p}</div>
        ))}
      </div>

      <div className="flex gap-2.5 mb-8">
        <button className="flex-1 btn-primary-glow py-3 text-sm text-center">Commencer gratuitement</button>
        <button className="flex-1 py-3 text-sm text-center rounded-xl border border-border text-secondary-foreground hover:bg-secondary transition-colors">En savoir plus</button>
      </div>
    </div>
    <FeedbackButton context="about" />
  </div>
);

export default AboutPage;
