'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchResults, SearchResultsSkeleton } from '@/components/features/search/SearchResults';
import { toast } from 'sonner';
import type { JobSearchResult } from '@/types';

const PLATFORMS = ['LinkedIn', 'Indeed', 'Computrabajo', 'OCCMundial', 'Glassdoor', 'Bumeran'];

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: JobSearchResult | null; fallback?: string };

export default function SearchPage() {
  const [position, setPosition] = useState('');
  const [location, setLocation] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn', 'Indeed']);
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  async function handleSearch() {
    if (!position.trim()) {
      toast.error('Ingresa un cargo para buscar');
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Selecciona al menos una plataforma');
      return;
    }
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, location, platforms: selectedPlatforms }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setState({
        status: 'done',
        result: data.result ?? null,
        fallback: data.fallback,
      });
    } catch {
      toast.error('Error en la búsqueda');
      setState({ status: 'idle' });
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buscar empleos</h1>
        <p className="text-sm text-gray-500 mt-1">Búsqueda asistida por IA en múltiples plataformas</p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="position"
              label="Cargo"
              placeholder="Ej: Frontend Developer"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Input
              id="location"
              label="Ubicación"
              placeholder="Ej: México, Remoto"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Plataformas</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedPlatforms.includes(platform)
                      ? 'bg-[#1D9E75] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSearch}
            loading={state.status === 'loading'}
            className="w-full"
          >
            <Search className="h-4 w-4" />
            Buscar empleos
          </Button>
        </CardContent>
      </Card>

      {state.status === 'loading' && <SearchResultsSkeleton />}

      {state.status === 'done' && (
        <SearchResults result={state.result} fallback={state.fallback} />
      )}
    </div>
  );
}
