'use client';

import { useState } from 'react';
import { ExternalLink, Bookmark, BookmarkCheck, Lightbulb, MapPin, DollarSign, Clock, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCreateApplication } from '@/hooks/use-applications';
import { Skeleton } from '@/components/ui/skeleton';
import type { Job, JobSearchResult } from '@/types';

// ─── Platform colors ─────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  LinkedIn:     'bg-blue-50 text-blue-700 border border-blue-200',
  Indeed:       'bg-purple-50 text-purple-700 border border-purple-200',
  Computrabajo: 'bg-orange-50 text-orange-700 border border-orange-200',
  Glassdoor:    'bg-green-50 text-green-700 border border-green-200',
  Bumeran:      'bg-red-50 text-red-700 border border-red-200',
  OCCMundial:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
};

const MODALITY_COLORS: Record<string, string> = {
  Remoto:     'bg-green-100 text-green-700',
  Híbrido:    'bg-yellow-100 text-yellow-700',
  Presencial: 'bg-gray-100 text-gray-600',
};

function platformClass(platform: string) {
  return PLATFORM_COLORS[platform] ?? 'bg-gray-50 text-gray-700 border border-gray-200';
}

function modalityClass(modality: string) {
  return MODALITY_COLORS[modality] ?? 'bg-gray-100 text-gray-600';
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex justify-between pt-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const [saved, setSaved] = useState(false);
  const createApplication = useCreateApplication();

  async function handleSave() {
    if (saved) return;
    await createApplication.mutateAsync({
      position: job.title,
      company: job.company,
      location: job.location ?? '',
      url: job.url ?? '',
      status: 'Aplicado',
      applied_at: format(new Date(), 'yyyy-MM-dd'),
      salary_range: job.salary ?? '',
      description: job.description ?? '',
    });
    setSaved(true);
    toast.success('Oferta guardada en tu tracker');
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-[#1D9E75]/40 hover:shadow-sm transition-all">
      {/* Top row: platform + modality */}
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${platformClass(job.platform)}`}>
          {job.platform}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${modalityClass(job.modality)}`}>
          {job.modality}
        </span>
      </div>

      {/* Title & company */}
      <div>
        <h3 className="font-semibold text-gray-900 leading-snug">{job.title}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
          <span>{job.company}</span>
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {job.location}
            </span>
          )}
        </div>
      </div>

      {/* Salary */}
      {job.salary && (
        <span className="flex items-center gap-1 text-sm font-medium text-[#1D9E75]">
          <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
          {job.salary}
        </span>
      )}

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>

      {/* Bottom row: posted_at + actions */}
      <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          {job.posted_at && (
            <>
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              {job.posted_at}
            </>
          )}
        </span>

        <div className="flex items-center gap-2">
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saved || createApplication.isPending}
            title={saved ? 'Guardada en el tracker' : 'Guardar en el tracker'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              saved
                ? 'border-[#1D9E75]/30 bg-[#1D9E75]/5 text-[#1D9E75] cursor-default'
                : 'border-gray-200 text-gray-500 hover:border-[#1D9E75]/50 hover:text-[#1D9E75] hover:bg-[#1D9E75]/5'
            }`}
          >
            {saved ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            {saved ? 'Guardada' : 'Guardar'}
          </button>

          {/* Ver oferta button */}
          {job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1D9E75] text-white hover:bg-[#178a64] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver oferta
            </a>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
              <ExternalLink className="h-3.5 w-3.5" />
              Sin enlace
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tips ────────────────────────────────────────────────────────────────────

const TIP_ICONS = [Lightbulb, Lightbulb, Lightbulb];

function TipsSection({ tips }: { tips: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Consejos para tu búsqueda</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tips.map((tip, i) => {
          const Icon = TIP_ICONS[i] ?? Lightbulb;
          return (
            <div key={i} className="bg-[#1D9E75]/5 border border-[#1D9E75]/15 rounded-xl p-4 flex gap-3">
              <div className="h-7 w-7 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-[#1D9E75]" />
              </div>
              <p className="text-sm text-gray-700 leading-snug">{tip}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SearchResultsProps {
  result: JobSearchResult | null;
  fallback?: string;
}

export function SearchResults({ result, fallback }: SearchResultsProps) {
  // Fallback: JSON parse failed, show plain text
  if (!result && fallback) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Resultados</h2>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{fallback}</p>
      </div>
    );
  }

  if (!result) return null;

  const { jobs, tips, summary } = result;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{summary.total} oferta{summary.total !== 1 ? 's' : ''} encontrada{summary.total !== 1 ? 's' : ''}</span>
        {summary.platforms_found.length > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span>en {summary.platforms_found.join(', ')}</span>
          </>
        )}
        {summary.platforms_not_found.length > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">Sin resultados en {summary.platforms_not_found.join(', ')}</span>
          </>
        )}
      </div>

      {/* Job cards grid */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <SearchX className="h-10 w-10 opacity-40" />
          <p className="text-sm">No se encontraron ofertas para esta búsqueda.</p>
          <p className="text-xs">Prueba con otros términos o plataformas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job, i) => (
            <JobCard key={i} job={job} />
          ))}
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && <TipsSection tips={tips} />}
    </div>
  );
}
