import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Application, Note } from '@/types';
import { ApplicationDetailClient } from './application-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [{ data: app }, { data: notes }] = await Promise.all([
    db.from('applications').select('*').eq('id', id).single(),
    db.from('notes').select('*').eq('application_id', id).order('created_at', { ascending: false }),
  ]);

  if (!app) notFound();

  return (
    <ApplicationDetailClient
      application={app as Application}
      initialNotes={(notes ?? []) as Note[]}
    />
  );
}
