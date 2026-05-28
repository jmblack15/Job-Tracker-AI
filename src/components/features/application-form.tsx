'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { APPLICATION_STATUSES } from '@/lib/constants';
import type { Application, ApplicationFormValues } from '@/types';

const schema = z.object({
  position: z.string().min(1, 'Requerido'),
  company: z.string().min(1, 'Requerido'),
  url: z.string().url('URL inválida').or(z.literal('')),
  status: z.enum(['Aplicado', 'En proceso', 'Entrevista', 'Oferta', 'Rechazado']),
  applied_at: z.string().min(1, 'Requerido'),
  salary_range: z.string(),
  location: z.string(),
  description: z.string(),
});

const statusOptions = APPLICATION_STATUSES.map((s) => ({ value: s, label: s }));

interface Props {
  initial?: Application;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ApplicationForm({ initial, onSubmit, onCancel, loading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      position: initial?.position ?? '',
      company: initial?.company ?? '',
      url: initial?.url ?? '',
      status: initial?.status ?? 'Aplicado',
      applied_at: initial?.applied_at
        ? format(new Date(initial.applied_at), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      salary_range: initial?.salary_range ?? '',
      location: initial?.location ?? '',
      description: initial?.description ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input id="position" label="Cargo *" error={errors.position?.message} {...register('position')} />
        <Input id="company" label="Empresa *" error={errors.company?.message} {...register('company')} />
      </div>
      <Input id="url" label="URL de la oferta" type="url" placeholder="https://" error={errors.url?.message} {...register('url')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          id="status"
          label="Estado"
          options={statusOptions}
          error={errors.status?.message}
          {...register('status')}
        />
        <Input id="applied_at" label="Fecha de aplicación *" type="date" error={errors.applied_at?.message} {...register('applied_at')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input id="salary_range" label="Rango salarial" placeholder="Ej: $30,000 - $40,000" {...register('salary_range')} />
        <Input id="location" label="Ubicación" placeholder="Ciudad, País o Remoto" {...register('location')} />
      </div>
      <Textarea id="description" label="Descripción" rows={3} placeholder="Notas sobre la oferta..." {...register('description')} />

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {initial ? 'Guardar cambios' : 'Crear aplicación'}
        </Button>
      </div>
    </form>
  );
}
