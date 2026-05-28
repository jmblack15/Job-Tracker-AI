'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Loader2, Copy, Check, RefreshCw,
  BookmarkPlus, Sparkles, Target,
} from 'lucide-react';
import { addDays, format } from 'date-fns';
import type { ExtractedJob, UserProfile, GenerateAllResult, GeneratedCvData, CoverLetterData } from '@/types';
import { MatchReport } from '@/components/features/apply/MatchReport';
import { useCreateApplication } from '@/hooks/use-applications';
import { useCreateReminder } from '@/hooks/use-reminders';
import { useGenerateCv, useGenerateCoverLetter } from '@/hooks/use-cv-generator';
import { CvPreview } from '@/components/cv/CvPreview';
import { CoverLetterPreview } from '@/components/cv/CoverLetterPreview';

type Tab = 'match' | 'cv' | 'letter' | 'email' | 'harvard-cv' | 'summary';

interface Step3Props {
  job: ExtractedJob;
  profile: UserProfile;
  result: GenerateAllResult;
  onBack: () => void;
  onResultUpdate: (result: GenerateAllResult) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function RegenerateButton({
  type, job, profile, loading, onStart, onDone,
}: {
  type: 'cv' | 'letter' | 'email';
  job: ExtractedJob;
  profile: UserProfile;
  loading: boolean;
  onStart: () => void;
  onDone: (partial: Partial<GenerateAllResult>) => void;
}) {
  async function handleRegenerate() {
    onStart();
    try {
      const res = await fetch('/api/ai/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          cvFileId: profile.cvFileId,
          options: {
            tone: profile.tone,
            language: profile.language,
            highlight_remote: profile.highlight_remote,
            immediate_availability: profile.immediate_availability,
          },
          type,
        }),
      });
      const data = await res.json();
      onDone(data);
    } catch {
      onDone({});
    }
  }
  return (
    <button
      onClick={handleRegenerate}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1D9E75] disabled:opacity-50 transition-colors"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      Regenerar
    </button>
  );
}

export function Step3({ job, profile, result, onBack, onResultUpdate }: Step3Props) {
  const router = useRouter();
  const language = profile.language ?? 'es';

  const [activeTab, setActiveTab] = useState<Tab>('match');
  const [regenLoading, setRegenLoading] = useState<'cv' | 'letter' | 'email' | null>(null);
  const [isOptimized, setIsOptimized] = useState(false);

  const [cvText, setCvText] = useState(
    result.cv_profile
      ? `${result.cv_profile.summary}\n\nExperiencia:\n${result.cv_profile.experience_bullets.join('\n')}\n\nHabilidades: ${result.cv_profile.skills.join(', ')}`
      : ''
  );
  const [letterText, setLetterText] = useState(result.cover_letter ?? '');
  const [emailSubject, setEmailSubject] = useState(result.email?.subject ?? '');
  const [emailBody, setEmailBody] = useState(result.email?.body ?? '');

  // Harvard CV state
  const [harvardCv, setHarvardCv] = useState<GeneratedCvData | null>(null);
  const [harvardLetter, setHarvardLetter] = useState<CoverLetterData | null>(null);
  const generateCv = useGenerateCv();
  const generateCoverLetter = useGenerateCoverLetter();

  // Save to tracker
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [remind3, setRemind3] = useState(false);
  const [remind7, setRemind7] = useState(false);
  const createApp = useCreateApplication();
  const createReminder = useCreateReminder();

  function handleRegenDone(type: 'cv' | 'letter' | 'email', partial: Partial<GenerateAllResult>) {
    setRegenLoading(null);
    const updated = { ...result, ...partial };
    onResultUpdate(updated);
    if (type === 'cv' && updated.cv_profile) {
      setCvText(`${updated.cv_profile.summary}\n\nExperiencia:\n${updated.cv_profile.experience_bullets.join('\n')}\n\nHabilidades: ${updated.cv_profile.skills.join(', ')}`);
    }
    if (type === 'letter' && updated.cover_letter) setLetterText(updated.cover_letter);
    if (type === 'email' && updated.email) {
      setEmailSubject(updated.email.subject);
      setEmailBody(updated.email.body);
    }
  }

  async function handleGenerateHarvardCv() {
    const data = await generateCv.mutateAsync({
      cvFileId: profile.cvFileId,
      job: {
        position: job.position,
        company: job.company,
        requirements: job.requirements,
        tech_stack: job.tech_stack,
        responsibilities: job.responsibilities,
      },
      options: {
        tone: profile.tone === 'dinamico' ? 'semiformal' : profile.tone,
        highlight_remote: profile.highlight_remote,
        language,
      },
    });
    setHarvardCv(data);
  }

  async function handleGenerateHarvardLetter() {
    const data = await generateCoverLetter.mutateAsync({
      cvFileId: profile.cvFileId,
      job: {
        position: job.position,
        company: job.company,
        requirements: job.requirements,
        tech_stack: job.tech_stack,
      },
      options: {
        tone: profile.tone,
        language,
        highlight_remote: profile.highlight_remote,
        immediate_availability: profile.immediate_availability,
      },
    });
    setHarvardLetter(data);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const app = await createApp.mutateAsync({
        position: job.position,
        company: job.company,
        url: job.url ?? '',
        status: 'Aplicado',
        applied_at: new Date().toISOString().split('T')[0],
        salary_range: job.salary ?? '',
        location: job.location ?? '',
        description: job.requirements.slice(0, 3).join(' | '),
      });
      if (remind3) {
        await createReminder.mutateAsync({
          title: `Seguimiento: ${job.position} en ${job.company}`,
          description: 'Verificar estado de la aplicación (3 días)',
          due_at: format(addDays(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ss"),
          application_id: app.id,
        });
      }
      if (remind7) {
        await createReminder.mutateAsync({
          title: `Seguimiento: ${job.position} en ${job.company}`,
          description: 'Verificar estado de la aplicación (1 semana)',
          due_at: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm:ss"),
          application_id: app.id,
        });
      }
      setSaved(true);
    } catch {
      // toast handled by hooks
    } finally {
      setSaving(false);
    }
  }

  const tabs: { key: Tab; label: string; icon?: ReactNode }[] = [
    { key: 'match', label: 'Análisis de compatibilidad', icon: <Target className="h-3.5 w-3.5" /> },
    { key: 'cv', label: 'Perfil CV' },
    { key: 'letter', label: 'Carta' },
    { key: 'email', label: 'Email' },
    { key: 'harvard-cv', label: 'CV Harvard' },
    { key: 'summary', label: 'Resumen oferta' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === key
                  ? 'border-[#1D9E75] text-[#1D9E75]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Match analysis */}
      {activeTab === 'match' && (
        result.match ? (
          <MatchReport
            match={result.match}
            profile={profile}
            job={job}
            onOptimizedCv={(cv) => {
              setHarvardCv(cv);
              setIsOptimized(true);
              setActiveTab('harvard-cv');
            }}
          />
        ) : (
          <p className="text-sm text-gray-500 py-8 text-center">
            No se pudo calcular el análisis de compatibilidad.
          </p>
        )
      )}

      {/* Tab: Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Cargo', value: job.position },
              { label: 'Empresa', value: job.company },
              { label: 'Ubicación', value: job.location },
              { label: 'Modalidad', value: job.modality },
              { label: 'Salario', value: job.salary },
              { label: 'Experiencia', value: job.experience_years },
            ].map(({ label, value }) =>
              value ? (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm text-gray-700 font-medium">{value}</p>
                </div>
              ) : null
            )}
          </div>
          {job.tech_stack.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Tech stack</p>
              <div className="flex flex-wrap gap-1.5">
                {job.tech_stack.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}
          {job.requirements.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Requisitos</p>
              <ul className="space-y-1">
                {job.requirements.map((r, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-[#1D9E75]">•</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tab: CV profile (quick text) */}
      {activeTab === 'cv' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Edita el contenido según necesites</p>
            <div className="flex items-center gap-3">
              <CopyButton text={cvText} />
              <RegenerateButton
                type="cv" job={job} profile={profile} loading={regenLoading === 'cv'}
                onStart={() => setRegenLoading('cv')}
                onDone={(p) => handleRegenDone('cv', p)}
              />
            </div>
          </div>
          <textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none font-mono"
          />
        </div>
      )}

      {/* Tab: Cover letter */}
      {activeTab === 'letter' && (
        <div className="space-y-3">
          {/* Harvard upgrade */}
          <div className="p-3 bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-lg flex items-center justify-between">
            <p className="text-xs text-gray-600">Genera la carta en formato Harvard con PDF descargable.</p>
            <button
              onClick={handleGenerateHarvardLetter}
              disabled={generateCoverLetter.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1D9E75] text-white rounded-lg hover:bg-[#178860] disabled:opacity-50 transition-colors shrink-0 ml-3"
            >
              {generateCoverLetter.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Carta Harvard
            </button>
          </div>

          {harvardLetter ? (
            <CoverLetterPreview
              letter={harvardLetter}
              language={language}
              filename={`Carta_${job.position}_${job.company}.pdf`}
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Edita y personaliza la carta</p>
                <div className="flex items-center gap-3">
                  <CopyButton text={letterText} />
                  <RegenerateButton
                    type="letter" job={job} profile={profile} loading={regenLoading === 'letter'}
                    onStart={() => setRegenLoading('letter')}
                    onDone={(p) => handleRegenDone('letter', p)}
                  />
                </div>
              </div>
              <textarea
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                rows={16}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
              />
            </>
          )}
        </div>
      )}

      {/* Tab: Email */}
      {activeTab === 'email' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Asunto</label>
              <div className="flex items-center gap-3">
                <CopyButton text={`${emailSubject}\n\n${emailBody}`} />
                <RegenerateButton
                  type="email" job={job} profile={profile} loading={regenLoading === 'email'}
                  onStart={() => setRegenLoading('email')}
                  onDone={(p) => handleRegenDone('email', p)}
                />
              </div>
            </div>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuerpo</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
            />
          </div>
        </div>
      )}

      {/* Tab: Harvard CV */}
      {activeTab === 'harvard-cv' && (
        <div className="space-y-4">
          {harvardCv ? (
            <>
              {isOptimized && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-lg">
                  <Sparkles className="h-4 w-4 text-[#1D9E75] shrink-0" />
                  <p className="text-xs text-[#1D9E75] font-medium">
                    CV optimizado automáticamente con las recomendaciones del análisis de compatibilidad
                  </p>
                </div>
              )}
              <CvPreview
                cv={harvardCv}
                language={language}
                filename={`CV_Harvard_${job.position}_${job.company}.pdf`}
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">
                  Genera un <strong>CV Harvard completo</strong> personalizado para esta oferta, usando los datos de tu CV subido.
                </p>
                <ul className="text-xs text-gray-500 space-y-1 mt-2">
                  <li>• Formato Harvard con métricas y verbos de acción</li>
                  <li>• Adaptado a los requisitos de la oferta</li>
                  <li>• Descargable como PDF o copiable como texto</li>
                  <li>• Idioma: <strong>{language === 'en' ? 'English' : 'Español'}</strong></li>
                </ul>
              </div>
              <button
                onClick={handleGenerateHarvardCv}
                disabled={generateCv.isPending}
                className="flex items-center gap-2 w-full justify-center px-5 py-3 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178860] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generateCv.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando CV Harvard... (10-15 seg)
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generar CV Harvard
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save to tracker */}
      <div className="border border-[#1D9E75]/30 rounded-xl p-5 bg-[#1D9E75]/5 space-y-4">
        <div className="flex items-center gap-2">
          <BookmarkPlus className="h-5 w-5 text-[#1D9E75]" />
          <h3 className="font-semibold text-gray-900 text-sm">Guardar en tracker</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Cargo</p>
            <p className="font-medium text-gray-800">{job.position}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Empresa</p>
            <p className="font-medium text-gray-800">{job.company}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Recordatorios de seguimiento</p>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox" checked={remind3} onChange={(e) => setRemind3(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
            />
            <span className="text-sm text-gray-700">En 3 días ({format(addDays(new Date(), 3), 'dd/MM/yyyy')})</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox" checked={remind7} onChange={(e) => setRemind7(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
            />
            <span className="text-sm text-gray-700">En 1 semana ({format(addDays(new Date(), 7), 'dd/MM/yyyy')})</span>
          </label>
        </div>
        {saved ? (
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <Check className="h-4 w-4" />
            Guardado en tracker
            <button onClick={() => router.push('/applications')} className="ml-2 text-[#1D9E75] underline hover:no-underline">
              Ver aplicaciones
            </button>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178860] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar en tracker'}
          </button>
        )}
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver al perfil
      </button>
    </div>
  );
}
