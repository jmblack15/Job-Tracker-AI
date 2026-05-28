'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Application, ApplicationFormValues, ApplicationStatus } from '@/types';
import { toast } from 'sonner';

export function useApplications(filters?: { status?: ApplicationStatus; search?: string }) {
  return useQuery({
    queryKey: ['applications', filters],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('applications')
        .select('*')
        .order('applied_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(
          `position.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Application[];
    },
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Application;
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: ApplicationFormValues) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('applications')
        .insert({
          user_id: user.id,
          position: values.position,
          company: values.company,
          url: values.url || null,
          status: values.status,
          applied_at: values.applied_at,
          salary_range: values.salary_range || null,
          location: values.location || null,
          description: values.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Application;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Aplicación creada');
    },
    onError: () => toast.error('Error al crear la aplicación'),
  });
}

type UpdateApplicationVars = Partial<ApplicationFormValues> & { id: string };

export function useUpdateApplication() {
  const qc = useQueryClient();

  return useMutation<Application, Error, UpdateApplicationVars>({
    mutationFn: async ({ id, ...values }: UpdateApplicationVars) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('applications')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Application;
    },
    onMutate: async ({ id, status }) => {
      if (!status) return;
      await qc.cancelQueries({ queryKey: ['applications'] });
      const prev = qc.getQueryData<Application[]>(['applications']);
      qc.setQueryData<Application[]>(['applications'], (old) =>
        old?.map((a) => (a.id === id ? { ...a, status } : a)) ?? []
      );
      return { prev };
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
    onSuccess: (_data: Application, vars: UpdateApplicationVars) => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application', vars.id] });
      toast.success('Actualizado');
    },
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('applications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Aplicación eliminada');
    },
    onError: () => toast.error('Error al eliminar'),
  });
}
