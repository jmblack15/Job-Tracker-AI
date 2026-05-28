import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import type { GeneratedCvData, ParsedCvContent } from '@/types';

function toneLabel(tone: string) {
  return tone === 'formal' ? 'formal y profesional' : 'semiformal y amigable';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { cvFileId, job, options, additional_context, confirmed_skills } = await request.json() as {
      cvFileId: string;
      job: {
        position: string;
        company: string;
        requirements: string[];
        tech_stack: string[];
        responsibilities: string[];
        description?: string;
      };
      options: {
        tone: 'formal' | 'semiformal';
        highlight_remote: boolean;
        language: 'es' | 'en';
      };
      additional_context?: string;
      confirmed_skills?: { skill: string; level: string }[];
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

    const cvContent = cvFile.extracted_content as ParsedCvContent;
    const lang = options.language === 'en' ? 'inglés' : 'español';
    const extras = [
      options.highlight_remote && (options.language === 'en'
        ? 'Highlight remote work experience or preference.'
        : 'Destacar experiencia o interés en trabajo remoto.'),
    ].filter(Boolean).join(' ');

    const prompt = `Eres un experto en recursos humanos y redacción de CVs profesionales.

CV base del candidato:
${JSON.stringify(cvContent, null, 2)}

Oferta de trabajo:
- Cargo: ${job.position}
- Empresa: ${job.company}
- Requisitos: ${job.requirements.join(', ')}
- Stack técnico: ${job.tech_stack.join(', ')}
- Responsabilidades: ${job.responsibilities.join(', ')}

Genera un CV personalizado en formato Harvard adaptado a esta oferta.
Idioma: ${lang}
Tono: ${toneLabel(options.tone)}
${extras}

Devuelve SOLO JSON con esta estructura exacta:
{
  "personal_info": {
    "full_name": "nombre completo",
    "email": "email",
    "phone": "teléfono",
    "linkedin": "url linkedin o vacío",
    "location": "ciudad/país"
  },
  "professional_summary": "3-4 líneas potentes orientadas a la oferta",
  "experience": [
    {
      "company": "empresa",
      "position": "cargo",
      "period": "Ene 2022 – Dic 2023",
      "location": "ciudad o Remoto",
      "bullets": ["• Verbo acción + impacto cuantificado", "• ..."]
    }
  ],
  "education": [
    {
      "institution": "institución",
      "degree": "título",
      "period": "2018 – 2022",
      "details": "detalle adicional o null"
    }
  ],
  "skills": {
    "technical": ["habilidad técnica relevante"],
    "soft": ["habilidad blanda"],
    "languages": ["idioma con nivel"]
  },
  "certifications": [
    {
      "name": "certificación",
      "issuer": "emisor",
      "date": "fecha"
    }
  ],
  "projects": [
    {
      "name": "proyecto",
      "description": "descripción breve con impacto",
      "technologies": "React, Node.js, PostgreSQL"
    }
  ],
  "keywords_integrated": ["keyword de la oferta integrada"]
}

Reglas Harvard:
- Verbos de acción al inicio de cada bullet (Developed, Led, Implemented / Desarrollé, Lideré, Implementé)
- Incluir métricas cuantificables donde sea posible
- Ordenar experiencia de más reciente a más antigua
- Máximo 4 bullets por experiencia
- skills.technical: máximo 10, priorizando los que coinciden con la oferta
- Adaptar terminología al idioma seleccionado${
      confirmed_skills?.length
        ? `\n\nEl candidato confirma conocer estas tecnologías adicionales que no estaban en su CV original:\n${confirmed_skills
            .map((s) => `- ${s.skill}: nivel ${s.level}`)
            .join('\n')}\nAgrégalas naturalmente en la sección de habilidades técnicas y mencionarlas donde sea relevante en la experiencia. Ser honesto con el nivel indicado.`
        : ''
    }${additional_context ? `\n\nContexto adicional — incorporar estos cambios específicos:\n${additional_context}` : ''}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      system: 'Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto antes ni después.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const generated: GeneratedCvData = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    // Save to generated_cvs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('generated_cvs').insert({
      user_id: user.id,
      cv_file_id: cvFileId,
      position: job.position,
      company: job.company,
      type: 'cv',
      language: options.language,
      content: generated,
    });

    return NextResponse.json(generated);
  } catch (error) {
    console.error('Generate CV error:', error);
    return NextResponse.json({ error: 'Error al generar el CV' }, { status: 500 });
  }
}
