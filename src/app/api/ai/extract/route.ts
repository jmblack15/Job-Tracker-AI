import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/anthropic';
import { AI_MODEL, AI_MAX_TOKENS } from '@/lib/constants';
import type { ExtractedJob } from '@/types';

async function fetchJobContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 6000);
  } catch {
    return null;
  }
}

const SCHEMA = `{
  "position": "título exacto del cargo",
  "company": "nombre de la empresa",
  "location": "ciudad o país",
  "modality": "Remoto | Híbrido | Presencial",
  "salary": "rango salarial o null",
  "requirements": ["requisito 1", ...],
  "nice_to_have": ["deseable 1", ...],
  "responsibilities": ["responsabilidad 1", ...],
  "contract_type": "tipo de contrato o null",
  "experience_years": "años requeridos o null",
  "tech_stack": ["tecnología 1", ...],
  "raw_text": "primeros 400 caracteres del texto original"
}`;

export async function POST(request: NextRequest) {
  try {
    const { text, url } = await request.json() as { text?: string; url?: string };

    let jobText = text?.trim() ?? '';

    if (!jobText && url) {
      const fetched = await fetchJobContent(url);
      if (!fetched) {
        return NextResponse.json(
          { error: 'FETCH_FAILED', message: 'No se pudo obtener el contenido de la URL. Pega el texto manualmente.' },
          { status: 422 }
        );
      }
      jobText = fetched;
    }

    if (!jobText) {
      return NextResponse.json({ error: 'Se requiere texto o URL' }, { status: 400 });
    }

    const prompt = `Extrae los datos estructurados de esta oferta de trabajo.

OFERTA:
${jobText.substring(0, 5000)}

Responde ÚNICAMENTE con JSON válido siguiendo este schema exacto (usa null para campos no encontrados, arrays vacíos si no hay datos):
${SCHEMA}

Reglas:
- requirements: máximo 8 requisitos clave
- nice_to_have: máximo 5 deseables
- responsibilities: máximo 6 responsabilidades
- tech_stack: todas las tecnologías, frameworks, herramientas mencionadas
- raw_text: los primeros 400 caracteres del texto de la oferta`;

    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: 'Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text_result = message.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonMatch = text_result.match(/\{[\s\S]*\}/);
    const rawJson = jsonMatch ? jsonMatch[0] : text_result;
    const extracted: ExtractedJob = JSON.parse(rawJson);

    return NextResponse.json(extracted);
  } catch (error) {
    console.error('Extract error:', error);
    return NextResponse.json({ error: 'Error al extraer la oferta' }, { status: 500 });
  }
}
