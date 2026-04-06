import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Plus, Car, Users, Route, Download, BarChart3, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const tabsDef = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
  { id: "trips", label: "Trajets", icon: Route },
  { id: "vehicles", label: "Véhicules", icon: Car },
  { id: "drivers", label: "Conducteurs", icon: Users },
  { id: "routes", label: "Itinéraires", icon: Route },
  { id: "export", label: "Export", icon: Download },
];

const VehiclePlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [showTripForm, setShowTripForm] = useState(false);
  const [tripData, setTripData] = useState({ start_location: "", end_location: "", start_mileage: "", end_mileage: "", purpose: "" });

  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data } = await supabase.from("trips").select("*, vehicles(name), drivers(name)").order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").order("created_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("*, vehicles(name)").order("created_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: frequentRoutes = [] } = useQuery({
    queryKey: ["frequent_routes"],
    queryFn: async () => {
      const { data } = await supabase.from("frequent_routes").select("*, user_activities(name)").order("created_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  const addTrip = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const sm = parseInt(tripData.start_mileage) || null;
      const em = parseInt(tripData.end_mileage) || null;
      const dist = sm && em ? em - sm : null;
      const ik = dist ? dist * 0.48 : null;
      await supabase.from("trips").insert({
        user_id: user.id,
        start_location: tripData.start_location || null,
        end_location: tripData.end_location || null,
        start_mileage: sm,
        end_mileage: em,
        ik_amount: ik,
        purpose: tripData.purpose || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setTripData({ start_location: "", end_location: "", start_mileage: "", end_mileage: "", purpose: "" });
      setShowTripForm(false);
      toast.success("Trajet enregistré !");
    },
  });

  const totalKm = trips.reduce((sum: number, t: any) => sum + (t.distance || 0), 0);
  const totalIk = trips.reduce((sum: number, t: any) => sum + (parseFloat(t.ik_amount) || 0), 0);

  return (
    <div className="fade-in">
      <PageHeader title="Carnet de véhicule" subtitle="Kilométrage & suivi IK" back
        action={<button onClick={() => setShowTripForm(!showTripForm)} className="p-2 rounded-xl bg-primary/10 text-primary"><Plus size={18} /></button>} />
      <div className="px-4 md:px-0">
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          {tabsDef.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {showTripForm && (
          <div className="glass-card p-4 mb-4 space-y-3 slide-up">
            <div className="grid grid-cols-2 gap-2">
              <input value={tripData.start_location} onChange={e => setTripData(d => ({ ...d, start_location: e.target.value }))} placeholder="Départ"
                className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <input value={tripData.end_location} onChange={e => setTripData(d => ({ ...d, end_location: e.target.value }))} placeholder="Arrivée"
                className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <input value={tripData.start_mileage} onChange={e => setTripData(d => ({ ...d, start_mileage: e.target.value }))} placeholder="Km départ" type="number"
                className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <input value={tripData.end_mileage} onChange={e => setTripData(d => ({ ...d, end_mileage: e.target.value }))} placeholder="Km arrivée" type="number"
                className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <input value={tripData.purpose} onChange={e => setTripData(d => ({ ...d, purpose: e.target.value }))} placeholder="Objet du trajet"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            {tripData.start_mileage && tripData.end_mileage && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Distance : {(parseInt(tripData.end_mileage) - parseInt(tripData.start_mileage))} km</span>
                <span>IK : {((parseInt(tripData.end_mileage) - parseInt(tripData.start_mileage)) * 0.48).toFixed(2)} €</span>
              </div>
            )}
            <button onClick={() => addTrip.mutate()} className="w-full btn-primary-glow py-2.5 text-sm">Enregistrer le trajet</button>
          </div>
        )}

        {tab === "dashboard" && (
          <div className="space-y-4 slide-up">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Ce mois", value: `${totalKm.toLocaleString("fr-FR")} km` },
                { label: "IK Total", value: `${totalIk.toFixed(2)} €` },
                { label: "Trajets", value: String(trips.length) },
              ].map(s => (
                <div key={s.label} className="glass-card p-3 text-center">
                  <div className="text-lg font-bold font-heading">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Trajets récents</h3>
            {trips.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-sm text-muted-foreground">Aucun trajet enregistré</p>
              </div>
            ) : (
              <div className="glass-card divide-y divide-border">
                {trips.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.start_location || "?"} → {t.end_location || "?"}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{t.vehicles ? ` · ${t.vehicles.name}` : ""}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{t.distance ?? "–"} km</div>
                      {t.ik_amount && <div className="text-[10px] text-primary">{Number(t.ik_amount).toFixed(2)} €</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowTripForm(true)} className="w-full btn-primary-glow py-3 text-sm">+ Nouveau trajet</button>
          </div>
        )}

        {tab === "trips" && (
          <div className="slide-up">
            {trips.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun trajet</p></div>
            ) : (
              <div className="glass-card divide-y divide-border">
                {trips.map((t: any) => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.start_location || "?"} → {t.end_location || "?"}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{t.vehicles ? ` · ${t.vehicles.name}` : ""}{t.drivers ? ` · ${t.drivers.name}` : ""}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{t.distance ?? "–"} km</div>
                      {t.ik_amount && <div className="text-[10px] text-primary">{Number(t.ik_amount).toFixed(2)} €</div>}
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "vehicles" && (
          <div className="space-y-2.5 slide-up">
            {vehicles.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun véhicule</p></div>
            ) : vehicles.map((v: any) => (
              <div key={v.id} className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Car size={18} className="text-primary" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{v.name}</div>
                  <div className="text-[10px] text-muted-foreground">{v.license_plate}{v.fiscal_power ? ` · ${v.fiscal_power}` : ""}{v.current_mileage ? ` · ${v.current_mileage.toLocaleString("fr-FR")} km` : ""}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">{v.status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "drivers" && (
          <div className="space-y-2.5 slide-up">
            {drivers.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun conducteur</p></div>
            ) : drivers.map((d: any) => (
              <div key={d.id} className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Users size={18} className="text-info" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{d.name}</div>
                  <div className="text-[10px] text-muted-foreground">{d.role}{d.vehicles ? ` · ${d.vehicles.name}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "routes" && (
          <div className="space-y-2.5 slide-up">
            {frequentRoutes.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun itinéraire fréquent</p></div>
            ) : frequentRoutes.map((r: any) => (
              <div key={r.id} className="glass-card p-4 flex items-center gap-3">
                <Route size={16} className="text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-[10px] text-muted-foreground">{r.default_distance ? `${r.default_distance} km` : ""}{r.user_activities ? ` · ${r.user_activities.name}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "export" && (
          <div className="slide-up glass-card p-6 text-center space-y-4">
            <Download size={32} className="text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Exporter trajets, kilométrage et données IK vers Excel</p>
            <div className="space-y-2">
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                <option>Tous les véhicules</option>
                {vehicles.map((v: any) => <option key={v.id}>{v.name}</option>)}
              </select>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                <option>Ce mois</option><option>3 derniers mois</option><option>Cette année</option><option>Tout</option>
              </select>
            </div>
            <button className="w-full btn-primary-glow py-3 text-sm">Exporter vers Excel</button>
          </div>
        )}
      </div>
      <FeedbackButton context="vehicle" />
    </div>
  );
};

export default VehiclePlugin;
