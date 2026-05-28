import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApplicationsBarChart } from '@/components/features/charts/applications-bar-chart';
import { StatusPieChart } from '@/components/features/charts/status-pie-chart';
import { formatDate } from '@/lib/utils';
import { subDays } from 'date-fns';
import type { Application } from '@/types';
import { TrendingUp, Briefcase, MessageSquare, Percent } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: applications = [] } = await (supabase as any)
    .from('applications')
    .select('*')
    .order('applied_at', { ascending: false }) as { data: Application[] };

  const total = applications.length;
  const last30 = applications.filter(
    (a) => new Date(a.applied_at) >= subDays(new Date(), 30)
  ).length;
  const interviews = applications.filter((a) => a.status === 'Entrevista').length;
  const responded = applications.filter(
    (a) => a.status !== 'Aplicado'
  ).length;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  const metrics = [
    { label: 'Total aplicaciones', value: total, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Últimos 30 días', value: last30, icon: TrendingUp, color: 'text-[#1D9E75]', bg: 'bg-[#1D9E75]/10' },
    { label: 'Entrevistas', value: interviews, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tasa de respuesta', value: `${responseRate}%`, icon: Percent, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const recent = applications.slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de tu búsqueda de empleo</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Aplicaciones por semana</h2>
          </CardHeader>
          <CardContent>
            <ApplicationsBarChart applications={applications} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Por estado</h2>
          </CardHeader>
          <CardContent>
            <StatusPieChart applications={applications} />
          </CardContent>
        </Card>
      </div>

      {/* Recent applications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Aplicaciones recientes</h2>
            <Link href="/applications" className="text-sm text-[#1D9E75] hover:underline">
              Ver todas
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cargo</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Sin aplicaciones aún. <Link href="/applications" className="text-[#1D9E75] hover:underline">Agrega una</Link>
                  </td>
                </tr>
              ) : (
                recent.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/applications/${app.id}`} className="font-medium text-gray-900 hover:text-[#1D9E75]">
                        {app.position}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{app.company}</td>
                    <td className="px-6 py-3 text-gray-500 hidden sm:table-cell">{formatDate(app.applied_at)}</td>
                    <td className="px-6 py-3">
                      <Badge status={app.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
