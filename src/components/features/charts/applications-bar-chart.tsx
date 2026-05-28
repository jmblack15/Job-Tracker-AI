'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Application } from '@/types';
import { format, startOfWeek, addDays, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  applications: Application[];
}

function buildWeeklyData(applications: Application[]) {
  const weeks = 8;
  const now = new Date();

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, weeks - 1 - i), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);

    const count = applications.filter((a) => {
      const d = new Date(a.applied_at);
      return d >= weekStart && d <= weekEnd;
    }).length;

    return {
      week: format(weekStart, 'd MMM', { locale: es }),
      count,
    };
  });
}

export function ApplicationsBarChart({ applications }: Props) {
  const data = buildWeeklyData(applications);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
        <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px' }}
          cursor={{ fill: '#F9FAFB' }}
        />
        <Bar dataKey="count" name="Aplicaciones" fill="#1D9E75" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
