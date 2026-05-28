'use client';

import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import type { GeneratedCvData } from '@/types';

const LABELS = {
  es: {
    summary: 'RESUMEN PROFESIONAL',
    experience: 'EXPERIENCIA',
    education: 'EDUCACIÓN',
    skills: 'HABILIDADES',
    certifications: 'CERTIFICACIONES',
    projects: 'PROYECTOS',
    technical: 'Técnicas',
    soft: 'Blandas',
    languages: 'Idiomas',
    download: 'Descargar PDF',
    copy: 'Copiar texto',
    copied: 'Copiado',
  },
  en: {
    summary: 'PROFESSIONAL SUMMARY',
    experience: 'EXPERIENCE',
    education: 'EDUCATION',
    skills: 'SKILLS',
    certifications: 'CERTIFICATIONS',
    projects: 'PROJECTS',
    technical: 'Technical',
    soft: 'Soft Skills',
    languages: 'Languages',
    download: 'Download PDF',
    copy: 'Copy text',
    copied: 'Copied',
  },
} as const;

function buildPlainText(cv: GeneratedCvData, language: 'es' | 'en'): string {
  const L = LABELS[language];
  const lines: string[] = [];
  const { personal_info: p } = cv;

  lines.push(p.full_name.toUpperCase());
  lines.push([p.email, p.phone, p.linkedin, p.location].filter(Boolean).join(' | '));
  lines.push('');

  if (cv.professional_summary) {
    lines.push(L.summary);
    lines.push(cv.professional_summary);
    lines.push('');
  }

  if (cv.experience.length > 0) {
    lines.push(L.experience);
    cv.experience.forEach((e) => {
      lines.push(`${e.company} — ${e.position} (${e.period})`);
      if (e.location) lines.push(`  ${e.location}`);
      e.bullets.forEach((b) => lines.push(`  ${b}`));
      lines.push('');
    });
  }

  if (cv.education.length > 0) {
    lines.push(L.education);
    cv.education.forEach((e) => {
      lines.push(`${e.institution} — ${e.degree} (${e.period})`);
      if (e.details) lines.push(`  ${e.details}`);
    });
    lines.push('');
  }

  lines.push(L.skills);
  if (cv.skills.technical.length > 0) lines.push(`${L.technical}: ${cv.skills.technical.join(', ')}`);
  if (cv.skills.soft.length > 0) lines.push(`${L.soft}: ${cv.skills.soft.join(', ')}`);
  if (cv.skills.languages.length > 0) lines.push(`${L.languages}: ${cv.skills.languages.join(', ')}`);
  lines.push('');

  if (cv.certifications.length > 0) {
    lines.push(L.certifications);
    cv.certifications.forEach((c) => lines.push(`${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ''}`));
    lines.push('');
  }

  if (cv.projects.length > 0) {
    lines.push(L.projects);
    cv.projects.forEach((p) => {
      lines.push(p.name);
      lines.push(`  ${p.description}`);
      if (p.technologies) lines.push(`  ${p.technologies}`);
    });
  }

  return lines.join('\n');
}

interface Props {
  cv: GeneratedCvData;
  language: 'es' | 'en';
  filename?: string;
}

export function CvPreview({ cv, language, filename }: Props) {
  const L = LABELS[language];
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const [{ pdf }, { CvPdfDocument }, React] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./CvPdfDocument'),
        import('react'),
      ]);
      const blob = await pdf(
        React.createElement(CvPdfDocument, { cv, language })
      ).toBlob();
      const { saveAs } = await import('file-saver');
      saveAs(blob, filename ?? `CV_${cv.personal_info.full_name.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildPlainText(cv, language));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const { personal_info: p } = cv;
  const contact = [p.email, p.phone, p.linkedin, p.location].filter(Boolean).join('  |  ');

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? L.copied : L.copy}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1D9E75] text-white rounded-lg hover:bg-[#178860] disabled:opacity-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? '...' : L.download}
        </button>
      </div>

      {/* A4 Preview */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-4">
        <div
          className="bg-white mx-auto shadow-sm"
          style={{ width: '794px', minHeight: '1123px', padding: '56px', fontFamily: 'serif', maxWidth: '100%' }}
        >
          {/* Header */}
          <h1 className="text-center text-2xl font-bold tracking-wide mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {p.full_name}
          </h1>
          {contact && (
            <p className="text-center text-xs text-gray-600 mb-3">{contact}</p>
          )}
          <hr className="border-black border-t-2 mb-3" />

          {/* Summary */}
          {cv.professional_summary && (
            <section className="mb-4">
              <h2 className="text-xs font-bold tracking-widest border-b border-gray-400 pb-0.5 mb-2">{L.summary}</h2>
              <p className="text-xs leading-relaxed text-gray-800">{cv.professional_summary}</p>
            </section>
          )}

          {/* Experience */}
          {cv.experience.length > 0 && (
            <section className="mb-4">
              <h2 className="text-xs font-bold tracking-widest border-b border-gray-400 pb-0.5 mb-2">{L.experience}</h2>
              {cv.experience.map((exp, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold">{exp.company}</span>
                    <span className="text-xs text-gray-500">{exp.period}</span>
                  </div>
                  <p className="text-xs italic text-gray-700 mb-1">{exp.position}{exp.location ? ` — ${exp.location}` : ''}</p>
                  {exp.bullets.map((b, j) => (
                    <p key={j} className="text-xs text-gray-800 ml-3 leading-relaxed">{b}</p>
                  ))}
                </div>
              ))}
            </section>
          )}

          {/* Education */}
          {cv.education.length > 0 && (
            <section className="mb-4">
              <h2 className="text-xs font-bold tracking-widest border-b border-gray-400 pb-0.5 mb-2">{L.education}</h2>
              {cv.education.map((edu, i) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold">{edu.institution}</span>
                    <span className="text-xs text-gray-500">{edu.period}</span>
                  </div>
                  <p className="text-xs text-gray-700">{edu.degree}</p>
                  {edu.details && <p className="text-xs text-gray-500">{edu.details}</p>}
                </div>
              ))}
            </section>
          )}

          {/* Skills */}
          <section className="mb-4">
            <h2 className="text-xs font-bold tracking-widest border-b border-gray-400 pb-0.5 mb-2">{L.skills}</h2>
            {cv.skills.technical.length > 0 && (
              <div className="flex gap-1 mb-1">
                <span className="text-xs font-bold min-w-[72px]">{L.technical}:</span>
                <span className="text-xs text-gray-800">{cv.skills.technical.join(', ')}</span>
              </div>
            )}
            {cv.skills.soft.length > 0 && (
              <div className="flex gap-1 mb-1">
                <span className="text-xs font-bold min-w-[72px]">{L.soft}:</span>
                <span className="text-xs text-gray-800">{cv.skills.soft.join(', ')}</span>
              </div>
            )}
            {cv.skills.languages.length > 0 && (
              <div className="flex gap-1">
                <span className="text-xs font-bold min-w-[72px]">{L.languages}:</span>
                <span className="text-xs text-gray-800">{cv.skills.languages.join(', ')}</span>
              </div>
            )}
          </section>

          {/* Certifications */}
          {cv.certifications.length > 0 && (
            <section className="mb-4">
              <h2 className="text-xs font-bold tracking-widest border-b border-gray-400 pb-0.5 mb-2">{L.certifications}</h2>
              {cv.certifications.map((cert, i) => (
                <div key={i} className="mb-1.5">
                  <span className="text-xs font-bold">{cert.name}</span>
                  <span className="text-xs text-gray-600"> — {cert.issuer}{cert.date ? ` (${cert.date})` : ''}</span>
                </div>
              ))}
            </section>
          )}

          {/* Projects */}
          {cv.projects.length > 0 && (
            <section>
              <h2 className="text-xs font-bold tracking-widest border-b border-gray-400 pb-0.5 mb-2">{L.projects}</h2>
              {cv.projects.map((proj, i) => (
                <div key={i} className="mb-2">
                  <p className="text-xs font-bold">{proj.name}</p>
                  <p className="text-xs text-gray-800 leading-relaxed">{proj.description}</p>
                  {proj.technologies && <p className="text-xs italic text-gray-500">{proj.technologies}</p>}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
