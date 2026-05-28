'use client';

import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import type { CoverLetterData, ParsedCvContent } from '@/types';

function buildPlainText(letter: CoverLetterData): string {
  const lines: string[] = [];
  if (letter.subject) lines.push(`Asunto: ${letter.subject}`, '');
  if (letter.salutation) lines.push(letter.salutation, '');
  lines.push(letter.body, '');
  lines.push(letter.closing);
  lines.push(letter.signature);
  return lines.join('\n');
}

interface Props {
  letter: CoverLetterData;
  candidate?: ParsedCvContent | null;
  language: 'es' | 'en';
  filename?: string;
}

export function CoverLetterPreview({ letter, candidate, language, filename }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isEn = language === 'en';

  async function handleDownload() {
    setDownloading(true);
    try {
      const [{ pdf }, { CoverLetterPdfDocument }, React] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./CoverLetterPdfDocument'),
        import('react'),
      ]);
      const blob = await pdf(
        React.createElement(CoverLetterPdfDocument, { letter, candidate, language })
      ).toBlob();
      const { saveAs } = await import('file-saver');
      const name = filename ?? (isEn
        ? `CoverLetter_${letter.signature.replace(/\s+/g, '_')}.pdf`
        : `CartaPresentacion_${letter.signature.replace(/\s+/g, '_')}.pdf`);
      saveAs(blob, name);
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyAll() {
    await navigator.clipboard.writeText(buildPlainText(letter));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopySubject() {
    await navigator.clipboard.writeText(letter.subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  }

  const paragraphs = letter.body.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-3">
      {/* Subject line */}
      {letter.subject && (
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-xs font-semibold text-gray-500 shrink-0">
            {isEn ? 'Subject:' : 'Asunto:'}
          </span>
          <span className="text-xs text-gray-800 flex-1">{letter.subject}</span>
          <button
            onClick={handleCopySubject}
            className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            title={isEn ? 'Copy subject' : 'Copiar asunto'}
          >
            {copiedSubject ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? (isEn ? 'Copied' : 'Copiado') : (isEn ? 'Copy text' : 'Copiar texto')}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1D9E75] text-white rounded-lg hover:bg-[#178860] disabled:opacity-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? '...' : (isEn ? 'Download PDF' : 'Descargar PDF')}
        </button>
      </div>

      {/* Letter preview */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-4">
        <div
          className="bg-white mx-auto shadow-sm"
          style={{ maxWidth: '680px', padding: '48px', fontFamily: 'Georgia, serif', lineHeight: 1.7 }}
        >
          {/* Candidate header */}
          {candidate && (
            <>
              <p className="text-sm font-bold">{candidate.full_name}</p>
              <p className="text-xs text-gray-500 mb-4">
                {[candidate.email, candidate.phone, candidate.location].filter(Boolean).join('  |  ')}
              </p>
              <hr className="border-gray-400 mb-4" />
            </>
          )}

          {/* Date */}
          <p className="text-xs text-gray-500 text-right mb-5">
            {new Date().toLocaleDateString(isEn ? 'en-US' : 'es-ES', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>

          {/* Salutation */}
          {letter.salutation && (
            <p className="text-sm font-semibold mb-4">{letter.salutation}</p>
          )}

          {/* Body */}
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-gray-800 mb-4 text-justify">{p}</p>
          ))}

          {/* Closing */}
          <p className="text-sm font-semibold mt-6 mb-1">{letter.closing}</p>
          <p className="text-sm font-bold">{letter.signature}</p>
        </div>
      </div>
    </div>
  );
}
