export type { Application, Note, Reminder, CvFile, GeneratedCv, ApplicationStatus, Database } from './database';

export type GenerateMode = 'cover-letter' | 'cv-profile' | 'linkedin-summary' | 'interview-questions' | 'tips';

export interface MetricCard {
  label: string;
  value: number | string;
  description?: string;
}

export interface ApplicationFormValues {
  position: string;
  company: string;
  url: string;
  status: import('./database').ApplicationStatus;
  applied_at: string;
  salary_range: string;
  location: string;
  description: string;
}

export interface ReminderFormValues {
  title: string;
  description: string;
  due_at: string;
  application_id: string;
}

// ─── Job Search ───────────────────────────────────────────────────────────────

export interface Job {
  title: string;
  company: string;
  location: string;
  modality: 'Remoto' | 'Híbrido' | 'Presencial' | string;
  salary: string | null;
  description: string;
  url: string | null;
  platform: string;
  posted_at: string | null;
}

export interface JobSearchResult {
  jobs: Job[];
  tips: string[];
  summary: {
    total: number;
    platforms_found: string[];
    platforms_not_found: string[];
  };
}

// ─── Apply Wizard ─────────────────────────────────────────────────────────────

export interface ExtractedJob {
  position: string;
  company: string;
  location: string;
  modality: 'Remoto' | 'Híbrido' | 'Presencial' | string;
  salary: string | null;
  requirements: string[];
  nice_to_have: string[];
  responsibilities: string[];
  contract_type: string | null;
  experience_years: string | null;
  tech_stack: string[];
  raw_text: string;
  // enriched by frontend
  url?: string;
  platform?: string;
}

export interface UserProfile {
  cvFileId: string;
  tone: 'formal' | 'semiformal' | 'dinamico';
  language: 'es' | 'en';
  highlight_remote: boolean;
  immediate_availability: boolean;
}

export interface CvProfileContent {
  summary: string;
  experience_bullets: string[];
  skills: string[];
}

export interface EmailContent {
  subject: string;
  body: string;
}

export interface GenerateAllResult {
  cv_profile: CvProfileContent | null;
  cover_letter: string | null;
  email: EmailContent | null;
  match: MatchAnalysis | null;
}

export interface MatchCategory {
  score: number;
  weight: number;
  matched?: string[];
  missing?: string[];
  years_required?: string;
  years_candidate?: string;
  details: string;
}

export interface MatchRecommendation {
  priority: 'alta' | 'media' | 'baja';
  category: 'tech_stack' | 'experience' | 'keywords' | 'formato' | 'logros';
  action: string;
  impact: string;
  example: string | null;
}

export interface MatchAnalysis {
  overall_score: number;
  categories: {
    tech_stack: MatchCategory;
    experience: MatchCategory;
    role_alignment: MatchCategory;
    education: MatchCategory;
    soft_skills: MatchCategory;
  };
  level: 'Alto' | 'Medio' | 'Bajo';
  ats_keywords: {
    found: string[];
    missing: string[];
  };
  recommendations: MatchRecommendation[];
  strengths: string[];
  summary: string;
}

// ─── CV Generator ─────────────────────────────────────────────────────────────

export interface ParsedCvContent {
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  location: string | null;
  summary: string | null;
  experience: Array<{
    company: string;
    position: string;
    start_date: string;
    end_date: string | null;
    current: boolean;
    location: string | null;
    responsibilities: string[];
    achievements: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string | null;
    start_date: string;
    end_date: string | null;
    gpa: string | null;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date: string | null;
    url: string | null;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url: string | null;
  }>;
}

export interface GeneratedCvData {
  personal_info: {
    full_name: string;
    email: string;
    phone: string;
    linkedin: string;
    location: string;
  };
  professional_summary: string;
  experience: Array<{
    company: string;
    position: string;
    period: string;
    location: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    period: string;
    details: string | null;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string;
  }>;
  keywords_integrated: string[];
}

export interface CoverLetterData {
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  signature: string;
}
