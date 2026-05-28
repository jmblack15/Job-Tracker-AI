'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { differenceInDays, isToday, isTomorrow, isPast, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReminders, useCreateReminder, useToggleReminder, useDeleteReminder } from '@/hooks/use-reminders';
import { useApplications } from '@/hooks/use-applications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { GenericBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import type { Reminder, ReminderFormValues } from '@/types';

const schema = z.object({
  title: z.string().min(1, 'Requerido'),
  description: z.string(),
  due_at: z.string().min(1, 'Requerido'),
  application_id: z.string(),
});

function getUrgencyBadge(due_at: string) {
  const date = new Date(due_at);
  if (isPast(date) && !isToday(date)) return { label: 'Vencido', variant: 'danger' as const };
  if (isToday(date)) return { label: 'Hoy', variant: 'warning' as const };
  if (isTomorrow(date)) return { label: 'Mañana', variant: 'warning' as const };
  return null;
}

export default function RemindersPage() {
  const [showModal, setShowModal] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const { data: reminders = [], isLoading } = useReminders();
  const { data: applications = [] } = useApplications();
  const createReminder = useCreateReminder();
  const toggleReminder = useToggleReminder();
  const deleteReminder = useDeleteReminder();

  const pending = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);

  const appOptions = [
    { value: '', label: 'Sin aplicación' },
    ...applications.map((a) => ({ value: a.id, label: `${a.position} — ${a.company}` })),
  ];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReminderFormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ReminderFormValues) {
    await createReminder.mutateAsync(values);
    reset();
    setShowModal(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recordatorios</h1>
          <p className="text-sm text-gray-500 mt-1">{pending.length} pendientes</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {/* Pending */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : pending.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tienes recordatorios pendientes</p>
          </div>
        ) : (
          pending.map((r) => <ReminderItem key={r.id} reminder={r} onToggle={toggleReminder.mutate} onDelete={deleteReminder.mutate} applications={applications} />)
        )}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            {showDone ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Completados ({done.length})
          </button>
          {showDone && (
            <div className="mt-2 space-y-2">
              {done.map((r) => (
                <ReminderItem key={r.id} reminder={r} onToggle={toggleReminder.mutate} onDelete={deleteReminder.mutate} applications={applications} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo recordatorio">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input id="title" label="Título *" error={errors.title?.message} {...register('title')} />
          <Textarea id="description" label="Descripción" rows={2} {...register('description')} />
          <Input id="due_at" label="Fecha y hora *" type="datetime-local" error={errors.due_at?.message} {...register('due_at')} />
          <Select
            id="application_id"
            label="Aplicación asociada"
            options={appOptions}
            {...register('application_id')}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={createReminder.isPending}>Crear</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ReminderItem({
  reminder,
  onToggle,
  onDelete,
  applications,
}: {
  reminder: Reminder;
  onToggle: (args: { id: string; done: boolean }) => void;
  onDelete: (id: string) => void;
  applications: { id: string; position: string; company: string }[];
}) {
  const urgency = getUrgencyBadge(reminder.due_at);
  const app = applications.find((a) => a.id === reminder.application_id);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
        reminder.done ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-white hover:border-[#1D9E75]/30'
      }`}
    >
      <input
        type="checkbox"
        checked={reminder.done}
        onChange={() => onToggle({ id: reminder.id, done: !reminder.done })}
        className="mt-0.5 h-4 w-4 rounded accent-[#1D9E75] cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium text-gray-900 ${reminder.done ? 'line-through' : ''}`}>
            {reminder.title}
          </p>
          {urgency && !reminder.done && (
            <GenericBadge label={urgency.label} variant={urgency.variant} />
          )}
        </div>
        {reminder.description && (
          <p className="text-xs text-gray-500 mt-0.5">{reminder.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span>{format(new Date(reminder.due_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}</span>
          {app && <span>· {app.position} @ {app.company}</span>}
        </div>
      </div>
      <button
        onClick={() => onDelete(reminder.id)}
        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
