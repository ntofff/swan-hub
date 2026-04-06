import { PageHeader } from "@/components/layout/PageHeader";
import { Users, CreditCard, Puzzle, MessageSquare, BarChart3, Shield, Settings, ChevronRight } from "lucide-react";

const stats = [
  { label: "Total Users", value: "1,247", change: "+12%" },
  { label: "Active Today", value: "342", change: "+5%" },
  { label: "MRR", value: "€8,420", change: "+18%" },
  { label: "Feedback", value: "89", change: "+7" },
];

const recentSignups = [
  { name: "Julie Moreau", email: "julie@example.com", id: "USR-2024-1247", plan: "Pro", date: "2 min ago" },
  { name: "Thomas Bernard", email: "thomas@example.com", id: "USR-2024-1246", plan: "Free", date: "1h ago" },
  { name: "Clara Petit", email: "clara@example.com", id: "USR-2024-1245", plan: "Free", date: "3h ago" },
];

const pluginStats = [
  { name: "Tasks", activations: 1089, usage: "High" },
  { name: "Report Tool", activations: 945, usage: "High" },
  { name: "Vehicle Logbook", activations: 723, usage: "Medium" },
  { name: "Missions", activations: 612, usage: "Medium" },
  { name: "Quotes & Invoices", activations: 534, usage: "Medium" },
  { name: "Logbook", activations: 478, usage: "Low" },
];

const recentFeedback = [
  { user: "USR-2024-0891", plugin: "Vehicle", type: "Suggestion", text: "Add GPS integration for auto-route", time: "30 min ago" },
  { user: "USR-2024-0342", plugin: "Tasks", type: "Bug", text: "Priority filter not saving", time: "2h ago" },
  { user: "USR-2024-1102", plugin: "Quotes", type: "UX Issue", text: "Convert to invoice button hard to find", time: "5h ago" },
];

const AdminPage = () => (
  <div className="fade-in max-w-5xl mx-auto">
    <div className="flex items-center justify-between px-4 pt-6 pb-4">
      <div>
        <h1 className="text-xl font-bold font-heading flex items-center gap-2">
          <Shield size={20} className="text-primary" /> Admin Console
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">SWAN Hub Administration</p>
      </div>
      <button className="p-2 rounded-xl bg-secondary text-muted-foreground"><Settings size={18} /></button>
    </div>
    <div className="px-4">
      {/* KPI Cards */}
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
        {/* Recent Signups */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users size={14} /> Recent Signups</h2>
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

        {/* Plugin Stats */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Puzzle size={14} /> Plugin Analytics</h2>
          <div className="glass-card divide-y divide-border">
            {pluginStats.map(p => (
              <div key={p.name} className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm flex-1">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.activations}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.usage === 'High' ? 'bg-success/10 text-success' : p.usage === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-secondary text-muted-foreground'}`}>{p.usage}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="md:col-span-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><MessageSquare size={14} /> Recent Feedback</h2>
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

      {/* Admin actions */}
      <div className="mt-6 mb-8">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin Actions</h2>
        <div className="glass-card divide-y divide-border">
          {["Manage Users", "Payment & Subscriptions", "Promotions & Discounts", "Theme Manager", "Audit Logs", "Grant Plugin Access"].map(a => (
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
