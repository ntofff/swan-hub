import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Puzzle, Zap, Shield, Layers, Play } from "lucide-react";

const benefits = [
  { icon: Puzzle, title: "Modular", desc: "Activate only the tools you need" },
  { icon: Zap, title: "Fast", desc: "3 taps max for any main action" },
  { icon: Shield, title: "Secure", desc: "Privacy-first, GDPR compliant" },
  { icon: Layers, title: "Multi-Activity", desc: "Manage all your businesses in one place" },
];

const AboutPage = () => (
  <div className="fade-in">
    <PageHeader title="About" />
    <div className="px-4 md:px-0">
      {/* Hero */}
      <div className="glass-card-glow p-6 text-center mb-6">
        <h2 className="text-3xl font-bold font-heading text-gradient-gold mb-2">SWAN</h2>
        <p className="text-sm text-muted-foreground mb-1">Simple Work Activity Network</p>
        <p className="text-sm text-secondary-foreground mt-4 leading-relaxed">
          A premium modular productivity platform built for independent professionals and multi-activity users. 
          Activate only the tools you need, stay organized, and work smarter.
        </p>
      </div>

      {/* Benefits */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Why SWAN</h2>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {benefits.map(b => (
          <div key={b.title} className="glass-card p-4 flex flex-col gap-2">
            <b.icon size={20} className="text-primary" />
            <div className="text-sm font-semibold">{b.title}</div>
            <div className="text-xs text-muted-foreground">{b.desc}</div>
          </div>
        ))}
      </div>

      {/* Video placeholder */}
      <div className="glass-card p-8 flex flex-col items-center gap-3 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Play size={28} className="text-primary ml-1" />
        </div>
        <p className="text-sm text-muted-foreground">Watch the product overview</p>
      </div>

      {/* Plugins overview */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading uppercase tracking-wider">Available Plugins</h2>
      <div className="glass-card divide-y divide-border mb-6">
        {["Report Tool", "Logbook", "Tasks", "Mission Manager", "Quotes & Invoices", "Vehicle Logbook", "CRM Lite (coming)", "Budget Tracker (coming)", "Booking Tool (coming)"].map(p => (
          <div key={p} className="px-4 py-3 text-sm">{p}</div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex gap-2.5 mb-8">
        <button className="flex-1 btn-primary-glow py-3 text-sm text-center">Get Started Free</button>
        <button className="flex-1 py-3 text-sm text-center rounded-xl border border-border text-secondary-foreground hover:bg-secondary transition-colors">Learn More</button>
      </div>
    </div>
    <FeedbackButton context="about" />
  </div>
);

export default AboutPage;
