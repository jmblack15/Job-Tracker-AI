'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Loader2, FileText, Check, Upload, Sparkles, AlertCircle } from 'lucide-react';
import type { ExtractedJob, UserProfile, ParsedCvContent } from '@/types';
import type { CvFile } from '@/types';
import { useCvFiles, useUploadCv } from '@/hooks/use-cv-files';
import { useParseCv } from '@/hooks/use-cv-generator';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Step2Props {
  job: ExtractedJob;
  onBack: () => void;
  onComplete: (profile: UserProfile) => void;
}

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal y profesional' },
  { value: 'semiformal', label: 'Semiformal y amigable' },
  { value: 'dinamico', label: 'Dinámico y directo' },
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
] as const;

function getTopSkills(cv: CvFile): string {
  if (!cv.extracted_content) return '';
  const content = cv.extracted_content as unknown as ParsedCvContent;
  return (content.skills?.technical ?? []).slice(0, 5).join(', ');
}

function getLatestRole(cv: CvFile): string {
  if (!cv.extracted_content) return '';
  const content = cv.extracted_content as unknown as ParsedCvContent;
  const exp = content.experience?.[0];
  if (!exp) return '';
  return `${exp.position} · ${exp.company}`;
}

// ─── Upload zone (no CVs at all) ──────────────────────────────────────────────
function UploadZone({ onUploaded }: { onUploaded: (id: string) => void }) {
  const uploadCv = useUploadCv();
  const parseCv = useParseCv();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing'>('idle');

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se aceptan archivos PDF');
      return;
    }
    setStatus('uploading');
    try {
      const { id, path } = await uploadCv.mutateAsync(file);
      setStatus('analyzing');
      toast.loading('Analizando tu CV, esto puede tardar unos segundos...', { id: 'cv-analyze' });
      await parseCv.mutateAsync({ cvFileId: id, filePath: path });
      toast.success('CV analizado y listo', { id: 'cv-analyze' });
      onUploaded(id);
    } catch {
      toast.dismiss('cv-analyze');
      setStatus('idle');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        No tienes CVs subidos aún. Sube tu CV en PDF para continuar.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => status === 'idle' && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-[#1D9E75] bg-[#1D9E75]/5'
            : status !== 'idle'
            ? 'border-gray-200 bg-gray-50 cursor-default'
            : 'border-gray-300 hover:border-[#1D9E75] hover:bg-[#1D9E75]/3'
        }`}
      >
        {status === 'idle' ? (
          <>
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Arrastra tu CV aquí o <span className="text-[#1D9E75]">haz click para seleccionar</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Solo PDF</p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
            <p className="text-sm font-medium text-gray-700">
              {status === 'uploading' ? 'Subiendo CV...' : 'Extrayendo información de tu CV...'}
            </p>
            <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1D9E75] rounded-full transition-all duration-500"
                style={{ width: status === 'uploading' ? '40%' : '85%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analyze section (CVs uploaded but none parsed) ───────────────────────────
function AnalyzeSection({
  cvFiles,
  onAnalyzed,
}: {
  cvFiles: CvFile[];
  onAnalyzed: (id: string) => void;
}) {
  const parseCv = useParseCv();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  async function handleAnalyze(cv: CvFile) {
    setAnalyzingId(cv.id);
    toast.loading('Analizando tu CV, esto puede tardar unos segundos...', { id: 'cv-analyze' });
    try {
      await parseCv.mutateAsync({ cvFileId: cv.id, filePath: cv.path });
      toast.success('CV analizado y listo', { id: 'cv-analyze' });
      onAnalyzed(cv.id);
    } catch {
      toast.dismiss('cv-analyze');
    } finally {
      setAnalyzingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          Tienes CVs subidos pero no están analizados aún. Analiza uno para continuar.
        </p>
      </div>
      {cvFiles.map((cv) => (
        <div
          key={cv.id}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{cv.name}</p>
              <p className="text-xs text-gray-400">{formatDate(cv.created_at)}</p>
            </div>
          </div>
          <button
            onClick={() => handleAnalyze(cv)}
            disabled={analyzingId !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1D9E75] text-white rounded-lg hover:bg-[#178860] disabled:opacity-50 transition-colors shrink-0 ml-3"
          >
            {analyzingId === cv.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {analyzingId === cv.id ? 'Analizando...' : 'Analizar ahora'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── CV card grid (has parsed CVs) ────────────────────────────────────────────
function CvCardGrid({
  parsedCvs,
  selectedId,
  onSelect,
}: {
  parsedCvs: CvFile[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const uploadCv = useUploadCv();
  const parseCv = useParseCv();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleNewCv(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se aceptan archivos PDF');
      return;
    }
    setUploading(true);
    toast.loading('Analizando tu CV, esto puede tardar unos segundos...', { id: 'cv-new' });
    try {
      const { id, path } = await uploadCv.mutateAsync(file);
      await parseCv.mutateAsync({ cvFileId: id, filePath: path });
      toast.success('Nuevo CV listo', { id: 'cv-new' });
      onSelect(id);
    } catch {
      toast.dismiss('cv-new');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {parsedCvs.map((cv) => {
        const isSelected = selectedId === cv.id;
        const role = getLatestRole(cv);
        const skills = getTopSkills(cv);

        return (
          <button
            key={cv.id}
            onClick={() => onSelect(cv.id)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all relative ${
              isSelected
                ? 'border-[#1D9E75] bg-[#1D9E75]/5 shadow-sm'
                : 'border-gray-200 hover:border-[#1D9E75]/50 hover:bg-gray-50'
            }`}
          >
            {/* Checkmark */}
            {isSelected && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[#1D9E75] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}

            <div className="flex items-start gap-3 pr-8">
              <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-[#1D9E75]/10' : 'bg-gray-100'}`}>
                <FileText className={`h-4 w-4 ${isSelected ? 'text-[#1D9E75]' : 'text-gray-500'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{cv.name}</p>
                  <span className="shrink-0 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" /> Analizado
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">Subido el {formatDate(cv.created_at)}</p>
                {role && (
                  <p className="text-xs text-gray-600 font-medium">{role}</p>
                )}
                {skills && (
                  <p className="text-xs text-gray-500 truncate">{skills}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* Upload another CV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleNewCv(f); }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#1D9E75]/50 hover:text-[#1D9E75] disabled:opacity-50 transition-colors"
      >
        {uploading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Analizando nuevo CV...</>
        ) : (
          <><Upload className="h-4 w-4" /> Subir otro CV</>
        )}
      </button>
    </div>
  );
}

// ─── Main Step2 ───────────────────────────────────────────────────────────────
export function Step2({ job, onBack, onComplete }: Step2Props) {
  const { data: cvFiles = [], isLoading } = useCvFiles();
  const parsedCvs = cvFiles.filter((cv: CvFile) => cv.is_parsed);
  const unparsedCvs = cvFiles.filter((cv: CvFile) => !cv.is_parsed);

  const [selectedCvId, setSelectedCvId] = useState('');
  const [tone, setTone] = useState<'formal' | 'semiformal' | 'dinamico'>('semiformal');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [highlightRemote, setHighlightRemote] = useState(false);
  const [immediateAvailability, setImmediateAvailability] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-select if only one parsed CV available
  useEffect(() => {
    if (parsedCvs.length === 1 && !selectedCvId) {
      setSelectedCvId(parsedCvs[0].id);
    }
  }, [parsedCvs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((id: string) => {
    setSelectedCvId(id);
    setError('');
  }, []);

  function handleSubmit() {
    if (!selectedCvId) {
      setError('Selecciona un CV para continuar');
      return;
    }
    setLoading(true);
    onComplete({
      cvFileId: selectedCvId,
      tone,
      language,
      highlight_remote: highlightRemote,
      immediate_availability: immediateAvailability,
    });
  }

  return (
    <div className="space-y-6">
      {/* Job context */}
      <div className="p-3 bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-lg">
        <p className="text-sm text-gray-600">
          Generando documentos para:{' '}
          <span className="font-medium text-gray-900">
            {job.position} en {job.company}
          </span>
        </p>
      </div>

      {/* Language selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Idioma de los documentos generados
        </label>
        <div className="flex gap-2">
          {LANGUAGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setLanguage(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                language === value
                  ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                  : 'border-gray-300 text-gray-700 hover:border-[#1D9E75] hover:text-[#1D9E75]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* CV selection area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Selecciona tu CV <span className="text-red-500">*</span>
        </label>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : parsedCvs.length > 0 ? (
          <CvCardGrid
            parsedCvs={parsedCvs}
            selectedId={selectedCvId}
            onSelect={handleSelect}
          />
        ) : unparsedCvs.length > 0 ? (
          <AnalyzeSection cvFiles={unparsedCvs} onAnalyzed={handleSelect} />
        ) : (
          <UploadZone onUploaded={handleSelect} />
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tono de comunicación</label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTone(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                tone === value
                  ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                  : 'border-gray-300 text-gray-700 hover:border-[#1D9E75] hover:text-[#1D9E75]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Opciones adicionales</label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={highlightRemote}
            onChange={(e) => setHighlightRemote(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">
            Destacar experiencia/interés en trabajo remoto
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={immediateAvailability}
            onChange={(e) => setImmediateAvailability(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">
            Mencionar disponibilidad inmediata
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Atrás
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178860] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            'Generar documentos'
          )}
        </button>
      </div>
    </div>
  );
}
