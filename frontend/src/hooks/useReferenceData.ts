import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';

type Row = { id?: string; type: string; registration: string };
type SpecialFleet = { id: string; name: string; rows: Row[] };

export function useReferenceData() {
  const [countries, setCountries] = useState<[string, string][]>([]);
  const [airports, setAirports] = useState<[string, string][]>([]);
  const [owned, setOwned] = useState<Row[]>([]);
  const [acmi, setAcmi] = useState<Row[]>([]);
  const [specialFleets, setSpecialFleets] = useState<SpecialFleet[]>([]);

  useEffect(() => {
    apiGet<{ countries: [string, string][] }>('/reference/countries').then((r) => setCountries(r.countries));
    apiGet<{ airports: [string, string][] }>('/reference/domestic-airports').then((r) => setAirports(r.airports));
    apiGet<{ owned: Row[]; acmi: Row[] }>('/reference/fleet').then((r) => {
      setOwned(r.owned);
      setAcmi(r.acmi);
    });
    apiGet<{ specialFleets: SpecialFleet[] }>('/reference/fleet/special').then((r) => setSpecialFleets(r.specialFleets));
  }, []);

  return { countries, airports, owned, acmi, specialFleets };
}

export function groupFleetRows(rows: Row[]): Record<string, string[]> {
  const g: Record<string, string[]> = {};
  rows.forEach((r) => {
    if (!r.type) return;
    if (!g[r.type]) g[r.type] = [];
    if (r.registration) g[r.type].push(r.registration);
  });
  return g;
}
