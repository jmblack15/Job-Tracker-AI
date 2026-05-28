import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import type { CoverLetterData, ParsedCvContent } from '@/types';

function toneLabel(tone: string, lang: 'es' | 'en') {
  if (lang === 'en') {
    return tone === 'formal' ? 'formal and professional' : tone === 'semiformal' ? 'friendly and professional' : 'dynamic and direct';
  }
  return tone === 'formal' ? 'formal y profesional' : tone === 'semiformal' ? 'semiformal y amigable' : 'dinámico y directo';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { cvFileId, job, options } = await request.json() as {
      cvFileId: string;
      job: {
        position: string;
        company: string;
        requirements: string[];
        tech_stack: string[];
        description?: string;
      };
      options: {
        tone: 'formal' | 'semiformal' | 'dinamico';
        language: 'es' | 'en';
        highlight_remote: boolean;
        immediate_availability: boolean;
      };
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
        { error: 'CV no encontrado o no analizado.' },
        { status: 400 }
      );
    }

    const cvContent = cvFile.extracted_content as ParsedCvContent;
    const lang = options.language;
    const tone = toneLabel(options.tone, lang);
    const extras = [
      options.highlight_remote && (lang === 'en'
        ? 'Mention remote work experience or preference.'
        : 'Mencionar experiencia o preferencia por trabajo remoto.'),
      options.immediate_availability && (lang === 'en'
        ? 'Mention immediate availability.'
        : 'Mencionar disponibilidad inmediata.'),
    ].filter(Boolean).join(' ');

    const isEs = lang === 'es';

    const prompt = `${isEs ? 'Eres un experto en redacción de cartas de presentación profesionales.' : 'You are an expert at writing professional cover letters.'}

${isEs ? 'Datos del candidato (extraídos de su CV):' : 'Candidate data (extracted from their CV):'}
${JSON.stringify(cvContent, null, 2)}

${isEs ? 'Oferta de trabajo:' : 'Job offer:'}
- ${isEs ? 'Cargo' : 'Position'}: ${job.position}
- ${isEs ? 'Empresa' : 'Company'}: ${job.company}
- ${isEs ? 'Requisitos' : 'Requirements'}: ${job.requirements.join(', ')}
- Stack: ${job.tech_stack.join(', ')}
${job.description ? `- ${isEs ? 'Descripción' : 'Description'}: ${job.description.substring(0, 300)}` : ''}

${isEs ? `Escribe una carta de presentación en español.` : `Write a cover letter in English.`}
${isEs ? 'Tono' : 'Tone'}: ${tone}
${extras}

${isEs ? 'Estructura Harvard obligatoria:' : 'Required Harvard structure:'}
- ${isEs ? 'Párrafo 1: apertura impactante, cargo al que aplica y por qué esta empresa específicamente' : 'Paragraph 1: impactful opening, position applied for and why this specific company'}
- ${isEs ? 'Párrafo 2: experiencia más relevante con 1-2 logros cuantificables alineados a la oferta' : 'Paragraph 2: most relevant experience with 1-2 quantifiable achievements aligned with the offer'}
- ${isEs ? 'Párrafo 3: habilidades técnicas clave que coinciden con el stack requerido' : 'Paragraph 3: key technical skills matching the required stack'}
- ${isEs ? 'Párrafo 4: cierre profesional con call to action y disponibilidad' : 'Paragraph 4: professional closing with call to action and availability'}

${isEs ? 'Devuelve SOLO JSON:' : 'Return ONLY JSON:'}
{
  "subject": "${isEs ? 'asunto sugerido para el email, máximo 8 palabras' : 'suggested email subject, max 8 words'}",
  "salutation": "${isEs ? 'Estimado/a equipo de [empresa]:' : 'Dear [company] team,'}",
  "body": "${isEs ? 'carta completa con los 4 párrafos, sin saludo ni firma' : 'full letter with 4 paragraphs, no salutation or signature'}",
  "closing": "${isEs ? 'Atentamente,' : 'Sincerely,'}",
  "signature": "${cvContent.full_name}"
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system: isEs
        ? 'Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después.'
        : 'Reply ONLY with valid JSON, no markdown, no code blocks, no text before or after.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const generated: CoverLetterData = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    // Save to generated_cvs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('generated_cvs').insert({
      user_id: user.id,
      cv_file_id: cvFileId,
      position: job.position,
      company: job.company,
      type: 'cover_letter',
      language: options.language,
      content: generated,
    });

    return NextResponse.json(generated);
  } catch (error) {
    console.error('Generate cover letter error:', error);
    return NextResponse.json({ error: 'Error al generar la carta de presentación' }, { status: 500 });
  }
}
