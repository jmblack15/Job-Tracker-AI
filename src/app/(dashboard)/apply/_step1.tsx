'use client';

import { useState } from 'react';
import { AlertCircle, Globe, FileText, Loader2, ChevronRight } from 'lucide-react';
import type { ExtractedJob } from '@/types';

interface Step1Props {
  onComplete: (job: ExtractedJob) => void;
}

const FIELD_LABELS: Partial<Record<keyof ExtractedJob, string>> = {
  position: 'Cargo',
  company: 'Empresa',
  location: 'Ubicación',
  modality: 'Modalidad',
  salary: 'Salario',
  experience_years: 'Años de experiencia',
  contract_type: 'Tipo de contrato',
};

export function Step1({ onComplete }: Step1Props) {
  const [mode, setMode] = useState<'text' | 'url'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedJob | null>(null);

  async function handleExtract() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'text' ? { text } : { url }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'FETCH_FAILED') {
          setError('No se pudo acceder a la URL. Copia y pega el texto de la oferta manualmente.');
          setMode('text');
        } else {
          setError(data.error ?? 'Error al analizar la oferta');
        }
        return;
      }
      setExtracted(data as ExtractedJob);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  const canExtract = mode === 'text' ? text.trim().length > 50 : url.trim().length > 10;

  return (
    <div className="space-y-6">
      {/* Input mode tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setMode('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'text' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          Pegar texto
        </button>
        <button
          onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'url' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="h-4 w-4" />
          URL de la oferta
        </button>
      </div>

      {/* Input */}
      {mode === 'text' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Texto de la oferta de trabajo
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el texto completo de la oferta de trabajo..."
            rows={10}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{text.length} caracteres</p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL de la oferta
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/jobs/..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
          <p className="text-xs text-gray-400 mt-1">
            Algunas plataformas bloquean el acceso. Si falla, pega el texto manualmente.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {!extracted && (
        <button
          onClick={handleExtract}
          disabled={!canExtract || loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178860] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando oferta...
            </>
          ) : (
            'Analizar oferta'
          )}
        </button>
      )}

      {/* Extracted preview */}
      {extracted && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{extracted.position}</h3>
              <p className="text-sm text-gray-600">{extracted.company} · {extracted.location}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-[#1D9E75]/10 text-[#1D9E75] rounded-full font-medium whitespace-nowrap">
              {extracted.modality}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(FIELD_LABELS) as (keyof ExtractedJob)[]).map((k) => {
              const val = extracted[k];
              if (!val) return null;
              return (
                <div key={k}>
                  <p className="text-xs text-gray-400">{FIELD_LABELS[k]}</p>
                  <p className="text-sm text-gray-700">{String(val)}</p>
                </div>
              );
            })}
          </div>

          {extracted.tech_stack.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Tech stack</p>
              <div className="flex flex-wrap gap-1.5">
                {extracted.tech_stack.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {extracted.requirements.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Requisitos</p>
              <ul className="space-y-1">
                {extracted.requirements.map((r, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-[#1D9E75] mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setExtracted(null); setText(''); setUrl(''); }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cambiar oferta
            </button>
            <button
              onClick={() => onComplete(extracted)}
              className="flex items-center gap-2 px-6 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178860] transition-colors"
            >
              Continuar
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
