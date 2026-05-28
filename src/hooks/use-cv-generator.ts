'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { GeneratedCv, GeneratedCvData, CoverLetterData } from '@/types';
import { toast } from 'sonner';

export function useParseCv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cvFileId, filePath }: { cvFileId: string; filePath: string }) => {
      const res = await fetch('/api/ai/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvFileId, filePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al analizar el CV');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cv-files'] });
      toast.success('CV analizado correctamente');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useGenerateCv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      cvFileId: string;
      job: {
        position: string;
        company: string;
        requirements: string[];
        tech_stack: string[];
        responsibilities: string[];
        description?: string;
      };
      options: {
        tone: 'formal' | 'semiformal';
        highlight_remote: boolean;
        language: 'es' | 'en';
      };
      additional_context?: string;
      confirmed_skills?: { skill: string; level: string }[];
    }): Promise<GeneratedCvData> => {
      const res = await fetch('/api/ai/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al generar el CV');
      return data as GeneratedCvData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['generated-cvs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useGenerateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      cvFileId: string;
      job: {
        position: string;
        company: string;
        requirements: string[];
        tech_stack: string[];
        description?: string;
      };
      options: {
        tone: 'formal' | 'semiformal' | 'dinamico';
        language: 'es' | 'en';
        highlight_remote: boolean;
        immediate_availability: boolean;
      };
    }): Promise<CoverLetterData> => {
      const res = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al generar la carta');
      return data as CoverLetterData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['generated-cvs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useGeneratedCvs() {
  return useQuery({
    queryKey: ['generated-cvs'],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('generated_cvs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as GeneratedCv[];
    },
  });
}
