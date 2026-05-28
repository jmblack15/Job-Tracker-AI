'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, MapPin, ExternalLink } from 'lucide-react';
import { useApplications, useCreateApplication, useUpdateApplication, useDeleteApplication } from '@/hooks/use-applications';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { ApplicationForm } from '@/components/features/application-form';
import { APPLICATION_STATUSES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { Application, ApplicationStatus, ApplicationFormValues } from '@/types';

export default function ApplicationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Application | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: applications = [], isLoading } = useApplications({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  });

  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication();
  const deleteApplication = useDeleteApplication();

  async function handleCreate(values: ApplicationFormValues) {
    await createApplication.mutateAsync(values);
    setShowModal(false);
  }

  async function handleEdit(values: ApplicationFormValues) {
    if (!editTarget) return;
    await updateApplication.mutateAsync({ id: editTarget.id, ...values });
    setEditTarget(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aplicaciones</h1>
          <p className="text-sm text-gray-500 mt-1">{applications.length} en total</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Nueva aplicación
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            placeholder="Buscar cargo o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === '' ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {APPLICATION_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cargo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Ubicación</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No hay aplicaciones. ¡Agrega tu primera!
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <ApplicationRow
                    key={app.id}
                    app={app}
                    onEdit={() => setEditTarget(app)}
                    onDelete={() => deleteApplication.mutate(app.id)}
                    onStatusChange={(status) => updateApplication.mutate({ id: app.id, status })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva aplicación" className="max-w-2xl">
        <ApplicationForm
          onSubmit={handleCreate}
          onCancel={() => setShowModal(false)}
          loading={createApplication.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar aplicación" className="max-w-2xl">
        {editTarget && (
          <ApplicationForm
            initial={editTarget}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={updateApplication.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function ApplicationRow({
  app,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  app: Application;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: ApplicationStatus) => void;
}) {
  const statusOptions = APPLICATION_STATUSES.map((s) => ({ value: s, label: s }));

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Link href={`/applications/${app.id}`} className="font-medium text-gray-900 hover:text-[#1D9E75]">
            {app.position}
          </Link>
          {app.url && (
            <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1D9E75]">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600">{app.company}</td>
      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
        {app.location ? (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {app.location}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(app.applied_at)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={app.status}
            onChange={(e) => onStatusChange(e.target.value as ApplicationStatus)}
            className="text-xs rounded-md border border-gray-200 bg-white py-1 px-2 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="text-xs text-gray-500 hover:text-[#1D9E75] transition-colors font-medium">
            Editar
          </button>
          <button onClick={onDelete} className="text-xs text-gray-500 hover:text-red-600 transition-colors font-medium">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}
