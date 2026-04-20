import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TutorialButton } from "@/components/TutorialButton";
import { TOOL_TUTORIALS } from "@/config/tutorials";
import { Plus, Car, Users, Route, Download, BarChart3, ChevronRight, X, Pencil, Trash2 } from "lucide-react";
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

// Barème IK 2024 simplifié (puissance fiscale ≤ 5 CV)
const calcIK = (km: number, cv: number = 5) => {
  if (km <= 5000) return km * 0.636;
  if (km <= 20000) return km * 0.357 + 1395;
  return km * 0.427;
};

const VehiclePlugin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = tabsDef.some((t) => t.id === requestedTab) ? requestedTab! : (searchParams.get("new") === "1" ? "trips" : "dashboard");
  const openNewTrip = searchParams.get("new") === "1";
  const [tab, setTab] = useState(initialTab);

  // Forms
  const [showTripForm, setShowTripForm] = useState(openNewTrip);
  const [tripData, setTripData] = useState({ start_location: "", end_location: "", start_mileage: "", end_mileage: "", purpose: "", vehicle_id: "", driver_id: "" });
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleData, setVehicleData] = useState({ name: "", brand_model: "", license_plate: "", fiscal_power: "", starting_mileage: "" });
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverData, setDriverData] = useState({ name: "", role: "" });
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [routeData, setRouteData] = useState({ name: "", start_location: "", end_location: "", default_distance: "" });
  const [periodFilter, setPeriodFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");

  // Queries
  const { data: trips = [] } = useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("trips").select("*, vehicles(name), drivers(name)").eq("user_id", user!.id).order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("user_id", user!.id).order("created_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("*, vehicles(name)").eq("user_id", user!.id).order("created_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: frequentRoutes = [] } = useQuery({
    queryKey: ["frequent_routes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("frequent_routes").select("*").eq("user_id", user!.id).order("created_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  // Mutations
  const addTrip = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const sm = parseInt(tripData.start_mileage) || null;
      const em = parseInt(tripData.end_mileage) || null;
      const dist = sm && em ? em - sm : null;
      const ik = dist ? calcIK(dist) : null;
      const { error } = await supabase.from("trips").insert({
        user_id: user.id, start_location: tripData.start_location || null, end_location: tripData.end_location || null,
        start_mileage: sm, end_mileage: em, distance: dist, ik_amount: ik, purpose: tripData.purpose || null,
        vehicle_id: tripData.vehicle_id || null, driver_id: tripData.driver_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setTripData({ start_location: "", end_location: "", start_mileage: "", end_mileage: "", purpose: "", vehicle_id: "", driver_id: "" });
      setShowTripForm(false);
      toast.success("Trajet enregistré !");
    },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible d'enregistrer. Reconnectez-vous.")); },
  });

  const addVehicle = useMutation({
    mutationFn: async () => {
      if (!user || !vehicleData.name.trim()) return;
      const { error } = await supabase.from("vehicles").insert({
        user_id: user.id, name: vehicleData.name.trim(), brand_model: vehicleData.brand_model || null,
        license_plate: vehicleData.license_plate || null, fiscal_power: vehicleData.fiscal_power || null,
        starting_mileage: parseInt(vehicleData.starting_mileage) || 0, current_mileage: parseInt(vehicleData.starting_mileage) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setVehicleData({ name: "", brand_model: "", license_plate: "", fiscal_power: "", starting_mileage: "" });
      setShowVehicleForm(false);
      toast.success("Véhicule ajouté !");
    },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible d'ajouter")); },
  });

  const deleteVehicle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de supprimer")); },
  });

  const addDriver = useMutation({
    mutationFn: async () => {
      if (!user || !driverData.name.trim()) return;
      const { error } = await supabase.from("drivers").insert({ user_id: user.id, name: driverData.name.trim(), role: driverData.role || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setDriverData({ name: "", role: "" });
      setShowDriverForm(false);
      toast.success("Conducteur ajouté !");
    },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible d'ajouter")); },
  });

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de supprimer")); },
  });

  const addRoute = useMutation({
    mutationFn: async () => {
      if (!user || !routeData.name.trim()) return;
      const { error } = await supabase.from("frequent_routes").insert({
        user_id: user.id, name: routeData.name.trim(), start_location: routeData.start_location,
        end_location: routeData.end_location, default_distance: parseInt(routeData.default_distance) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frequent_routes"] });
      setRouteData({ name: "", start_location: "", end_location: "", default_distance: "" });
      setShowRouteForm(false);
      toast.success("Itinéraire ajouté !");
    },
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible d'ajouter")); },
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("frequent_routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["frequent_routes"] }),
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de supprimer")); },
  });

  const deleteTrip = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips"] }),
    onError: (err: any) => { toast.error("Erreur : " + (err.message || "Impossible de supprimer")); },
  });

  // Preset trip from frequent route
  const useRoutePreset = (route: any) => {
    setTripData(d => ({
      ...d,
      start_location: route.start_location,
      end_location: route.end_location,
      start_mileage: "",
      end_mileage: route.default_distance ? "" : "",
    }));
    closeAllForms();
    setShowTripForm(true);
    setTab("trips");
  };

  // Filter trips
  const now = new Date();
  const filteredTrips = trips.filter((t: any) => {
    if (vehicleFilter !== "all" && t.vehicle_id !== vehicleFilter) return false;
    if (periodFilter === "all") return true;
    const d = new Date(t.date);
    if (periodFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (periodFilter === "quarter") return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3);
    if (periodFilter === "year") return d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalKm = filteredTrips.reduce((s: number, t: any) => s + (t.distance || 0), 0);
  const totalIk = filteredTrips.reduce((s: number, t: any) => s + (parseFloat(t.ik_amount) || 0), 0);

  // Per vehicle stats
  const vehicleStats = vehicles.map((v: any) => {
    const vTrips = trips.filter((t: any) => t.vehicle_id === v.id);
    return { ...v, tripCount: vTrips.length, km: vTrips.reduce((s: number, t: any) => s + (t.distance || 0), 0) };
  });

  // Per driver stats
  const driverStats = drivers.map((d: any) => {
    const dTrips = trips.filter((t: any) => t.driver_id === d.id);
    return { ...d, tripCount: dTrips.length, km: dTrips.reduce((s: number, t: any) => s + (t.distance || 0), 0) };
  });

  const inputCls = "field-input";
  const createOpen = tab === "vehicles" ? showVehicleForm : tab === "drivers" ? showDriverForm : tab === "routes" ? showRouteForm : showTripForm;

  function closeAllForms() {
    setShowTripForm(false);
    setShowVehicleForm(false);
    setShowDriverForm(false);
    setShowRouteForm(false);
  }

  const openFormForTab = (targetTab = tab) => {
    closeAllForms();
    if (targetTab === "vehicles") setShowVehicleForm(true);
    else if (targetTab === "drivers") setShowDriverForm(true);
    else if (targetTab === "routes") setShowRouteForm(true);
    else {
      setTab("trips");
      setShowTripForm(true);
    }
  };

  const handleTabChange = (nextTab: string) => {
    setTab(nextTab);
    closeAllForms();
  };

  const toggleCreate = () => {
    if (createOpen) closeAllForms();
    else openFormForTab(tab);
  };

  const handleExportTrips = () => {
    if (filteredTrips.length === 0) {
      toast.error("Aucun trajet à exporter");
      return;
    }
    const headers = ["Date", "Véhicule", "Conducteur", "Départ", "Arrivée", "Distance km", "IK", "Objet"];
    const rows = filteredTrips.map((t: any) => [
      t.date ? new Date(t.date).toLocaleDateString("fr-FR") : "",
      t.vehicles?.name || "",
      t.drivers?.name || "",
      t.start_location || "",
      t.end_location || "",
      t.distance ?? "",
      t.ik_amount ?? "",
      t.purpose || "",
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carnet-vehicule-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé");
  };

  return (
    <div className="fade-in">
      <PageHeader title="Carnet de véhicule" subtitle="Trajets, véhicules et frais km" back
        action={
          <div className="flex items-center gap-1.5">
            <TutorialButton {...TOOL_TUTORIALS.vehicle} />
            <button
              onClick={toggleCreate}
              className={`btn btn-add ${createOpen ? "btn-add-active" : ""}`}
              aria-label={createOpen ? "Fermer le formulaire" : "Ajouter"}>
              {createOpen ? <X size={22} /> : <Plus size={24} />}
            </button>
          </div>
        } />
      <div className="field-workspace">
        <div className="field-simple-note">
          Rapide : choisissez la rubrique, ajoutez l'info utile, puis enregistrez.
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          {tabsDef.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* Trip form */}
        {tab === "trips" && showTripForm && (
          <div className="field-form-panel mb-4 space-y-4 slide-up">
            {frequentRoutes.length > 0 && (
              <div>
                <p className="field-label">Presets :</p>
                <div className="flex gap-1.5 flex-wrap">
                  {frequentRoutes.map((r: any) => (
                    <button key={r.id} onClick={() => useRoutePreset(r)} className="btn btn-secondary btn-sm">{r.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input value={tripData.start_location} onChange={e => setTripData(d => ({ ...d, start_location: e.target.value }))} placeholder="Départ" className={inputCls} />
              <input value={tripData.end_location} onChange={e => setTripData(d => ({ ...d, end_location: e.target.value }))} placeholder="Arrivée" className={inputCls} />
              <input value={tripData.start_mileage} onChange={e => setTripData(d => ({ ...d, start_mileage: e.target.value }))} placeholder="Km départ" type="number" className={inputCls} />
              <input value={tripData.end_mileage} onChange={e => setTripData(d => ({ ...d, end_mileage: e.target.value }))} placeholder="Km arrivée" type="number" className={inputCls} />
            </div>
            {vehicles.length > 0 && (
              <select value={tripData.vehicle_id} onChange={e => setTripData(d => ({ ...d, vehicle_id: e.target.value }))} className={inputCls}>
                <option value="">Véhicule...</option>
                {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
            {drivers.length > 0 && (
              <select value={tripData.driver_id} onChange={e => setTripData(d => ({ ...d, driver_id: e.target.value }))} className={inputCls}>
                <option value="">Conducteur...</option>
                {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <input value={tripData.purpose} onChange={e => setTripData(d => ({ ...d, purpose: e.target.value }))} placeholder="Objet du trajet" className={inputCls} />
            {tripData.start_mileage && tripData.end_mileage && (() => {
              const dist = parseInt(tripData.end_mileage) - parseInt(tripData.start_mileage);
              return (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Distance : {dist} km</span>
                  <span>IK : {calcIK(dist).toFixed(2)} €</span>
                </div>
              );
            })()}
            <div className="flex gap-2">
              <button onClick={() => addTrip.mutate()} className="btn btn-primary" style={{ flex: 1 }}>Enregistrer</button>
              <button onClick={() => setShowTripForm(false)} className="btn btn-secondary">Annuler</button>
            </div>
          </div>
        )}

        {/* Vehicle form */}
        {tab === "vehicles" && showVehicleForm && (
          <div className="field-form-panel mb-4 space-y-4 slide-up">
            <input value={vehicleData.name} onChange={e => setVehicleData(d => ({ ...d, name: e.target.value }))} placeholder="Nom du véhicule" className={inputCls} />
            <input value={vehicleData.brand_model} onChange={e => setVehicleData(d => ({ ...d, brand_model: e.target.value }))} placeholder="Marque / Modèle" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input value={vehicleData.license_plate} onChange={e => setVehicleData(d => ({ ...d, license_plate: e.target.value }))} placeholder="Plaque" className={inputCls} />
              <input value={vehicleData.fiscal_power} onChange={e => setVehicleData(d => ({ ...d, fiscal_power: e.target.value }))} placeholder="CV fiscaux" className={inputCls} />
            </div>
            <input value={vehicleData.starting_mileage} onChange={e => setVehicleData(d => ({ ...d, starting_mileage: e.target.value }))} placeholder="Km initial" type="number" className={inputCls} />
            <div className="flex gap-2">
              <button onClick={() => addVehicle.mutate()} disabled={!vehicleData.name.trim()} className="btn btn-primary" style={{ flex: 1 }}>Ajouter</button>
              <button onClick={() => setShowVehicleForm(false)} className="btn btn-secondary">Annuler</button>
            </div>
          </div>
        )}

        {/* Driver form */}
        {tab === "drivers" && showDriverForm && (
          <div className="field-form-panel mb-4 space-y-4 slide-up">
            <input value={driverData.name} onChange={e => setDriverData(d => ({ ...d, name: e.target.value }))} placeholder="Nom du conducteur" className={inputCls} />
            <input value={driverData.role} onChange={e => setDriverData(d => ({ ...d, role: e.target.value }))} placeholder="Rôle (optionnel)" className={inputCls} />
            <div className="flex gap-2">
              <button onClick={() => addDriver.mutate()} disabled={!driverData.name.trim()} className="btn btn-primary" style={{ flex: 1 }}>Ajouter</button>
              <button onClick={() => setShowDriverForm(false)} className="btn btn-secondary">Annuler</button>
            </div>
          </div>
        )}

        {/* Route form */}
        {tab === "routes" && showRouteForm && (
          <div className="field-form-panel mb-4 space-y-4 slide-up">
            <input value={routeData.name} onChange={e => setRouteData(d => ({ ...d, name: e.target.value }))} placeholder="Nom de l'itinéraire" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input value={routeData.start_location} onChange={e => setRouteData(d => ({ ...d, start_location: e.target.value }))} placeholder="Départ" className={inputCls} />
              <input value={routeData.end_location} onChange={e => setRouteData(d => ({ ...d, end_location: e.target.value }))} placeholder="Arrivée" className={inputCls} />
            </div>
            <input value={routeData.default_distance} onChange={e => setRouteData(d => ({ ...d, default_distance: e.target.value }))} placeholder="Distance par défaut (km)" type="number" className={inputCls} />
            <div className="flex gap-2">
              <button onClick={() => addRoute.mutate()} disabled={!routeData.name.trim() || !routeData.start_location.trim() || !routeData.end_location.trim()} className="btn btn-primary" style={{ flex: 1 }}>Ajouter</button>
              <button onClick={() => setShowRouteForm(false)} className="btn btn-secondary">Annuler</button>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="space-y-4 slide-up">
            {/* Filters */}
            <div className="flex gap-1.5 flex-wrap">
              {[{ id: "all", label: "Tout" }, { id: "month", label: "Ce mois" }, { id: "quarter", label: "Trimestre" }, { id: "year", label: "Année" }].map(p => (
                <button key={p.id} onClick={() => setPeriodFilter(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${periodFilter === p.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{p.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Km total", value: `${totalKm.toLocaleString("fr-FR")} km` },
                { label: "IK Total", value: `${totalIk.toFixed(2)} €` },
                { label: "Trajets", value: String(filteredTrips.length) },
              ].map(s => (
                <div key={s.label} className="glass-card p-3 text-center">
                  <div className="text-lg font-bold font-heading">{s.value}</div>
                  <div className="text-xs font-semibold text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Per vehicle */}
            {vehicleStats.length > 0 && (
              <>
                <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Par véhicule</h3>
                <div className="space-y-3">
                  {vehicleStats.map((v: any) => (
                    <div key={v.id} className="plugin-record flex items-center gap-3">
                      <span className="plugin-record-title flex-1 truncate">{v.name}</span>
                      <span className="text-sm text-muted-foreground">{v.tripCount} trajets</span>
                      <span className="text-sm font-semibold">{v.km.toLocaleString("fr-FR")} km</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Per driver */}
            {driverStats.length > 0 && (
              <>
                <h3 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Par conducteur</h3>
                <div className="space-y-3">
                  {driverStats.map((d: any) => (
                    <div key={d.id} className="plugin-record flex items-center gap-3">
                      <span className="plugin-record-title flex-1 truncate">{d.name}</span>
                      <span className="text-sm text-muted-foreground">{d.tripCount} trajets</span>
                      <span className="text-sm font-semibold">{d.km.toLocaleString("fr-FR")} km</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button onClick={() => openFormForTab("trips")} className="btn btn-primary btn-full">+ Nouveau trajet</button>
          </div>
        )}

        {/* Trips */}
        {tab === "trips" && (
          <div className="slide-up space-y-3">
            {vehicles.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setVehicleFilter("all")} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${vehicleFilter === "all" ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>Tout</button>
                {vehicles.map((v: any) => (
                  <button key={v.id} onClick={() => setVehicleFilter(v.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${vehicleFilter === v.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{v.name}</button>
                ))}
              </div>
            )}
            {filteredTrips.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun trajet</p></div>
            ) : (
              <div className="space-y-3">
                {filteredTrips.map((t: any) => (
                  <div key={t.id} className="plugin-record flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="plugin-record-title truncate">{t.start_location || "?"} → {t.end_location || "?"}</div>
                      <div className="plugin-record-meta mt-1">
                        {new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {t.vehicles ? ` · ${t.vehicles.name}` : ""}{t.drivers ? ` · ${t.drivers.name}` : ""}
                        {t.purpose ? ` · ${t.purpose}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{t.distance ?? "–"} km</div>
                      {t.ik_amount && <div className="text-xs font-semibold text-primary">{Number(t.ik_amount).toFixed(2)} €</div>}
                    </div>
                    <button onClick={() => { if (window.confirm("Supprimer ce trajet ?")) deleteTrip.mutate(t.id); }} className="btn btn-icon-sm btn-delete rounded-full"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vehicles */}
        {tab === "vehicles" && (
          <div className="space-y-2.5 slide-up">
            {vehicles.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun véhicule</p></div>
            ) : vehicles.map((v: any) => (
              <div key={v.id} className="plugin-record flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Car size={18} className="text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="plugin-record-title truncate">{v.name}</div>
                  <div className="plugin-record-meta mt-1">{v.brand_model}{v.license_plate ? ` · ${v.license_plate}` : ""}{v.fiscal_power ? ` · ${v.fiscal_power} CV` : ""}{v.current_mileage ? ` · ${v.current_mileage.toLocaleString("fr-FR")} km` : ""}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-success/10 text-success">{v.status}</span>
                <button onClick={() => { if (window.confirm("Supprimer ce véhicule ?")) deleteVehicle.mutate(v.id); }} className="btn btn-icon-sm btn-delete rounded-full"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Drivers */}
        {tab === "drivers" && (
          <div className="space-y-2.5 slide-up">
            {drivers.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun conducteur</p></div>
            ) : drivers.map((d: any) => (
              <div key={d.id} className="plugin-record flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Users size={18} className="text-info" /></div>
                <div className="flex-1 min-w-0">
                  <div className="plugin-record-title truncate">{d.name}</div>
                  <div className="plugin-record-meta mt-1">{d.role || "—"}{d.vehicles ? ` · ${d.vehicles.name}` : ""}</div>
                </div>
                <button onClick={() => { if (window.confirm("Supprimer ce conducteur ?")) deleteDriver.mutate(d.id); }} className="btn btn-icon-sm btn-delete rounded-full"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Routes */}
        {tab === "routes" && (
          <div className="space-y-2.5 slide-up">
            {frequentRoutes.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">Aucun itinéraire fréquent</p></div>
            ) : frequentRoutes.map((r: any) => (
              <div key={r.id} className="plugin-record flex items-center gap-3">
                <Route size={16} className="text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="plugin-record-title truncate">{r.name}</div>
                  <div className="plugin-record-meta mt-1">{r.start_location} → {r.end_location}{r.default_distance ? ` · ${r.default_distance} km` : ""}</div>
                </div>
                <button onClick={() => useRoutePreset(r)} className="btn btn-secondary btn-xs">Utiliser</button>
                <button onClick={() => { if (window.confirm("Supprimer cet itinéraire ?")) deleteRoute.mutate(r.id); }} className="btn btn-icon-sm btn-delete rounded-full"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Export */}
        {tab === "export" && (
          <div className="slide-up glass-card p-6 text-center space-y-4">
            <Download size={32} className="text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Exporter trajets, kilométrage et données IK vers Excel</p>
            <div className="space-y-2">
              <select className={inputCls}>
                <option>Tous les véhicules</option>
                {vehicles.map((v: any) => <option key={v.id}>{v.name}</option>)}
              </select>
              <select className={inputCls}>
                <option>Ce mois</option><option>3 derniers mois</option><option>Cette année</option><option>Tout</option>
              </select>
            </div>
            <button onClick={handleExportTrips} className="btn btn-primary btn-full">Exporter vers Excel</button>
          </div>
        )}
      </div>
      <FeedbackButton context="vehicle" />
    </div>
  );
};

export default VehiclePlugin;
