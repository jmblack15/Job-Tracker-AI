import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/anthropic';
import { AI_MODEL, AI_MAX_TOKENS } from '@/lib/constants';

function buildPrompt(body: {
  mode: string;
  position?: string;
  company?: string;
  description?: string;
  jobOffer?: string;
  profile?: string;
}): string {
  const { mode, position, company, description, jobOffer, profile } = body;

  const context = [
    position && `Cargo: ${position}`,
    company && `Empresa: ${company}`,
    description && `Descripción de la oferta: ${description}`,
    jobOffer && `Oferta de trabajo: ${jobOffer}`,
    profile && `Perfil del candidato: ${profile}`,
  ].filter(Boolean).join('\n');

  switch (mode) {
    case 'interview-questions':
      return `Eres un experto en recursos humanos. Basándote en el siguiente cargo y empresa, genera 10 preguntas de entrevista que probablemente hagan, con tips para responderlas.\n\n${context}`;
    case 'cover-letter':
      return `Eres un experto en redacción profesional. Escribe una carta de presentación profesional, personalizada y convincente para el siguiente puesto.\n\n${context}\n\nLa carta debe tener un tono profesional pero cercano, con 3 párrafos: introducción, experiencia relevante y cierre.`;
    case 'tips':
      return `Eres un coach de carrera. Basándote en esta oferta de empleo, da 8 tips específicos y accionables para aumentar las probabilidades de conseguir este trabajo.\n\n${context}`;
    case 'cv-profile':
      return `Eres un experto en redacción de CVs. Escribe un perfil profesional breve (3-4 líneas) para un CV, basado en la experiencia del candidato. Debe ser impactante y orientado a resultados.\n\n${context}`;
    case 'linkedin-summary':
      return `Eres un experto en LinkedIn y marca personal. Escribe un resumen de LinkedIn atractivo (máximo 300 palabras) en primera persona, que destaque la propuesta de valor del candidato y sea optimizado para búsquedas.\n\n${context}`;
    default:
      return `Ayuda al candidato con lo siguiente:\n\n${context}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = buildPrompt(body);
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });
    const result = message.content.find((b) => b.type === 'text')?.text ?? '';
    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI generate error:', error);
    return NextResponse.json({ error: 'Error al generar contenido' }, { status: 500 });
  }
}
