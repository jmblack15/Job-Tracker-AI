'use client';

import { useState, useRef } from 'react';
import {
  Upload, Trash2, FileText, Sparkles,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { useCvFiles, useUploadCv, useDeleteCv } from '@/hooks/use-cv-files';
import {
  useParseCv, useGenerateCv, useGenerateCoverLetter, useGeneratedCvs,
} from '@/hooks/use-cv-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatFileSize } from '@/lib/utils';
import type { CvFile, GeneratedCv, GeneratedCvData, CoverLetterData } from '@/types';
import { CvPreview } from '@/components/cv/CvPreview';
import { CoverLetterPreview } from '@/components/cv/CoverLetterPreview';
import { toast } from 'sonner';

type PageTab = 'mis-cvs' | 'generar' | 'generados';
type GenLang = 'es' | 'en';
type GenTone = 'formal' | 'semiformal';

const LANGUAGE_OPTIONS: { value: GenLang; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

// ─── Parsed CV badge ──────────────────────────────────────────────────────────
function ParsedBadge({ isParsed }: { isParsed: boolean }) {
  if (isParsed) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="h-3 w-3" /> Analizado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
      <AlertCircle className="h-3 w-3" /> Sin analizar
    </span>
  );
}

// ─── Mis CVs tab ─────────────────────────────────────────────────────────────
function MisCvsTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: cvFiles = [], isLoading } = useCvFiles();
  const uploadCv = useUploadCv();
  const deleteCv = useDeleteCv();
  const parseCv = useParseCv();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se aceptan archivos PDF para análisis automático');
      return;
    }
    await uploadCv.mutateAsync(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      <div>
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} loading={uploadCv.isPending}>
          <Upload className="h-4 w-4" />
          Subir CV en PDF
        </Button>
        <p className="text-xs text-gray-400 mt-1">Solo PDF — se analizará automáticamente con IA</p>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : cvFiles.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No has subido CVs aún</p>
        ) : (
          cvFiles.map((cv: CvFile) => (
            <div
              key={cv.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-[#1D9E75]/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cv.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(cv.size)} · {formatDate(cv.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <ParsedBadge isParsed={!!cv.is_parsed} />
                {!cv.is_parsed && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={parseCv.isPending}
                    onClick={() => parseCv.mutate({ cvFileId: cv.id, filePath: cv.path })}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Analizar
                  </Button>
                )}
                <button
                  onClick={() => deleteCv.mutate({ id: cv.id, path: cv.path })}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Generar CV tab ───────────────────────────────────────────────────────────
function GenerarCvTab() {
  const { data: cvFiles = [] } = useCvFiles();
  const parsedCvs = cvFiles.filter((cv: CvFile) => cv.is_parsed);
  const generateCv = useGenerateCv();
  const generateCoverLetter = useGenerateCoverLetter();

  const [selectedCvId, setSelectedCvId] = useState('');
  const [genType, setGenType] = useState<'cv' | 'carta'>('cv');
  const [language, setLanguage] = useState<GenLang>('es');
  const [tone, setTone] = useState<GenTone>('semiformal');
  const [highlightRemote, setHighlightRemote] = useState(false);
  const [immediateAvailability, setImmediateAvailability] = useState(false);
  const [jobDescription, setJobDescription] = useState('');

  const [generatedCv, setGeneratedCv] = useState<GeneratedCvData | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState<CoverLetterData | null>(null);

  const isLoading = generateCv.isPending || generateCoverLetter.isPending;

  function extractJobInfo(description: string) {
    return {
      position: 'Puesto extraído de descripción',
      company: 'Empresa',
      requirements: [],
      tech_stack: [],
      responsibilities: [],
      description,
    };
  }

  async function handleGenerate() {
    if (!selectedCvId) { toast.error('Selecciona un CV analizado'); return; }
    if (!jobDescription.trim()) { toast.error('Ingresa la descripción de la oferta'); return; }

    const job = extractJobInfo(jobDescription);

    if (genType === 'cv') {
      const result = await generateCv.mutateAsync({
        cvFileId: selectedCvId,
        job,
        options: { tone, highlight_remote: highlightRemote, language },
      });
      setGeneratedCv(result);
      setGeneratedLetter(null);
    } else {
      const result = await generateCoverLetter.mutateAsync({
        cvFileId: selectedCvId,
        job,
        options: { tone: tone as 'formal' | 'semiformal' | 'dinamico', language, highlight_remote: highlightRemote, immediate_availability: immediateAvailability },
      });
      setGeneratedLetter(result);
      setGeneratedCv(null);
    }
  }

  if (parsedCvs.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <FileText className="h-10 w-10 text-gray-300 mx-auto" />
        <p className="text-sm text-gray-600 font-medium">Primero sube y analiza un CV</p>
        <p className="text-xs text-gray-400">
          Ve a la pestaña "Mis CVs", sube un PDF y haz click en "Analizar"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* CV select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CV base</label>
        <select
          value={selectedCvId}
          onChange={(e) => setSelectedCvId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
        >
          <option value="">Seleccionar CV analizado...</option>
          {parsedCvs.map((cv: CvFile) => (
            <option key={cv.id} value={cv.id}>{cv.name}</option>
          ))}
        </select>
      </div>

      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de documento</label>
        <div className="flex gap-2">
          {([['cv', 'CV Harvard'], ['carta', 'Carta de presentación']] as [string, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setGenType(v as 'cv' | 'carta')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                genType === v ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Idioma del documento</label>
        <div className="flex gap-2">
          {LANGUAGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setLanguage(value)}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                language === value
                  ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                  : 'border-gray-300 text-gray-700 hover:border-[#1D9E75]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tono</label>
        <div className="flex gap-2">
          {([['formal', 'Formal'], ['semiformal', 'Semiformal']] as [GenTone, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTone(v)}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                tone === v
                  ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                  : 'border-gray-300 text-gray-700 hover:border-[#1D9E75]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={highlightRemote}
            onChange={(e) => setHighlightRemote(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
          />
          <span className="text-sm text-gray-700">Destacar experiencia/interés en trabajo remoto</span>
        </label>
        {genType === 'carta' && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={immediateAvailability}
              onChange={(e) => setImmediateAvailability(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
            />
            <span className="text-sm text-gray-700">Mencionar disponibilidad inmediata</span>
          </label>
        )}
      </div>

      {/* Job description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción de la oferta <span className="text-red-500">*</span>
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Pega aquí la descripción completa de la oferta de trabajo..."
          rows={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
        />
      </div>

      <Button onClick={handleGenerate} loading={isLoading} className="w-full">
        <Sparkles className="h-4 w-4" />
        {isLoading
          ? 'Generando... (10-15 seg)'
          : genType === 'cv' ? 'Generar CV Harvard' : 'Generar carta de presentación'}
      </Button>

      {/* Result */}
      {generatedCv && (
        <div className="mt-4">
          <CvPreview cv={generatedCv} language={language} />
        </div>
      )}
      {generatedLetter && (
        <div className="mt-4">
          <CoverLetterPreview letter={generatedLetter} language={language} />
        </div>
      )}
    </div>
  );
}

// ─── Generados tab ────────────────────────────────────────────────────────────
function GeneradosTab() {
  const { data: generated = [], isLoading } = useGeneratedCvs();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  if (generated.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Aún no has generado ningún documento</p>;
  }

  return (
    <div className="space-y-2">
      {generated.map((item: GeneratedCv) => {
        const isExpanded = expanded === item.id;
        const isEn = item.language === 'en';
        const typeBadge = item.type === 'cv'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-purple-100 text-purple-700';
        const typeLabel = item.type === 'cv' ? 'CV Harvard' : (isEn ? 'Cover Letter' : 'Carta');

        return (
          <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpanded(isExpanded ? null : item.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.position} · {item.company}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge}`}>{typeLabel}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {isEn ? 'EN' : 'ES'}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4">
                {item.type === 'cv' ? (
                  <CvPreview
                    cv={item.content as unknown as GeneratedCvData}
                    language={item.language as 'es' | 'en'}
                    filename={`CV_${item.position}_${item.company}.pdf`}
                  />
                ) : (
                  <CoverLetterPreview
                    letter={item.content as unknown as CoverLetterData}
                    language={item.language as 'es' | 'en'}
                    filename={`Carta_${item.position}_${item.company}.pdf`}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
const TABS: { key: PageTab; label: string }[] = [
  { key: 'mis-cvs', label: 'Mis CVs' },
  { key: 'generar', label: 'Generar CV' },
  { key: 'generados', label: 'CVs Generados' },
];

export default function CvPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('mis-cvs');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CV</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sube tu CV, analízalo con IA y genera versiones Harvard personalizadas por oferta
        </p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex border-b border-gray-200 -mx-6 px-6">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === key
                    ? 'border-[#1D9E75] text-[#1D9E75]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {activeTab === 'mis-cvs' && <MisCvsTab />}
          {activeTab === 'generar' && <GenerarCvTab />}
          {activeTab === 'generados' && <GeneradosTab />}
        </CardContent>
      </Card>
    </div>
  );
}
