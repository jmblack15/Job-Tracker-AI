import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/anthropic';
import { AI_MODEL, AI_MAX_TOKENS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import type { ExtractedJob, CvProfileContent, EmailContent, GenerateAllResult, ParsedCvContent, MatchAnalysis } from '@/types';

interface Options {
  tone: 'formal' | 'semiformal' | 'dinamico';
  language: 'es' | 'en';
  highlight_remote: boolean;
  immediate_availability: boolean;
}

function toneLabel(tone: string, lang: 'es' | 'en' = 'es') {
  if (lang === 'en') {
    return tone === 'formal' ? 'formal and professional' : tone === 'semiformal' ? 'friendly and professional' : 'dynamic and direct';
  }
  return tone === 'formal' ? 'formal y profesional' : tone === 'semiformal' ? 'semiformal y amigable' : 'dinámico y directo';
}

function formatCvForPrompt(cv: ParsedCvContent): string {
  const lines: string[] = [];

  lines.push(`Nombre: ${cv.full_name}`);
  if (cv.location) lines.push(`Ubicación: ${cv.location}`);

  if (cv.experience?.length) {
    lines.push('\nExperiencia:');
    cv.experience.slice(0, 3).forEach((e) => {
      const period = e.current ? `${e.start_date} – presente` : `${e.start_date} – ${e.end_date ?? ''}`;
      lines.push(`• ${e.position} en ${e.company} (${period})`);
      const bullets = [...(e.responsibilities ?? []).slice(0, 2), ...(e.achievements ?? []).slice(0, 2)];
      bullets.forEach((b) => lines.push(`  - ${b}`));
    });
  }

  if (cv.skills?.technical?.length) {
    lines.push(`\nHabilidades técnicas: ${cv.skills.technical.slice(0, 12).join(', ')}`);
  }
  if (cv.skills?.languages?.length) {
    lines.push(`Idiomas: ${cv.skills.languages.join(', ')}`);
  }

  if (cv.education?.length) {
    const edu = cv.education[0];
    lines.push(`\nEducación: ${edu.degree}${edu.field ? ` en ${edu.field}` : ''} — ${edu.institution}`);
  }

  const allAchievements = cv.experience?.flatMap((e) => e.achievements ?? []).slice(0, 4) ?? [];
  if (allAchievements.length) {
    lines.push(`\nLogros destacados:\n${allAchievements.map((a) => `• ${a}`).join('\n')}`);
  }

  return lines.join('\n');
}

function buildCvPrompt(job: ExtractedJob, cv: ParsedCvContent, options: Options): string {
  const lang = options.language;
  const tone = toneLabel(options.tone, lang);
  const extras = [
    options.highlight_remote && (lang === 'en' ? 'Highlight remote work experience.' : 'Destacar experiencia o interés en trabajo remoto.'),
    options.immediate_availability && (lang === 'en' ? 'Mention immediate availability.' : 'Mencionar disponibilidad inmediata.'),
  ].filter(Boolean).join(' ');

  const cvSummary = formatCvForPrompt(cv);

  if (lang === 'en') {
    return `You are an expert CV writer. Generate a tailored CV profile for this specific job offer.

CANDIDATE:
${cvSummary}

JOB OFFER: ${job.position} at ${job.company}
Key requirements: ${job.requirements.slice(0, 5).join(', ')}
Tech stack: ${job.tech_stack.join(', ')}
Responsibilities: ${job.responsibilities.slice(0, 4).join(', ')}
Tone: ${tone}
${extras}

Reply with JSON only:
{
  "summary": "3-4 sentence professional profile, first person, ${tone} tone, tailored to this offer",
  "experience_bullets": ["• action verb + quantified achievement tailored to the offer"],
  "skills": ["relevant technical skill for this offer"]
}

experience_bullets: max 6 concise bullets with measurable impact.
skills: max 8 technical skills matching the offer.`;
  }

  return `Eres un experto en redacción de CVs profesionales.
Genera un perfil y bullets de experiencia personalizados para esta oferta específica.

CANDIDATO:
${cvSummary}

OFERTA: ${job.position} en ${job.company}
Requisitos clave: ${job.requirements.slice(0, 5).join(', ')}
Tech stack: ${job.tech_stack.join(', ')}
Responsabilidades: ${job.responsibilities.slice(0, 4).join(', ')}
Tono: ${tone}
${extras}

Responde con JSON (sin texto fuera del JSON):
{
  "summary": "párrafo de perfil profesional de 3-4 oraciones, primera persona, tono ${tone}, adaptado a esta oferta",
  "experience_bullets": ["• verbo acción + logro cuantificado adaptado a la oferta"],
  "skills": ["habilidad técnica relevante para esta oferta"]
}

experience_bullets: máximo 6 bullets concisos con impacto medible.
skills: máximo 8 habilidades técnicas del perfil que coincidan con la oferta.`;
}

function buildLetterPrompt(job: ExtractedJob, cv: ParsedCvContent, options: Options): string {
  const lang = options.language;
  const tone = toneLabel(options.tone, lang);
  const cvSummary = formatCvForPrompt(cv);
  const extras = [
    options.highlight_remote && (lang === 'en' ? 'Mention remote work preference.' : 'Mencionar preferencia por trabajo remoto.'),
    options.immediate_availability && (lang === 'en' ? 'Mention immediate availability.' : 'Mencionar disponibilidad inmediata.'),
  ].filter(Boolean).join(' ');

  if (lang === 'en') {
    return `You are an expert cover letter writer.
Write a complete cover letter for this job offer in English.

CANDIDATE:
${cvSummary}

JOB: ${job.position} at ${job.company} (${job.location})
Requirements: ${job.requirements.slice(0, 5).join(', ')}
Tone: ${tone}
${extras}

Exactly 3 paragraphs:
1. Introduction: why you apply for this role at this specific company
2. Experience and achievements: what you bring and how you match requirements
3. Closing: availability, enthusiasm, call to action

Write ONLY the letter, no subject, no date, no contact info, no explanations.`;
  }

  return `Eres un experto en redacción de cartas de presentación profesionales en español.
Escribe una carta de presentación completa para esta oferta.

CANDIDATO:
${cvSummary}

OFERTA: ${job.position} en ${job.company} (${job.location})
Requisitos: ${job.requirements.slice(0, 5).join(', ')}
Tono: ${tone}
${extras}

La carta debe tener exactamente 3 párrafos:
1. Introducción: por qué aplicas a este cargo en esta empresa específica
2. Experiencia y logros: qué aportas y cómo encajas con los requisitos
3. Cierre: disponibilidad, entusiasmo y llamada a la acción

Escribe SOLO la carta, sin asunto, sin fecha, sin datos de contacto, sin explicaciones adicionales.`;
}

function buildEmailPrompt(job: ExtractedJob, cv: ParsedCvContent, options: Options): string {
  const lang = options.language;
  const tone = toneLabel(options.tone, lang);
  const recentRole = cv.experience?.[0];
  const keyExperience = recentRole
    ? `${recentRole.position} at ${recentRole.company}`
    : cv.skills?.technical?.slice(0, 3).join(', ') ?? '';

  if (lang === 'en') {
    return `You are a professional communications expert.
Write a concise, effective job application email in English.

POSITION: ${job.position}
COMPANY: ${job.company}
CANDIDATE KEY EXPERIENCE: ${keyExperience}
TONE: ${tone}
${options.immediate_availability ? 'AVAILABILITY: immediate' : ''}

Reply with JSON only:
{
  "subject": "Subject of max 8 words, includes the role and creates interest",
  "body": "Email body of max 150 words: 1-line intro, main value proposition tailored to the role, availability and CTA for interview. Tone: ${tone}."
}`;
  }

  return `Eres un experto en comunicación profesional en español.
Escribe un email de aplicación conciso y efectivo.

CARGO: ${job.position}
EMPRESA: ${job.company}
EXPERIENCIA CLAVE: ${keyExperience}
TONO: ${tone}
${options.immediate_availability ? 'DISPONIBILIDAD: inmediata' : ''}

Responde con JSON (sin texto fuera del JSON):
{
  "subject": "Asunto de máximo 8 palabras, incluye el cargo y crea urgencia/interés",
  "body": "Cuerpo del email de máximo 150 palabras: presentación en 1 línea, propuesta de valor principal adaptada al cargo, disponibilidad y CTA para entrevista. Tono ${tone}."
}`;
}

async function generateCvProfile(job: ExtractedJob, cv: ParsedCvContent, options: Options): Promise<CvProfileContent | null> {
  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: 'Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después.',
      messages: [{ role: 'user', content: buildCvPrompt(job, cv, options) }],
    });
    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) as CvProfileContent;
  } catch {
    return null;
  }
}

async function generateCoverLetter(job: ExtractedJob, cv: ParsedCvContent, options: Options): Promise<string | null> {
  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      messages: [{ role: 'user', content: buildLetterPrompt(job, cv, options) }],
    });
    return message.content.find((b) => b.type === 'text')?.text ?? null;
  } catch {
    return null;
  }
}

async function generateEmail(job: ExtractedJob, cv: ParsedCvContent, options: Options): Promise<EmailContent | null> {
  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: 'Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después.',
      messages: [{ role: 'user', content: buildEmailPrompt(job, cv, options) }],
    });
    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) as EmailContent;
  } catch {
    return null;
  }
}

async function generateMatchAnalysis(cv: ParsedCvContent, job: ExtractedJob, language: 'es' | 'en'): Promise<MatchAnalysis | null> {
  try {
    const prompt = `Eres un experto en reclutamiento tech con 15 años de experiencia evaluando candidatos.

CV del candidato:
${formatCvForPrompt(cv)}

Oferta de trabajo:
- Cargo: ${job.position}
- Empresa: ${job.company}
- Requisitos obligatorios: ${job.requirements.join(', ')}
- Stack técnico: ${job.tech_stack.join(', ')}
- Responsabilidades: ${job.responsibilities.join(', ')}
- Años de experiencia requeridos: ${job.experience_years ?? 'No especificado'}
- Tipo de contrato: ${job.contract_type ?? 'No especificado'}

Analiza la compatibilidad real entre el candidato y esta oferta como lo haría un ATS profesional.

Devuelve SOLO JSON con esta estructura exacta:
{
  "overall_score": number,
  "categories": {
    "tech_stack": { "score": number, "weight": 35, "matched": string[], "missing": string[], "details": string },
    "experience": { "score": number, "weight": 25, "years_required": string, "years_candidate": string, "details": string },
    "role_alignment": { "score": number, "weight": 20, "details": string },
    "education": { "score": number, "weight": 10, "details": string },
    "soft_skills": { "score": number, "weight": 10, "details": string }
  },
  "level": "Alto" | "Medio" | "Bajo",
  "ats_keywords": { "found": string[], "missing": string[] },
  "recommendations": [
    { "priority": "alta" | "media" | "baja", "category": "tech_stack" | "experience" | "keywords" | "formato" | "logros", "action": string, "impact": string, "example": string | null }
  ],
  "strengths": string[],
  "summary": string
}

Reglas:
- level: Alto si overall_score >= 70, Medio si 40-69, Bajo si < 40
- overall_score es la suma ponderada de category scores por sus weights
- Ser objetivo, no inflar el score
- Máximo 6 recommendations, ordenadas por prioridad (alta primero)
- 3-4 strengths
- summary: 2-3 líneas
- Idioma de la respuesta: ${language === 'es' ? 'español' : 'inglés'}`;

    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 3000,
      system: 'Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después.',
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) as MatchAnalysis;
  } catch (error) {
    console.error('Match analysis error:', error) // ← agregar esto
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { job, cvFileId, options, type } = await request.json() as {
      job: ExtractedJob;
      cvFileId: string;
      options: Options;
      type?: 'cv' | 'letter' | 'email';
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cvFile, error: fetchError } = await (supabase as any)
      .from('cv_files')
      .select('extracted_content')
      .eq('id', cvFileId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !cvFile?.extracted_content) {
      return NextResponse.json(
        { error: 'CV no encontrado o no analizado. Analiza el CV primero.' },
        { status: 400 }
      );
    }

    const cv = cvFile.extracted_content as ParsedCvContent;

    // Partial regeneration — only one document, no match recalculation
    if (type) {
      const partial: Partial<GenerateAllResult> = {};
      if (type === 'cv') partial.cv_profile = await generateCvProfile(job, cv, options);
      if (type === 'letter') {
        const [res] = await Promise.allSettled([generateCoverLetter(job, cv, options)]);
        partial.cover_letter = res.status === 'fulfilled' ? res.value : null;
      }
      if (type === 'email') partial.email = await generateEmail(job, cv, options);
      return NextResponse.json(partial);
    }

    // Full generation — all 4 in parallel
    const [cvRes, letterRes, emailRes, matchRes] = await Promise.allSettled([
      generateCvProfile(job, cv, options),
      generateCoverLetter(job, cv, options),
      generateEmail(job, cv, options),
      generateMatchAnalysis(cv, job, options.language),
    ]);

    return NextResponse.json({
      cv_profile: cvRes.status === 'fulfilled' ? cvRes.value : null,
      cover_letter: letterRes.status === 'fulfilled' ? letterRes.value : null,
      email: emailRes.status === 'fulfilled' ? emailRes.value : null,
      match: matchRes.status === 'fulfilled' ? matchRes.value : null,
    } satisfies GenerateAllResult);
  } catch (error) {
    console.error('Generate-all error:', error);
    return NextResponse.json({ error: 'Error al generar documentos' }, { status: 500 });
  }
}
