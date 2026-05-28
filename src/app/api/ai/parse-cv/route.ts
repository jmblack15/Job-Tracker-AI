import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import type { ParsedCvContent } from '@/types';

const PARSE_PROMPT = `Extrae toda la información de este CV y devuelve SOLO JSON válido con esta estructura exacta (usa null para campos no encontrados, arrays vacíos si no hay datos):

{
  "full_name": "nombre completo",
  "email": "email o null",
  "phone": "teléfono o null",
  "linkedin": "URL de LinkedIn o null",
  "location": "ciudad/país o null",
  "summary": "resumen profesional existente o null",
  "experience": [
    {
      "company": "empresa",
      "position": "cargo",
      "start_date": "mes año o año",
      "end_date": "mes año o año o null",
      "current": true,
      "location": "ciudad o null",
      "responsibilities": ["responsabilidad 1"],
      "achievements": ["logro 1"]
    }
  ],
  "education": [
    {
      "institution": "institución",
      "degree": "título",
      "field": "área de estudio o null",
      "start_date": "año",
      "end_date": "año o null",
      "gpa": "promedio o null"
    }
  ],
  "skills": {
    "technical": ["habilidad técnica"],
    "soft": ["habilidad blanda"],
    "languages": ["idioma con nivel"]
  },
  "certifications": [
    {
      "name": "nombre",
      "issuer": "emisor",
      "date": "fecha o null",
      "url": "url o null"
    }
  ],
  "projects": [
    {
      "name": "nombre",
      "description": "descripción",
      "technologies": ["tecnología"],
      "url": "url o null"
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { cvFileId, filePath } = await request.json() as { cvFileId: string; filePath: string };

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cvs')
      .download(filePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'No se pudo descargar el archivo. Verifica que el CV esté en Storage.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      system: 'Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después.',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Data,
            },
          } as { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } },
          {
            type: 'text',
            text: PARSE_PROMPT,
          },
        ],
      }],
    });

    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed: ParsedCvContent = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('cv_files')
      .update({ is_parsed: true, extracted_content: parsed })
      .eq('id', cvFileId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ parsed });
  } catch (error) {
    console.error('Parse CV error:', error);
    return NextResponse.json({ error: 'Error al analizar el CV' }, { status: 500 });
  }
}
