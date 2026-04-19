// ============================================================
// SWAN · HUB — Design Tokens
// Source unique de vérité pour toutes les constantes visuelles
// ============================================================

// ── Thèmes disponibles ────────────────────────────────────────
export type ThemeId = 'night-gold' | 'sun' | 'office' | 'comfort';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
  icon: string;
  preview: { bg: string; accent: string; text: string };
}

export const THEMES: ThemeOption[] = [
  {
    id: 'night-gold',
    label: 'Nuit d\'Or',
    description: 'Thème par défaut — idéal en intérieur et le soir',
    icon: '🌙',
    preview: { bg: '#111111', accent: '#C9A961', text: '#F5F3EF' },
  },
  {
    id: 'sun',
    label: 'Soleil',
    description: 'Fond clair — idéal en extérieur sous forte lumière',
    icon: '☀️',
    preview: { bg: '#F7F5F0', accent: '#8A6A1E', text: '#1A1611' },
  },
  {
    id: 'office',
    label: 'Bureau',
    description: 'Neutre et sobre — idéal en réunion ou chez un client',
    icon: '💼',
    preview: { bg: '#F4F4F6', accent: '#2C5F8A', text: '#1A1C22' },
  },
  {
    id: 'comfort',
    label: 'Confort Yeux',
    description: 'Sépia doux — idéal pour les longues sessions ou la fatigue',
    icon: '👁️',
    preview: { bg: '#1C1814', accent: '#C4A87A', text: '#EDE0C8' },
  },
];

// ── Plans disponibles ─────────────────────────────────────────
export type PlanId = 'free' | 'carte' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  priceHT: number | null;    // null = gratuit
  priceTTC: number | null;
  description: string;
  features: string[];
  maxPlugins: number | null; // null = illimité
  aiAccess: boolean;
  badge?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Découverte',
    priceHT: null,
    priceTTC: null,
    description: '2 mois offerts pour découvrir l\'app',
    features: [
      '3 outils au choix',
      '2 mois gratuits pour créer l\'habitude',
      'Sans carte bancaire',
      'Accès au support standard',
    ],
    maxPlugins: 3,
    aiAccess: true,
    badge: '2 mois gratuits',
  },
  {
    id: 'carte',
    name: 'À la carte',
    priceHT: 1,
    priceTTC: 1.20,
    description: '3 outils gratuits, puis payez uniquement le reste',
    features: [
      '3 outils gratuits inclus',
      '1,20 € TTC par outil supplémentaire par mois',
      'Activez et désactivez à volonté',
      'Accès IA inclus',
      'Support standard',
    ],
    maxPlugins: null,
    aiAccess: true,
  },
  {
    id: 'pro',
    name: 'Pro Total',
    priceHT: 9,
    priceTTC: 10.80,
    description: 'Accès illimité à tous les outils',
    features: [
      'Tous les outils inclus',
      'Nouveaux outils dès leur sortie',
      'IA illimitée',
      'Support prioritaire',
      'Accès aux fonctions bêta en avant-première',
    ],
    maxPlugins: null,
    aiAccess: true,
    badge: 'Meilleur choix',
  },
];

export const FREE_PLUGIN_ALLOWANCE = 3;
export const PLAN_BREAKEVEN_PLUGINS = 12; // 3 gratuits + 9 outils payants = Pro

// ── Catalogue Outils ─────────────────────────────────────────
export type PluginId =
  | 'report'
  | 'tasks'
  | 'missions'
  | 'quotes'
  | 'logbook'
  | 'vehicle'
  | 'crm'
  | 'budget'
  | 'booking'
  | 'expenses'
  | 'time-tracker'
  | 'delivery'
  | 'checklist';

export interface Plugin {
  id: PluginId;
  name: string;
  description: string;
  shortDesc: string;
  icon: string;           // Nom icône Lucide
  color: string;          // HSL string
  route: string;
  available: boolean;
  eta?: string;           // Pour les plugins non disponibles
  trades: string[];       // Métiers ciblés
  kpis: PluginKPI[];
}

export interface PluginKPI {
  id: string;
  label: string;
  unit: string;
  period: 'day' | 'week' | 'month' | 'year' | 'total';
  query: string;          // Nom de la query React Query
  importance: 1 | 2 | 3; // 1 = affiché en grand
}

export const PLUGINS: Plugin[] = [
  {
    id: 'report',
    name: 'Rapport Terrain',
    description: 'Créez des rapports professionnels avec photos et résumé IA',
    shortDesc: 'Rapports pro avec photos',
    icon: 'FileText',
    color: '38 50% 58%',
    route: '/plugins/report',
    available: true,
    trades: ['btp', 'services', 'immobilier', 'commercial'],
    kpis: [
      { id: 'reports_month',  label: 'Rapports ce mois',   unit: '',      period: 'month', query: 'kpi_reports_count',  importance: 1 },
      { id: 'reports_total',  label: 'Total rapports',     unit: '',      period: 'total', query: 'kpi_reports_total',  importance: 2 },
      { id: 'reports_photos', label: 'Photos enregistrées',unit: '',      period: 'total', query: 'kpi_photos_total',   importance: 3 },
    ],
  },
  {
    id: 'tasks',
    name: 'Tâches',
    description: 'Gérez vos tâches avec priorités, dates limites et alertes',
    shortDesc: 'Tâches & priorités',
    icon: 'CheckSquare',
    color: '142 71% 45%',
    route: '/plugins/tasks',
    available: true,
    trades: ['all'],
    kpis: [
      { id: 'tasks_done_week',    label: 'Tâches complétées',  unit: '',  period: 'week',  query: 'kpi_tasks_done',    importance: 1 },
      { id: 'tasks_pending',      label: 'En attente',          unit: '',  period: 'total', query: 'kpi_tasks_pending', importance: 1 },
      { id: 'tasks_overdue',      label: 'En retard',           unit: '',  period: 'total', query: 'kpi_tasks_overdue', importance: 2 },
      { id: 'tasks_completion',   label: 'Taux de complétion',  unit: '%', period: 'month', query: 'kpi_tasks_rate',    importance: 2 },
    ],
  },
  {
    id: 'missions',
    name: 'Missions',
    description: 'Suivez vos missions et chantiers du début à la fin',
    shortDesc: 'Suivi de missions',
    icon: 'Target',
    color: '217 91% 60%',
    route: '/plugins/missions',
    available: true,
    trades: ['btp', 'services', 'commercial', 'immobilier'],
    kpis: [
      { id: 'missions_active',   label: 'Missions actives',   unit: '',  period: 'total', query: 'kpi_missions_active',   importance: 1 },
      { id: 'missions_done',     label: 'Terminées ce mois',  unit: '',  period: 'month', query: 'kpi_missions_done',     importance: 1 },
      { id: 'missions_overdue',  label: 'En retard',           unit: '',  period: 'total', query: 'kpi_missions_overdue',  importance: 2 },
      { id: 'missions_value',    label: 'Valeur en cours',     unit: '€', period: 'total', query: 'kpi_missions_value',    importance: 2 },
    ],
  },
  {
    id: 'quotes',
    name: 'Devis & Factures',
    description: 'Facturation professionnelle conforme à la législation française',
    shortDesc: 'Devis & facturation',
    icon: 'Receipt',
    color: '270 50% 60%',
    route: '/plugins/quotes',
    available: true,
    trades: ['all'],
    kpis: [
      { id: 'ca_month',         label: 'CA encaissé ce mois', unit: '€', period: 'month', query: 'kpi_ca_month',          importance: 1 },
      { id: 'ca_year',          label: 'CA annuel',            unit: '€', period: 'year',  query: 'kpi_ca_year',           importance: 1 },
      { id: 'pending_amount',   label: 'En attente paiement',  unit: '€', period: 'total', query: 'kpi_pending_amount',    importance: 1 },
      { id: 'quotes_sent',      label: 'Devis envoyés',        unit: '',  period: 'month', query: 'kpi_quotes_sent',       importance: 2 },
      { id: 'conversion_rate',  label: 'Taux conversion',      unit: '%', period: 'month', query: 'kpi_conversion_rate',   importance: 2 },
      { id: 'avg_invoice',      label: 'Facture moyenne',      unit: '€', period: 'month', query: 'kpi_avg_invoice',       importance: 3 },
      { id: 'overdue_invoices', label: 'Factures en retard',   unit: '',  period: 'total', query: 'kpi_overdue_invoices',  importance: 2 },
    ],
  },
  {
    id: 'logbook',
    name: 'Journal de Bord',
    description: 'Votre carnet numérique pour noter vos observations quotidiennes',
    shortDesc: 'Journal quotidien',
    icon: 'BookOpen',
    color: '0 72% 51%',
    route: '/plugins/logbook',
    available: true,
    trades: ['all'],
    kpis: [
      { id: 'logbook_month',   label: 'Entrées ce mois',  unit: '',  period: 'month', query: 'kpi_logbook_month',  importance: 1 },
      { id: 'logbook_streak',  label: 'Jours consécutifs', unit: 'j', period: 'total', query: 'kpi_logbook_streak', importance: 2 },
    ],
  },
  {
    id: 'vehicle',
    name: 'Carnet Véhicule',
    description: 'Kilométrage, indemnités IK fiscales et suivi d\'entretien',
    shortDesc: 'Kilométrage & IK',
    icon: 'Car',
    color: '38 92% 50%',
    route: '/plugins/vehicle',
    available: true,
    trades: ['btp', 'services', 'commercial', 'transport', 'immobilier'],
    kpis: [
      { id: 'km_month',        label: 'Km ce mois',         unit: 'km', period: 'month', query: 'kpi_km_month',        importance: 1 },
      { id: 'km_year',         label: 'Km cette année',      unit: 'km', period: 'year',  query: 'kpi_km_year',         importance: 2 },
      { id: 'ik_year',         label: 'Déclaration IK',      unit: '€',  period: 'year',  query: 'kpi_ik_year',         importance: 1 },
      { id: 'next_maintenance',label: 'Prochain entretien',  unit: '',   period: 'total', query: 'kpi_next_maintenance', importance: 2 },
    ],
  },
  // ── Outils à venir ─────────────────────────────────────────
  {
    id: 'crm',
    name: 'Contacts clients',
    description: 'Gérez vos contacts et suivez vos relances commerciales',
    shortDesc: 'Gestion clients',
    icon: 'Users',
    color: '199 89% 48%',
    route: '/plugins/crm',
    available: false,
    eta: 'Q3 2025',
    trades: ['commercial', 'immobilier', 'services'],
    kpis: [],
  },
  {
    id: 'budget',
    name: 'Suivi Budget',
    description: 'Visualisez vos revenus et dépenses en temps réel',
    shortDesc: 'Vue financière',
    icon: 'Wallet',
    color: '142 60% 42%',
    route: '/plugins/budget',
    available: false,
    eta: 'Q4 2025',
    trades: ['all'],
    kpis: [],
  },
  {
    id: 'booking',
    name: 'Prise de RDV',
    description: 'Permettez à vos clients de réserver en ligne automatiquement',
    shortDesc: 'Réservation en ligne',
    icon: 'Calendar',
    color: '280 60% 55%',
    route: '/plugins/booking',
    available: false,
    eta: '2026',
    trades: ['services', 'immobilier', 'sante'],
    kpis: [],
  },
  {
    id: 'expenses',
    name: 'Notes de Frais',
    description: 'Photo ticket → catégorie → export pour comptable',
    shortDesc: 'Frais & dépenses',
    icon: 'Banknote',
    color: '330 70% 55%',
    route: '/plugins/expenses',
    available: false,
    eta: '2026',
    trades: ['all'],
    kpis: [],
  },
  {
    id: 'time-tracker',
    name: 'Suivi Temps',
    description: 'Chronométrez votre activité par client et par projet',
    shortDesc: 'Chrono par projet',
    icon: 'Timer',
    color: '25 95% 53%',
    route: '/plugins/time-tracker',
    available: false,
    eta: '2026',
    trades: ['freelance', 'commercial', 'services'],
    kpis: [],
  },
  {
    id: 'delivery',
    name: 'Carnet Livraison',
    description: 'Signature client, photo preuve, feuille de route',
    shortDesc: 'Livraisons & tournées',
    icon: 'Package',
    color: '30 85% 50%',
    route: '/plugins/delivery',
    available: false,
    eta: '2026',
    trades: ['transport', 'logistique'],
    kpis: [],
  },
  {
    id: 'checklist',
    name: 'Checklist Sécurité',
    description: 'EPI, sécurité chantier, vérifications quotidiennes',
    shortDesc: 'Sécurité & conformité',
    icon: 'ShieldCheck',
    color: '0 72% 51%',
    route: '/plugins/checklist',
    available: false,
    eta: '2026',
    trades: ['btp'],
    kpis: [],
  },
];

export const ACTIVE_PLUGINS  = PLUGINS.filter(p => p.available);
export const LOCKED_PLUGINS  = PLUGINS.filter(p => !p.available);

// ── Métiers ───────────────────────────────────────────────────
export interface Trade {
  id: string;
  label: string;
  icon: string;
  pluginIds: PluginId[];
}

export const TRADES: Trade[] = [
  {
    id: 'btp',
    label: 'Artisan / BTP',
    icon: '🔨',
    pluginIds: ['report', 'tasks', 'missions', 'quotes', 'vehicle', 'checklist'],
  },
  {
    id: 'services',
    label: 'Services terrain',
    icon: '🛠️',
    pluginIds: ['report', 'tasks', 'missions', 'quotes', 'logbook', 'vehicle'],
  },
  {
    id: 'commercial',
    label: 'Commercial / VRP',
    icon: '💼',
    pluginIds: ['tasks', 'missions', 'quotes', 'crm', 'vehicle', 'logbook'],
  },
  {
    id: 'immobilier',
    label: 'Agent immobilier',
    icon: '🏠',
    pluginIds: ['report', 'tasks', 'missions', 'quotes', 'crm', 'vehicle'],
  },
  {
    id: 'transport',
    label: 'Transport / Logistique',
    icon: '🚚',
    pluginIds: ['vehicle', 'tasks', 'logbook', 'delivery'],
  },
  {
    id: 'freelance',
    label: 'Freelance / Indépendant',
    icon: '💻',
    pluginIds: ['tasks', 'quotes', 'logbook', 'time-tracker', 'expenses'],
  },
  {
    id: 'sante',
    label: 'Santé / Services à la personne',
    icon: '🩺',
    pluginIds: ['tasks', 'logbook', 'booking', 'missions'],
  },
  {
    id: 'autre',
    label: 'Autre',
    icon: '✨',
    pluginIds: ['tasks', 'report', 'quotes'],
  },
];

// ── Rôles utilisateur ─────────────────────────────────────────
export type UserRole = 'user' | 'beta' | 'vip' | 'admin';

// ── Constantes sécurité ───────────────────────────────────────
export const SECURITY = {
  LOGIN_MAX_ATTEMPTS:        10,
  LOGIN_BLOCK_WINDOW_SECS:   120,   // 2 minutes
  LOGIN_BLOCK_DURATION_SECS: 180,   // 3 minutes
  UNLOCK_TOKEN_EXPIRY_SECS:  1800,  // 30 minutes

  AI_RATE_LIMIT_PER_MIN:     20,
  DB_INSERT_RATE_PER_MIN:    100,
  API_RATE_PER_MIN:          500,

  ANTI_PHISHING_MIN_LENGTH:  4,
  ANTI_PHISHING_MAX_LENGTH:  20,

  SESSION_EXPIRY_HOURS:      1,
  REFRESH_TOKEN_DAYS:        30,
} as const;

// ── Constantes business ───────────────────────────────────────
export const BUSINESS = {
  FREE_TRIAL_DAYS:              60,
  FREE_TRIAL_PLUGINS:           3,
  PLUGIN_PRICE_HT:              1,
  PLUGIN_PRICE_TTC:             1.20,
  PRO_PRICE_HT:                 9,
  PRO_PRICE_TTC:                10.80,
  TVA_RATE:                     0.20,
  BETA_MIN_REPORTS_PER_WEEK:    1,
  BETA_MAX_ACTIVE:              50,
  VIP_NOTIFICATION_ALERT:       100,
  ANNIVERSARY_GIFT_AT_YEARS:    1,
  FREE_EXPORT_LIMIT:            1,
} as const;

// ── SWAN — textes de l'assistant ──────────────────────────────
export const SWAN_COPY = {
  greetings: {
    morning:   'Bonjour',
    afternoon: 'Bon après-midi',
    evening:   'Bonsoir',
  },
  welcome: {
    new: (firstName: string) =>
      `Bonjour ${firstName}, je suis SWAN, votre assistant. Je vais vous accompagner pour configurer votre espace en quelques instants. Prêt à commencer ?`,
    returning: (firstName: string) =>
      `Bon retour, ${firstName}.`,
    vip: (firstName: string) =>
      `Bonjour ${firstName}, ravi de vous retrouver.`,
  },
  vipAnnouncement: (firstName: string) =>
    `Au nom de toute l'équipe SWAN HUB, je vous informe que vous venez d'être distingué en tant que membre VIP. Ce statut vous donne accès à l'intégralité de nos outils, sans restriction. Nous vous remercions pour votre confiance et restons à votre entière disposition. Bienvenue dans le cercle.`,
  anniversaryGift: (firstName: string) =>
    `Voilà un an que nous travaillons ensemble, ${firstName}. J'ai pensé à vous : choisissez un outil, il sera à vous à vie, avec mes remerciements.`,
  errors: {
    network:   'Une difficulté technique est survenue. Je réessaie automatiquement.',
    auth:      'Vos identifiants ne semblent pas correspondre. Vérifiez et réessayez.',
    save:      'Un instant, je rencontre une difficulté à enregistrer. Je traite cela.',
  },
  phishing: {
    emailHeader: (code: string) => `Anti-phishing : ${code}`,
    emailFooter: (code: string) =>
      `Ce message contient votre code personnel "${code}". Si ce code ne correspond pas au vôtre, ne cliquez sur aucun lien et signalez-nous à security@swanhub.fr`,
    sms: (code: string) => `[SWAN·HUB] Anti-phishing: ${code}`,
    whatsapp: (code: string) => `🛡️ *Anti-phishing :* \`${code}\``,
  },
} as const;
