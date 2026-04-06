import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Car, Users, Route, Download, BarChart3, ChevronRight } from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "trips", label: "Trips", icon: Route },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "drivers", label: "Drivers", icon: Users },
  { id: "routes", label: "Routes", icon: Route },
  { id: "export", label: "Export", icon: Download },
];

const recentTrips = [
  { id: 1, date: "Apr 6", vehicle: "Peugeot 308", driver: "Alex M.", from: "Paris", to: "Lyon", km: 465, ik: "€223.20" },
  { id: 2, date: "Apr 5", vehicle: "Renault Kangoo", driver: "Marie D.", from: "Lyon", to: "Grenoble", km: 113, ik: "€54.24" },
  { id: 3, date: "Apr 4", vehicle: "Peugeot 308", driver: "Alex M.", from: "Paris", to: "Versailles", km: 34, ik: "€16.32" },
];

const vehicles = [
  { name: "Peugeot 308", plate: "AB-123-CD", power: "7 CV", km: "45,230 km", status: "Active" },
  { name: "Renault Kangoo", plate: "EF-456-GH", power: "5 CV", km: "78,100 km", status: "Active" },
];

const drivers = [
  { name: "Alex Martin", role: "Manager", vehicle: "Peugeot 308" },
  { name: "Marie Dupont", role: "Field Agent", vehicle: "Renault Kangoo" },
];

const frequentRoutes = [
  { name: "Paris → Lyon", distance: "465 km", activity: "Consulting" },
  { name: "Lyon → Grenoble", distance: "113 km", activity: "Transport" },
  { name: "Paris → Versailles", distance: "34 km", activity: "Consulting" },
];

const VehiclePlugin = () => {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="fade-in">
      <PageHeader title="Vehicle Logbook" subtitle="Mileage & IK tracking" back
        action={<button className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <div className="space-y-4 slide-up">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "This Month", value: "1,247 km" },
                { label: "Total IK", value: "€598.56" },
                { label: "Trips", value: "12" },
              ].map(s => (
                <div key={s.label} className="glass-card p-3 text-center">
                  <div className="text-lg font-bold font-heading">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Recent trips */}
            <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Recent Trips</h3>
            <div className="glass-card divide-y divide-border">
              {recentTrips.map(t => (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.from} → {t.to}</div>
                    <div className="text-[10px] text-muted-foreground">{t.date} · {t.vehicle} · {t.driver}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{t.km} km</div>
                    <div className="text-[10px] text-primary">{t.ik}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full btn-primary-glow py-3 text-sm">+ New Trip</button>
          </div>
        )}

        {tab === "trips" && (
          <div className="slide-up">
            <div className="glass-card divide-y divide-border">
              {recentTrips.map(t => (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.from} → {t.to}</div>
                    <div className="text-[10px] text-muted-foreground">{t.date} · {t.vehicle} · {t.driver}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{t.km} km</div>
                    <div className="text-[10px] text-primary">{t.ik}</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "vehicles" && (
          <div className="space-y-2.5 slide-up">
            {vehicles.map(v => (
              <div key={v.plate} className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Car size={18} className="text-primary" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{v.name}</div>
                  <div className="text-[10px] text-muted-foreground">{v.plate} · {v.power} · {v.km}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">{v.status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "drivers" && (
          <div className="space-y-2.5 slide-up">
            {drivers.map(d => (
              <div key={d.name} className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Users size={18} className="text-info" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{d.name}</div>
                  <div className="text-[10px] text-muted-foreground">{d.role} · {d.vehicle}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "routes" && (
          <div className="space-y-2.5 slide-up">
            {frequentRoutes.map(r => (
              <div key={r.name} className="glass-card p-4 flex items-center gap-3">
                <Route size={16} className="text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-[10px] text-muted-foreground">{r.distance} · {r.activity}</div>
                </div>
              </div>
            ))}
            <button className="w-full glass-card p-3 text-sm text-primary text-center">+ Add Route</button>
          </div>
        )}

        {tab === "export" && (
          <div className="slide-up glass-card p-6 text-center space-y-4">
            <Download size={32} className="text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Export trips, mileage, and IK data to Excel</p>
            <div className="space-y-2">
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                <option>All Vehicles</option><option>Peugeot 308</option><option>Renault Kangoo</option>
              </select>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                <option>This Month</option><option>Last 3 Months</option><option>This Year</option><option>All Time</option>
              </select>
            </div>
            <button className="w-full btn-primary-glow py-3 text-sm">Export to Excel</button>
          </div>
        )}
      </div>
      <FeedbackButton context="vehicle" />
    </div>
  );
};

export default VehiclePlugin;
