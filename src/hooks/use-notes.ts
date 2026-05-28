'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Note } from '@/types';
import { toast } from 'sonner';

export function useNotes(applicationId: string) {
  return useQuery({
    queryKey: ['notes', applicationId],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('notes')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, content }: { applicationId: string; content: string }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('notes')
        .insert({ user_id: user.id, application_id: applicationId, content })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (_data: Note, { applicationId }: { applicationId: string; content: string }) => {
      qc.invalidateQueries({ queryKey: ['notes', applicationId] });
    },
    onError: () => toast.error('Error al guardar la nota'),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, applicationId }: { id: string; applicationId: string }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('notes').delete().eq('id', id);
      if (error) throw error;
      return applicationId;
    },
    onSuccess: (applicationId: string) => {
      qc.invalidateQueries({ queryKey: ['notes', applicationId] });
    },
    onError: () => toast.error('Error al eliminar la nota'),
  });
}
