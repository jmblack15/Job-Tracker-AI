'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, X, Loader2, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { MatchAnalysis, MatchRecommendation, ExtractedJob, UserProfile, GeneratedCvData } from '@/types';
import { useGenerateCv } from '@/hooks/use-cv-generator';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function MatchReportSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col items-center gap-3">
        <div className="h-40 w-40 rounded-full bg-gray-100" />
        <div className="h-3 w-48 bg-gray-100 rounded" />
        <div className="h-3 w-64 bg-gray-100 rounded" />
        <div className="h-3 w-56 bg-gray-100 rounded" />
      </div>
      <div className="space-y-4">
        {[140, 120, 130, 100, 110].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 bg-gray-100 rounded shrink-0" style={{ width: w }} />
            <div className="flex-1 h-2 bg-gray-100 rounded" />
            <div className="h-3 w-12 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[80, 96, 72, 104, 88, 76].map((w, i) => (
          <div key={i} className="h-6 rounded-full bg-gray-100" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LevelValue = 'none' | 'basico' | 'intermedio' | 'avanzado';
type Action = 'skills' | 'all' | 'apply' | null;

interface SkillLevel {
  skill: string;
  level: LevelValue | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 42;

function scoreColor(score: number) {
  return score >= 70 ? '#1D9E75' : score >= 40 ? '#EF9F27' : '#E24B4A';
}

function scoreBg(score: number) {
  return score >= 70
    ? 'bg-green-100 text-green-700'
    : score >= 40
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';
}

function parseImpactPoints(impact: string): number {
  const m = impact.match(/\d+/);
  return m ? Math.min(parseInt(m[0]), 15) : 3;
}

function skillImpact(skill: string, recs: MatchRecommendation[]): number {
  const lower = skill.toLowerCase();
  const rec = recs.find(
    (r) =>
      r.action.toLowerCase().includes(lower) ||
      (r.example?.toLowerCase().includes(lower) ?? false),
  );
  return rec ? parseImpactPoints(rec.impact) : 3;
}

const PRIORITY_STYLES = {
  alta:  { border: 'border-red-200',    badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500'    },
  media: { border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  baja:  { border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400'   },
};

const PRIORITY_LABEL: Record<string, string> = {
  alta: 'ALTA PRIORIDAD', media: 'MEDIA PRIORIDAD', baja: 'BAJA PRIORIDAD',
};

const CAT_LABELS: Record<string, string> = {
  tech_stack:    'Stack técnico',
  experience:    'Experiencia',
  role_alignment:'Perfil del cargo',
  education:     'Educación',
  soft_skills:   'Soft skills',
};

const LEVEL_OPTIONS: { value: LevelValue; label: string }[] = [
  { value: 'none',        label: 'No lo conozco' },
  { value: 'basico',      label: 'Básico'        },
  { value: 'intermedio',  label: 'Intermedio'    },
  { value: 'avanzado',    label: 'Avanzado'      },
];

const LEVEL_SELECTED_STYLE: Record<LevelValue, string> = {
  none:       'bg-gray-200      text-gray-600       border-gray-300',
  basico:     'bg-yellow-100    text-yellow-700     border-yellow-200',
  intermedio: 'bg-teal-100      text-teal-700       border-teal-200',
  avanzado:   'bg-green-100     text-green-700      border-green-200',
};

const LEVEL_DISPLAY: Record<LevelValue, string> = {
  none: 'No lo conozco', basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado',
};

// ─── Animated circle ──────────────────────────────────────────────────────────

function ScoreCircle({ target, from }: { target: number; from: number }) {
  const [display, setDisplay] = useState(from);
  const raf = useRef<number>(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const startVal = from;
    const startTime = performance.now();
    const duration = 1000;

    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + eased * (target - startVal)));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    }

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, from]);

  const color = scoreColor(display);
  const offset = CIRCUMFERENCE * (1 - display / 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.04s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-gray-900">{display}%</span>
        <span className="text-xs text-gray-500 mt-0.5">Compatibilidad</span>
      </div>
    </div>
  );
}

// ─── Category bar ─────────────────────────────────────────────────────────────

function CategoryBar({
  label, weight, score, details, matched, missing, years_required, years_candidate,
}: {
  label: string; weight: number; score: number; details: string;
  matched?: string[]; missing?: string[]; years_required?: string; years_candidate?: string;
}) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(score);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 shrink-0 w-44">
          {label} <span className="text-gray-400">({weight}%)</span>
        </span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 w-14 text-right shrink-0">
          {score}/100
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Ver detalles"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className="ml-[184px] mt-1 mb-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1.5 border border-gray-100">
          <p>{details}</p>
          {(years_required || years_candidate) && (
            <p className="text-gray-500">
              Requerido: <strong>{years_required ?? '—'}</strong> · Candidato: <strong>{years_candidate ?? '—'}</strong>
            </p>
          )}
          {matched && matched.length > 0 && <p className="text-green-700">✓ {matched.join(' · ')}</p>}
          {missing  && missing.length  > 0 && <p className="text-red-600">✗ {missing.join(' · ')}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Skill card ───────────────────────────────────────────────────────────────

function SkillCard({
  skill, level, impact, onChange,
}: {
  skill: string;
  level: LevelValue | null;
  impact: number;
  onChange: (level: LevelValue) => void;
}) {
  const isConfirmed = level !== null && level !== 'none';

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isConfirmed ? 'border-[#1D9E75]/30 bg-[#1D9E75]/5' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">{skill}</span>
        {isConfirmed && (
          <span className="text-xs font-semibold text-[#1D9E75]">+{impact} pts est.</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {LEVEL_OPTIONS.map(({ value, label }) => {
          const selected = level === value;
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              title="Solo agrega niveles que puedas demostrar en una entrevista técnica"
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                selected
                  ? `${LEVEL_SELECTED_STYLE[value]} font-medium`
                  : 'border-gray-300 bg-transparent text-gray-500 hover:border-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Apply modal ──────────────────────────────────────────────────────────────

function ApplyModal({
  rec, loading, onClose, onApply,
}: {
  rec: MatchRecommendation;
  loading: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
}) {
  const [text, setText] = useState(rec.example ?? rec.action);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Aplicar cambio al CV</h3>
            <p className="text-xs text-gray-500 mt-0.5">{rec.action}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Texto a incorporar en el CV</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
          />
        </div>
        <button
          onClick={() => onApply(text)}
          disabled={loading || !text.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178860] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Regenerar CV con este cambio
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MatchReportProps {
  match: MatchAnalysis;
  profile: UserProfile;
  job: ExtractedJob;
  onOptimizedCv: (cv: GeneratedCvData) => void;
}

export function MatchReport({ match, profile, job, onOptimizedCv }: MatchReportProps) {
  const generateCv = useGenerateCv();
  const [currentAction, setCurrentAction] = useState<Action>(null);
  const [applyModal, setApplyModal] = useState<MatchRecommendation | null>(null);

  // Score animation state
  const [localScore, setLocalScore] = useState(match.overall_score);
  const [animFrom, setAnimFrom] = useState(0);
  const [prevScoreDisplay, setPrevScoreDisplay] = useState<number | null>(null);

  // Missing skills interactive state
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>(
    match.ats_keywords.missing.map((skill) => ({ skill, level: null })),
  );
  const [skillSectionOpen, setSkillSectionOpen] = useState(match.ats_keywords.missing.length > 0);

  const confirmedSkills = skillLevels.filter((s) => s.level && s.level !== 'none');
  const hasConfirmed = confirmedSkills.length > 0;
  const estimatedDelta = confirmedSkills.reduce(
    (sum, s) => sum + skillImpact(s.skill, match.recommendations),
    0,
  );

  const tone = profile.tone === 'dinamico' ? 'semiformal' : profile.tone;
  const jobPayload = {
    position: job.position,
    company: job.company,
    requirements: job.requirements,
    tech_stack: job.tech_stack,
    responsibilities: job.responsibilities,
  };
  const optionsPayload = { tone, highlight_remote: profile.highlight_remote, language: profile.language };

  function updateScore(newScore: number) {
    const old = localScore;
    setPrevScoreDisplay(old);
    setAnimFrom(old);
    setLocalScore(newScore);
  }

  async function handleApply(text: string) {
    setCurrentAction('apply');
    try {
      const cv = await generateCv.mutateAsync({
        cvFileId: profile.cvFileId,
        job: jobPayload,
        options: optionsPayload,
        additional_context: text,
      });
      setApplyModal(null);
      onOptimizedCv(cv);
    } finally {
      setCurrentAction(null);
    }
  }

  async function handleRegenerateWithSkills() {
    if (!hasConfirmed) return;
    setCurrentAction('skills');
    try {
      const cv = await generateCv.mutateAsync({
        cvFileId: profile.cvFileId,
        job: jobPayload,
        options: optionsPayload,
        confirmed_skills: confirmedSkills.map((s) => ({ skill: s.skill, level: s.level as string })),
      });
      const newScore = Math.min(100, localScore + estimatedDelta);
      updateScore(newScore);
      const n = confirmedSkills.length;
      toast.success(`CV regenerado con ${n} skill${n > 1 ? 's' : ''} agregado${n > 1 ? 's' : ''}`);
      onOptimizedCv(cv);
    } finally {
      setCurrentAction(null);
    }
  }

  async function handleOptimizeAll() {
    setCurrentAction('all');
    const items = match.recommendations.filter((r) => r.priority !== 'baja');
    const context = `Incorpora las siguientes mejoras en el CV:\n${items
      .map((r) => `- ${r.action}${r.example ? `\n  Ejemplo: ${r.example}` : ''}`)
      .join('\n')}`;
    try {
      const cv = await generateCv.mutateAsync({
        cvFileId: profile.cvFileId,
        job: jobPayload,
        options: optionsPayload,
        additional_context: context,
      });
      onOptimizedCv(cv);
    } finally {
      setCurrentAction(null);
    }
  }

  const cats = [
    { key: 'tech_stack',    ...match.categories.tech_stack    },
    { key: 'experience',    ...match.categories.experience    },
    { key: 'role_alignment',...match.categories.role_alignment},
    { key: 'education',     ...match.categories.education     },
    { key: 'soft_skills',   ...match.categories.soft_skills   },
  ] as const;

  const hasOptimizable = match.recommendations.some((r) => r.priority !== 'baja');
  const hasMissingSkills = match.ats_keywords.missing.length > 0;
  const selectedCount = skillLevels.filter((s) => s.level && s.level !== 'none').length;

  return (
    <>
      {applyModal && (
        <ApplyModal
          rec={applyModal}
          loading={generateCv.isPending && currentAction === 'apply'}
          onClose={() => setApplyModal(null)}
          onApply={handleApply}
        />
      )}

      <div className="space-y-8">
        {/* Section 1 — Score circular */}
        <div className="flex flex-col items-center gap-3">
          <ScoreCircle target={localScore} from={animFrom} />
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${scoreBg(localScore)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {match.level}
          </span>

          {/* Before / after comparison */}
          {prevScoreDisplay !== null && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400">Anterior: <strong className="text-gray-600">{prevScoreDisplay}%</strong></span>
              <span className="text-[#1D9E75] font-semibold">
                ↑ +{localScore - prevScoreDisplay} puntos
              </span>
            </div>
          )}

          {match.summary && (
            <p className="text-sm text-gray-600 text-center max-w-md leading-relaxed">
              {match.summary}
            </p>
          )}
        </div>

        {/* Section 2 — Category bars */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Desglose por categoría</h3>
          <div className="space-y-2">
            {cats.map(({ key, score, weight, details, matched, missing, years_required, years_candidate }) => (
              <CategoryBar
                key={key}
                label={CAT_LABELS[key]}
                weight={weight}
                score={score}
                details={details}
                matched={matched}
                missing={missing}
                years_required={years_required}
                years_candidate={years_candidate}
              />
            ))}
          </div>
        </div>

        {/* Section 3 — ATS Keywords: found (static pills) */}
        {match.ats_keywords.found.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Keywords ATS encontradas</h3>
            <div className="flex flex-wrap gap-1.5">
              {match.ats_keywords.found.map((kw) => (
                <span key={kw} className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  ✓ {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section 3b — Missing skills interactive */}
        {hasMissingSkills && (
          <div className="space-y-3">
            {/* Accordion header */}
            <button
              onClick={() => setSkillSectionOpen((o) => !o)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-800 group"
            >
              <span>
                Skills faltantes — selecciona los que conoces{' '}
                <span className="text-gray-400 font-normal">
                  ({selectedCount} de {skillLevels.length})
                </span>
              </span>
              {skillSectionOpen
                ? <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                : <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              }
            </button>

            {skillSectionOpen && (
              <div className="space-y-3">
                {/* Skill cards */}
                <div className="space-y-2">
                  {skillLevels.map(({ skill, level }) => (
                    <SkillCard
                      key={skill}
                      skill={skill}
                      level={level}
                      impact={skillImpact(skill, match.recommendations)}
                      onChange={(newLevel) =>
                        setSkillLevels((prev) =>
                          prev.map((s) => (s.skill === skill ? { ...s, level: newLevel } : s)),
                        )
                      }
                    />
                  ))}
                </div>

                {/* Dynamic summary */}
                {(confirmedSkills.length > 0 || skillLevels.some((s) => s.level !== null)) && (
                  <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-2 border border-gray-100">
                    {confirmedSkills.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Skills que se agregarán al CV:</p>
                        {confirmedSkills.map((s) => (
                          <p key={s.skill} className="text-[#1D9E75]">
                            ● {s.skill} ({LEVEL_DISPLAY[s.level!]})
                          </p>
                        ))}
                      </div>
                    )}
                    {skillLevels.some((s) => s.level === null || s.level === 'none') && (
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Skills omitidos:</p>
                        {skillLevels
                          .filter((s) => s.level === null || s.level === 'none')
                          .map((s) => (
                            <p key={s.skill} className="text-gray-400">
                              ✗ {s.skill} — {s.level === 'none' ? 'no lo conozco' : 'sin seleccionar'}
                            </p>
                          ))}
                      </div>
                    )}
                    {hasConfirmed && (
                      <p className="text-[#1D9E75] font-medium pt-1">
                        Impacto estimado: +{estimatedDelta} puntos en el score
                      </p>
                    )}
                  </div>
                )}

                {/* Primary CTA: regenerate with confirmed skills */}
                <div className="pt-1">
                  <button
                    onClick={handleRegenerateWithSkills}
                    disabled={!hasConfirmed || generateCv.isPending}
                    title={!hasConfirmed ? 'Selecciona al menos un skill que conozcas' : undefined}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#178860] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generateCv.isPending && currentAction === 'skills' ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Regenerando CV... (10-15 seg)</>
                    ) : (
                      <><RefreshCw className="h-4 w-4" /> Regenerar CV con mis skills confirmados</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 4 — Strengths */}
        {match.strengths.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Puntos fuertes</h3>
            <ul className="space-y-2">
              {match.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-[#1D9E75] shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section 5 — Recommendations */}
        {match.recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Recomendaciones para subir el score</h3>
            <div className="space-y-3">
              {match.recommendations.map((rec, i) => {
                const styles = PRIORITY_STYLES[rec.priority];
                return (
                  <div key={i} className={`rounded-xl border ${styles.border} p-4 space-y-2`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${styles.dot}`} />
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                          {PRIORITY_LABEL[rec.priority]}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#1D9E75] shrink-0">{rec.impact}</span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium">{rec.action}</p>
                    {rec.example && (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-600">Ejemplo: </span>{rec.example}
                      </p>
                    )}
                    <button
                      onClick={() => setApplyModal(rec)}
                      disabled={generateCv.isPending}
                      className="text-xs text-[#1D9E75] hover:text-[#178860] font-medium disabled:opacity-50 transition-colors"
                    >
                      Aplicar al CV →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 6 — Optimize all (secondary, outline style) */}
        {hasOptimizable && (
          <div className="pt-2 space-y-2">
            <button
              onClick={handleOptimizeAll}
              disabled={generateCv.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1D9E75] text-[#1D9E75] rounded-xl text-sm font-medium hover:bg-[#1D9E75]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generateCv.isPending && currentAction === 'all' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Optimizando... (10-15 seg)</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Optimizar todo automáticamente</>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Incorpora todas las recomendaciones de prioridad alta y media en un solo click
            </p>
          </div>
        )}
      </div>
    </>
  );
}
