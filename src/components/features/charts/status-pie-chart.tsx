'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Application } from '@/types';
import { APPLICATION_STATUSES, PIE_COLORS } from '@/lib/constants';

interface Props {
  applications: Application[];
}

export function StatusPieChart({ applications }: Props) {
  const data = APPLICATION_STATUSES
    .map((status) => ({
      name: status,
      value: applications.filter((a) => a.status === status).length,
      color: PIE_COLORS[status],
    }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
        Sin datos aún
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px' }}
          formatter={(value, name) => [value, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
