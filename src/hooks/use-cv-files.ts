'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { CvFile } from '@/types';
import { toast } from 'sonner';

export function useCvFiles() {
  return useQuery({
    queryKey: ['cv-files'],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cv_files')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CvFile[];
    },
  });
}

export function useUploadCv() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<{ id: string; path: string }> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const path = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(path, file);
      if (uploadError) throw uploadError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbError } = await (supabase as any)
        .from('cv_files')
        .insert({ user_id: user.id, name: file.name, path, size: file.size })
        .select('id, path')
        .single();
      if (dbError) throw dbError;

      return { id: data.id as string, path: data.path as string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cv-files'] });
    },
    onError: () => toast.error('Error al subir el CV'),
  });
}

export function useDeleteCv() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      const supabase = createClient();
      const { error: storageError } = await supabase.storage
        .from('cvs')
        .remove([path]);
      if (storageError) throw storageError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any).from('cv_files').delete().eq('id', id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cv-files'] });
      toast.success('CV eliminado');
    },
    onError: () => toast.error('Error al eliminar el CV'),
  });
}
