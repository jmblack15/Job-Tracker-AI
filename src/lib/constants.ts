import type { ApplicationStatus } from '@/types';

export const AI_MODEL = 'claude-haiku-4-5';
export const AI_MAX_TOKENS = 2000;

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Aplicado',
  'En proceso',
  'Entrevista',
  'Oferta',
  'Rechazado',
];

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Aplicado: 'bg-blue-100 text-blue-800',
  'En proceso': 'bg-yellow-100 text-yellow-800',
  Entrevista: 'bg-purple-100 text-purple-800',
  Oferta: 'bg-green-100 text-green-800',
  Rechazado: 'bg-red-100 text-red-800',
};

export const STATUS_DOT_COLORS: Record<ApplicationStatus, string> = {
  Aplicado: 'bg-blue-500',
  'En proceso': 'bg-yellow-500',
  Entrevista: 'bg-purple-500',
  Oferta: 'bg-green-500',
  Rechazado: 'bg-red-500',
};

export const PIE_COLORS: Record<ApplicationStatus, string> = {
  Aplicado: '#3B82F6',
  'En proceso': '#F59E0B',
  Entrevista: '#8B5CF6',
  Oferta: '#10B981',
  Rechazado: '#EF4444',
};

export const STATUS_TIMELINE: ApplicationStatus[] = [
  'Aplicado',
  'En proceso',
  'Entrevista',
  'Oferta',
];

export const TEAL = '#1D9E75';
