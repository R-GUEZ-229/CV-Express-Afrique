
export type AppStep = 'landing' | 'auth' | 'context' | 'personal' | 'experience' | 'payment' | 'result' | 'tarifs' | 'aide' | 'mes-cv' | 'unlock' | 'admin-login' | 'admin-dashboard';

export interface UserData {
  country: string;
  job: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  education: string;
  experience: string;
  skills: string;
  bio: string;
  languages?: string;
  hobbies?: string;
  linkedin?: string;
  tone?: 'professional' | 'creative' | 'direct';
}

export type PaymentStatus = 'unpaid' | 'pending' | 'approved' | 'rejected';

export interface GeneratedContent {
  id: string;
  date: string;
  userData: UserData;
  cv: string;
  letter: string;
  paid: boolean;
  status: PaymentStatus;
  template: CVTemplate;
  unlockCode?: string;
  unlockTimestamp?: number;
  transactionRef?: string;
  paymentPhone?: string;
  ownerEmail?: string;
}

export type CVTemplate = 'classic' | 'modern' | 'creative' | 'executive' | 'minimalist' | 'startup';

export enum Country {
  BENIN = 'Bénin',
  CIV = 'Côte d’Ivoire',
  SENEGAL = 'Sénégal',
  TOGO = 'Togo',
  CAMEROUN = 'Cameroun',
  GABON = 'Gabon',
  BURKINA = 'Burkina Faso',
  MALI = 'Mali',
  NIGER = 'Niger',
  GUINEE = 'Guinée',
  CONGO = 'Congo',
  RDC = 'RDC',
  MAROC = 'Maroc',
  ALGERIE = 'Algérie',
  TUNISIE = 'Tunisie'
}

export const COUNTRIES = Object.values(Country);

export const COMMON_JOBS = [
  'Étudiant / Stagiaire',
  'Comptable / Finance',
  'Commercial / Vendeur',
  'Informaticien / Développeur',
  'Agent Administratif',
  'Infirmier / Santé',
  'Enseignant / Éducation',
  'Chauffeur / Logistique',
  'Gestionnaire de projet',
  'Ingénieur',
  'Technicien',
  'Hôtellerie / Restauration',
  'Marketing / Communication',
  'Ressources Humaines',
  'Design / Création'
];
