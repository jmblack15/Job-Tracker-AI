'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, DollarSign, ExternalLink, Sparkles, Trash2, Plus } from 'lucide-react';
import { useUpdateApplication } from '@/hooks/use-applications';
import { useNotes, useCreateNote, useDeleteNote } from '@/hooks/use-notes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { APPLICATION_STATUSES, STATUS_TIMELINE } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { Application, ApplicationStatus, Note } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusOptions = APPLICATION_STATUSES.map((s) => ({ value: s, label: s }));

const AI_MODES = [
  { value: 'interview-questions', label: 'Preguntas de entrevista' },
  { value: 'cover-letter', label: 'Carta de presentación' },
  { value: 'tips', label: 'Tips para aplicar' },
] as const;

interface Props {
  application: Application;
  initialNotes: Note[];
}

export function ApplicationDetailClient({ application, initialNotes }: Props) {
  const router = useRouter();
  const update = useUpdateApplication();
  const { data: notes = initialNotes } = useNotes(application.id);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const [noteContent, setNoteContent] = useState('');
  const [aiMode, setAiMode] = useState<string>('interview-questions');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  async function handleStatusChange(status: ApplicationStatus) {
    update.mutate({ id: application.id, status });
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    await createNote.mutateAsync({ applicationId: application.id, content: noteContent });
    setNoteContent('');
  }

  async function handleDeleteNote(noteId: string) {
    deleteNote.mutate({ id: noteId, applicationId: application.id });
  }

  async function handleAiGenerate() {
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: aiMode,
          position: application.position,
          company: application.company,
          description: application.description,
        }),
      });
      if (!res.ok) throw new Error('Error en la petición');
      const { result } = await res.json();
      setAiResult(result);
    } catch {
      toast.error('Error al generar con IA');
    } finally {
      setAiLoading(false);
    }
  }

  const currentStep = STATUS_TIMELINE.indexOf(application.status as (typeof STATUS_TIMELINE)[number]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{application.position}</h1>
          <p className="text-lg text-gray-600 mt-0.5">{application.company}</p>
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
            {application.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {application.location}
              </span>
            )}
            {application.salary_range && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {application.salary_range}
              </span>
            )}
            {application.url && (
              <a
                href={application.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#1D9E75] hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Ver oferta
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge status={application.status} />
          <Select
            id="status-change"
            options={statusOptions}
            value={application.status}
            onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
            className="w-40"
          />
        </div>
      </div>

      {/* Timeline */}
      {application.status !== 'Rechazado' && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-0">
              {STATUS_TIMELINE.map((step, idx) => {
                const active = idx <= currentStep;
                const isLast = idx === STATUS_TIMELINE.length - 1;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                          active
                            ? 'bg-[#1D9E75] border-[#1D9E75] text-white'
                            : 'bg-white border-gray-200 text-gray-400'
                        )}
                      >
                        {idx + 1}
                      </div>
                      <span className={cn('text-xs mt-1 text-center', active ? 'text-[#1D9E75] font-medium' : 'text-gray-400')}>
                        {step}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={cn('h-0.5 flex-1 mx-1 transition-colors', idx < currentStep ? 'bg-[#1D9E75]' : 'bg-gray-200')} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {application.status === 'Rechazado' && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          Esta aplicación fue marcada como Rechazado.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes panel */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Notas</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Escribe una nota..."
                rows={2}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                loading={createNote.isPending}
                disabled={!noteContent.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin notas aún</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="group bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    <div className="flex justify-between gap-2">
                      <p className="flex-1 whitespace-pre-wrap">{note.content}</p>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(note.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#1D9E75]" />
              <h2 className="text-sm font-semibold text-gray-700">Asistente IA</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              id="ai-mode"
              label="Tipo de generación"
              value={aiMode}
              options={AI_MODES.map((m) => ({ value: m.value, label: m.label }))}
              onChange={(e) => setAiMode(e.target.value)}
            />

            <Button onClick={handleAiGenerate} loading={aiLoading} className="w-full">
              <Sparkles className="h-4 w-4" />
              Generar
            </Button>

            {aiResult && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-72 overflow-y-auto">
                {aiResult}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {application.description && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Descripción</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{application.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
