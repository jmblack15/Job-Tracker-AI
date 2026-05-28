export type ApplicationStatus =
  | 'Aplicado'
  | 'En proceso'
  | 'Entrevista'
  | 'Oferta'
  | 'Rechazado';

export interface Application {
  id: string;
  user_id: string;
  position: string;
  company: string;
  url: string | null;
  status: ApplicationStatus;
  applied_at: string;
  salary_range: string | null;
  location: string | null;
  description: string | null;
}

export interface Note {
  id: string;
  application_id: string;
  content: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  application_id: string | null;
  title: string;
  description: string | null;
  due_at: string;
  done: boolean;
}

export interface CvFile {
  id: string;
  user_id: string;
  name: string;
  path: string;
  size: number;
  created_at: string;
  is_parsed: boolean;
  extracted_content: Record<string, unknown> | null;
}

export interface GeneratedCv {
  id: string;
  user_id: string;
  cv_file_id: string | null;
  position: string;
  company: string;
  type: 'cv' | 'cover_letter';
  language: 'es' | 'en';
  content: Record<string, unknown>;
  created_at: string;
}

// Full Supabase Database schema type
export type Database = {
  public: {
    Tables: {
      applications: {
        Row: Application;
        Insert: Omit<Application, 'id' | 'user_id'>;
        Update: Partial<Omit<Application, 'id' | 'user_id'>>;
        Relationships: [];
      };
      notes: {
        Row: Note;
        Insert: Omit<Note, 'id' | 'created_at'>;
        Update: Partial<Omit<Note, 'id' | 'created_at'>>;
        Relationships: [];
      };
      reminders: {
        Row: Reminder;
        Insert: Omit<Reminder, 'id' | 'user_id'>;
        Update: Partial<Omit<Reminder, 'id' | 'user_id'>>;
        Relationships: [];
      };
      cv_files: {
        Row: CvFile;
        Insert: Omit<CvFile, 'id' | 'user_id' | 'created_at' | 'is_parsed' | 'extracted_content'>;
        Update: Partial<Omit<CvFile, 'id' | 'user_id'>>;
        Relationships: [];
      };
      generated_cvs: {
        Row: GeneratedCv;
        Insert: Omit<GeneratedCv, 'id' | 'user_id' | 'created_at'>;
        Update: Partial<Omit<GeneratedCv, 'id' | 'user_id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
