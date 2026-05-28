'use client';

import { useState } from 'react';
import { Target } from 'lucide-react';
import type { ExtractedJob, UserProfile, GenerateAllResult } from '@/types';
import { MatchReportSkeleton } from '@/components/features/apply/MatchReport';
import { Step1 } from './_step1';
import { Step2 } from './_step2';
import { Step3 } from './_step3';

type WizardStep = 1 | 2 | 3;

const STEPS = [
  { number: 1, label: 'Oferta' },
  { number: 2, label: 'Perfil' },
  { number: 3, label: 'Resultados' },
];

function WizardStepper({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map(({ number, label }, idx) => {
        const done = current > number;
        const active = current === number;
        return (
          <div key={number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  done
                    ? 'bg-[#1D9E75] text-white'
                    : active
                    ? 'bg-[#1D9E75] text-white ring-4 ring-[#1D9E75]/20'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? (
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  number
                )}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${
                  active ? 'text-[#1D9E75]' : done ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-16 sm:w-24 mx-2 mt-[-10px] transition-colors ${
                  current > number ? 'bg-[#1D9E75]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ApplyPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [job, setJob] = useState<ExtractedJob | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [result, setResult] = useState<GenerateAllResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleProfileComplete(p: UserProfile) {
    setProfile(p);
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/ai/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          cvFileId: p.cvFileId,
          options: {
            tone: p.tone,
            language: p.language,
            highlight_remote: p.highlight_remote,
            immediate_availability: p.immediate_availability,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? 'Error al generar documentos');
        setGenerating(false);
        return;
      }
      setResult(data as GenerateAllResult);
      setStep(3);
    } catch {
      setGenError('Error de conexión');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Aplicar a oferta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Extrae la oferta, ingresa tu perfil y obtén CV, carta y email personalizados con IA.
        </p>
      </div>

      <WizardStepper current={step} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {step === 1 && (
          <Step1
            onComplete={(j) => {
              setJob(j);
              setStep(2);
            }}
          />
        )}

        {step === 2 && job && (
          <>
            {generating ? (
              <div className="space-y-6">
                {/* Tab bar skeleton */}
                <div className="border-b border-gray-200">
                  <div className="flex gap-1">
                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b-2 border-[#1D9E75] text-[#1D9E75] text-sm font-medium -mb-px">
                      <Target className="h-3.5 w-3.5" />
                      Análisis de compatibilidad
                    </div>
                    {['Perfil CV', 'Carta', 'Email', 'CV Harvard', 'Resumen oferta'].map((l) => (
                      <div key={l} className="px-4 py-2.5 text-sm text-gray-300 -mb-px border-b-2 border-transparent whitespace-nowrap">
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
                <MatchReportSkeleton />
                <p className="text-xs text-gray-400 text-center">
                  Analizando compatibilidad con IA... esto puede tomar 15-20 segundos
                </p>
              </div>
            ) : (
              <>
                {genError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {genError}
                  </div>
                )}
                <Step2
                  job={job}
                  onBack={() => setStep(1)}
                  onComplete={handleProfileComplete}
                />
              </>
            )}
          </>
        )}

        {step === 3 && job && profile && result && (
          <Step3
            job={job}
            profile={profile}
            result={result}
            onBack={() => setStep(2)}
            onResultUpdate={setResult}
          />
        )}
      </div>
    </div>
  );
}
