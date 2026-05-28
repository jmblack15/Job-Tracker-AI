import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/anthropic';
import { AI_MODEL, AI_MAX_TOKENS } from '@/lib/constants';
import type { JobSearchResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { position, location, platforms } = await request.json() as {
      position: string;
      location: string;
      platforms: string[];
    };

    const platformsList = platforms.join(', ');
    const locationPart = location ? ` en ${location}` : '';

    const prompt = `Basándote en tu conocimiento, genera una lista de ofertas de trabajo representativas para el puesto de "${position}"${locationPart} en las plataformas: ${platformsList}.

Responde ÚNICAMENTE con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después:

{
  "jobs": [
    {
      "title": "título del puesto",
      "company": "empresa",
      "location": "ciudad o país",
      "modality": "Remoto | Híbrido | Presencial",
      "salary": "rango salarial o null",
      "description": "descripción breve de 1-2 líneas",
      "url": null,
      "platform": "nombre de la plataforma",
      "posted_at": null
    }
  ],
  "tips": ["consejo 1", "consejo 2", "consejo 3"],
  "summary": {
    "total": número,
    "platforms_found": ["plataformas con resultados"],
    "platforms_not_found": []
  }
}

Reglas: nunca omitas un campo (usa null), tips debe tener exactamente 3 elementos, genera al menos 5 ofertas representativas.`;

    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: 'Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después.',
      messages: [{ role: 'user', content: prompt }],
    });

    const fullText = message.content.find((b) => b.type === 'text')?.text ?? '';

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    const rawJson = jsonMatch ? jsonMatch[0] : fullText;

    try {
      const result: JobSearchResult = JSON.parse(rawJson);
      return NextResponse.json({ result });
    } catch {
      return NextResponse.json({ result: null, fallback: fullText.trim() });
    }
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json({ error: 'Error en la búsqueda' }, { status: 500 });
  }
}
