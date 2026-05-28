'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Reminder, ReminderFormValues } from '@/types';
import { toast } from 'sonner';

export function useReminders() {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('reminders')
        .select('*')
        .order('due_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: ReminderFormValues) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('reminders')
        .insert({
          user_id: user.id,
          title: values.title,
          description: values.description || null,
          due_at: values.due_at,
          application_id: values.application_id || null,
          done: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio creado');
    },
    onError: () => toast.error('Error al crear el recordatorio'),
  });
}

export function useToggleReminder() {
  const qc = useQueryClient();

  return useMutation<void, Error, { id: string; done: boolean }>({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('reminders')
        .update({ done })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ['reminders'] });
      const prev = qc.getQueryData<Reminder[]>(['reminders']);
      qc.setQueryData<Reminder[]>(['reminders'], (old) =>
        old?.map((r) => (r.id === id ? { ...r, done } : r)) ?? []
      );
      return { prev };
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('reminders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio eliminado');
    },
    onError: () => toast.error('Error al eliminar'),
  });
}
