import type { TutorialStep } from "@/components/TutorialButton";

export interface TutorialContent {
  title: string;
  intro: string;
  simpleSteps: TutorialStep[];
  completeSteps?: TutorialStep[];
  tips?: string[];
}

export const HOME_TUTORIAL: TutorialContent = {
  title: "Aide page principale",
  intro: "Cette page sert de tableau de bord. Elle vous montre ce qui mérite votre attention, puis vous laisse ouvrir l'outil utile.",
  simpleSteps: [
    { icon: "1", title: "Regardez le brief", text: "La zone À surveiller résume les tâches, factures et missions importantes du moment." },
    { icon: "2", title: "Ouvrez un outil", text: "Touchez Rapport, Tâches, Devis ou un autre outil pour travailler directement." },
    { icon: "3", title: "Reprenez où vous étiez", text: "L'activité récente permet de retrouver les derniers éléments sans chercher." },
  ],
  completeSteps: [
    { icon: "Aa", title: "Ajustez le confort", text: "Le bouton Aa grossit ou réduit le texte dans toute l'app." },
    { icon: "☀", title: "Changez l'affichage", text: "Le bouton soleil/lune passe du mode clair au mode sombre selon votre environnement." },
    { icon: "!", title: "Signalez un souci", text: "Le bouton Feedback en bas à droite sert à envoyer une idée ou un problème d'app." },
  ],
  tips: [
    "Sur mobile, commencez toujours par le brief puis ouvrez un seul outil à la fois.",
    "Si le texte est trop petit sur iPhone, utilisez Aa avant d'aller plus loin.",
  ],
};

export const TOOL_TUTORIALS = {
  report: {
    title: "Aide Rapport Terrain",
    intro: "L'outil sert à garder une trace claire d'une visite, d'un chantier, d'un contrôle ou d'un incident.",
    simpleSteps: [
      { icon: "1", title: "Titre", text: "Donnez un nom court au rapport : chantier, client, problème ou intervention." },
      { icon: "2", title: "Lieu et contenu", text: "Ajoutez le lieu puis décrivez les faits avec vos mots. Une phrase suffit si vous êtes pressé." },
      { icon: "3", title: "Enregistrer", text: "Touchez Enregistrer le rapport. Il sera retrouvé dans l'historique." },
    ],
    completeSteps: [
      { icon: "📁", title: "Dossiers", text: "Classez vos rapports par chantier, client, véhicule ou type d'intervention." },
      { icon: "●", title: "Couleurs", text: "Choisissez une couleur pour repérer immédiatement le type de rapport." },
      { icon: "📷", title: "Photos annotées", text: "Ajoutez une photo, marquez une date ou un texte dessus, puis enregistrez : le marquage est gardé." },
      { icon: "IA", title: "Résumé IA", text: "Utilisez le résumé IA pour transformer vos notes en compte-rendu plus propre." },
    ],
    tips: ["Sur le terrain : titre, photo, une phrase, enregistrer. Vous pourrez compléter après."],
  },
  tasks: {
    title: "Aide Tâches",
    intro: "L'outil sert à ne rien oublier : travaux à faire, appels, relances, achats, contrôles.",
    simpleSteps: [
      { icon: "1", title: "Ajoutez une tâche", text: "Touchez +, écrivez l'action à faire, puis validez." },
      { icon: "2", title: "Priorité", text: "Choisissez basse, moyenne, haute ou urgente pour voir ce qui passe avant le reste." },
      { icon: "3", title: "Terminé", text: "Cochez la tâche dès qu'elle est faite. Elle sort de votre liste active." },
    ],
    completeSteps: [
      { icon: "📍", title: "Lieu", text: "Ajoutez un lieu si la tâche dépend d'un chantier, client ou dépôt." },
      { icon: "⏱", title: "Date limite", text: "Ajoutez une date et une heure pour être alerté visuellement avant le retard." },
      { icon: "↗", title: "Partager", text: "Envoyez une tâche par SMS, email ou WhatsApp à un collègue ou client." },
    ],
    tips: ["Une bonne tâche commence par un verbe : appeler, acheter, contrôler, envoyer."],
  },
  missions: {
    title: "Aide Missions",
    intro: "L'outil sert à suivre une mission ou un chantier de bout en bout, sans tableau compliqué.",
    simpleSteps: [
      { icon: "1", title: "Titre", text: "Nommez la mission avec le client ou le chantier." },
      { icon: "2", title: "Client", text: "Indiquez le client. C'est suffisant pour créer une mission rapide." },
      { icon: "3", title: "Statut", text: "Mettez Actif, Pause ou Terminé pour savoir où vous en êtes." },
    ],
    completeSteps: [
      { icon: "📍", title: "Adresse", text: "Ajoutez le lieu pour retrouver vite où intervenir." },
      { icon: "📅", title: "Dates", text: "Ajoutez début et fin pour suivre les délais." },
      { icon: "🗒", title: "Notes", text: "Gardez les infos client, accès, consignes ou détails importants." },
      { icon: "ICS", title: "Calendrier", text: "Exportez une mission vers le calendrier quand vous voulez bloquer une date." },
    ],
    tips: ["Utilisez une mission par chantier ou client important, pas par petite tâche."],
  },
  quotes: {
    title: "Aide Devis & Factures",
    intro: "L'outil sert à créer, suivre et partager vos devis, factures, paiements et clients.",
    simpleSteps: [
      { icon: "1", title: "Choisissez l'onglet", text: "Devis, Factures, Paiements ou Clients selon ce que vous voulez faire." },
      { icon: "2", title: "Créez", text: "Touchez +, remplissez le client, le titre et le montant." },
      { icon: "3", title: "Suivez le statut", text: "Passez de Brouillon à Envoyé, Accepté ou Payé pour garder le suivi clair." },
    ],
    completeSteps: [
      { icon: "PDF", title: "Exporter", text: "Téléchargez un document propre en PDF pour l'envoyer ou l'archiver." },
      { icon: "↗", title: "Partager", text: "Envoyez le devis ou la facture au client depuis l'app." },
      { icon: "€", title: "Paiements", text: "Notez les encaissements pour voir ce qui est payé ou en attente." },
      { icon: "⚙", title: "Réglages", text: "Complétez vos informations d'entreprise pour des documents plus professionnels." },
    ],
    tips: ["Pour aller vite : client, titre, montant, statut. Les détails se complètent ensuite."],
  },
  logbook: {
    title: "Aide Journal de bord",
    intro: "L'outil sert à noter ce qui s'est passé dans la journée : décision, incident, appel, observation.",
    simpleSteps: [
      { icon: "1", title: "Ajoutez une note", text: "Touchez + et écrivez l'information importante." },
      { icon: "2", title: "Validez", text: "Enregistrez. La note est datée automatiquement." },
      { icon: "3", title: "Retrouvez", text: "Utilisez la recherche ou les filtres pour retrouver une note plus tard." },
    ],
    completeSteps: [
      { icon: "✓", title: "Sélection", text: "Sélectionnez plusieurs notes pour les traiter ensemble." },
      { icon: "↗", title: "Partager", text: "Envoyez une note à un client, collègue ou partenaire." },
      { icon: "PDF", title: "Export", text: "Générez un PDF pour archiver ou transmettre le journal." },
      { icon: "🗄", title: "Archives", text: "Archivez ce qui est terminé sans le supprimer." },
    ],
    tips: ["Le journal est idéal pour garder une preuve simple, datée et lisible."],
  },
  vehicle: {
    title: "Aide Carnet de véhicule",
    intro: "L'outil sert à suivre véhicules, trajets, conducteurs et frais kilométriques.",
    simpleSteps: [
      { icon: "1", title: "Choisissez un onglet", text: "Trajets, Véhicules, Conducteurs ou Routes fréquentes." },
      { icon: "2", title: "Touchez +", text: "Ajoutez l'élément qui correspond à l'onglet ouvert." },
      { icon: "3", title: "Enregistrez", text: "Les infos restent disponibles pour vos suivis et frais." },
    ],
    completeSteps: [
      { icon: "🚗", title: "Véhicules", text: "Créez vos véhicules avec immatriculation, modèle et kilométrage." },
      { icon: "👤", title: "Conducteurs", text: "Associez un conducteur à un véhicule si plusieurs personnes l'utilisent." },
      { icon: "↔", title: "Routes fréquentes", text: "Préparez vos trajets habituels pour gagner du temps." },
      { icon: "€", title: "Frais km", text: "Gardez une base propre pour vos kilomètres professionnels." },
    ],
    tips: ["Créez d'abord le véhicule, puis les trajets. C'est plus simple au quotidien."],
  },
} satisfies Record<string, TutorialContent>;
