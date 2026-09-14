import { FORM_TYPES } from '../types';
import type { Application } from '../types';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function parseDMY(str: string | null | undefined): { year: number; month: number } | null {
  if (!str || typeof str !== 'string') return null;
  str = str.trim();
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const day = +m[1], month = +m[2], year = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month };
  }
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const year = +m[1], month = +m[2], day = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month };
  }
  return null;
}

function recordMonthInfo(rec: Application) {
  const cfg = FORM_TYPES[rec.type] || ({} as any);
  const dateStrings: (string | undefined)[] = [];
  if (cfg.hasTravelProgram && rec.data.travelProgramEnabled) {
    (rec.data.travelPages || []).forEach((p: any) => {
      if (p && p.flight) dateStrings.push(p.flight.periodFrom, p.flight.periodTo);
    });
  } else if (cfg.multiCountry) {
    (rec.data.countrySections || []).forEach((sec: any) => (sec.rows || []).forEach((r: any) => dateStrings.push(r.periodFrom, r.periodTo)));
  } else {
    (rec.data.rows || []).forEach((r: any) => dateStrings.push(r.periodFrom, r.periodTo));
  }
  const parsed = dateStrings.map(parseDMY).filter(Boolean) as { year: number; month: number }[];
  const monthKeys = new Set(parsed.map((p) => `${p.year}-${p.month}`));
  if (monthKeys.size === 0) {
    const c = parseDMY(rec.createdAt.slice(0, 10));
    if (c) monthKeys.add(`${c.year}-${c.month}`);
  }
  return { monthKeys, isMultiMonth: monthKeys.size > 1 };
}

function recordArchiveCountries(rec: Application): string[] {
  const cfg = FORM_TYPES[rec.type] || ({} as any);
  if (cfg.noCountry) return ['No Country / N/A'];
  if (cfg.hasTravelProgram && rec.data.travelProgramEnabled) {
    const set = new Set<string>();
    (rec.data.travelPages || []).forEach((p: any) => {
      if (p && p.flight && (p.flight.flightNo1 || p.flight.route1 || p.flight.flightNo2 || p.flight.route2)) {
        const c = p.flight.countryEn === 'Other' ? p.flight.countryOther || 'Other' : p.flight.countryEn;
        if (c) set.add(c);
      }
    });
    return set.size ? [...set] : ['Unspecified'];
  }
  if (cfg.multiCountry) {
    const set = new Set<string>();
    (rec.data.countrySections || []).forEach((sec: any) => {
      const c = sec.countryEn === 'Other' ? sec.countryOther || 'Other' : sec.countryEn;
      if (c) set.add(c);
    });
    return set.size ? [...set] : ['Unspecified'];
  }
  const meta = rec.data.meta || {};
  const c = meta.countryEn === 'Other' ? meta.countryOther || 'Other' : meta.countryEn;
  return [c || 'Unspecified'];
}

function seasonCodeFor(rec: Application) {
  const meta = rec.data.meta || {};
  const season = meta.seasonEn || 'Summer';
  const year = meta.year || String(new Date().getFullYear());
  return `${season === 'Winter' ? 'W' : 'S'}${String(year).slice(-2)}`;
}

export type MonthBucket = { label: string; sortKey: number; recs: Application[] };
export type MonthMap = Record<string, MonthBucket>;
export type CountryTree = Record<string, MonthMap>;
export type SeasonTree = Record<string, { schedule: Application[]; charter: Application[] }>;

export type ArchiveTree = {
  seasonTree: SeasonTree;
  positioningByMonth: MonthMap;
  domesticByMonth: MonthMap;
  acmiTree: CountryTree;
  generalTree: CountryTree;
  cancelledTree: CountryTree;
  total: number;
};

export function buildEcaaArchive(records: Application[], isEcaa: boolean): ArchiveTree {
  const activeRecs = isEcaa ? records.filter((r) => r.status === 'ECAA_APPROVED') : records.filter((r) => r.status !== 'CANCELLED');
  const cancelledRecs = isEcaa ? [] : records.filter((r) => r.status === 'CANCELLED');

  const seasonTree: SeasonTree = {};
  const positioningByMonth: MonthMap = {};
  const domesticByMonth: MonthMap = {};
  const acmiTree: CountryTree = {};
  const generalTree: CountryTree = {};

  function classify(rec: Application) {
    if (rec.type === 'positioning' || rec.type === 'urgent_positioning') return 'positioning';
    if (rec.type === 'domestic') return 'domestic';
    if (rec.type === 'acmi') return 'acmi';
    return 'general';
  }
  function monthEntryMeta(monthKey: string) {
    if (monthKey === 'MULTI') return { label: 'Multi Months', sortKey: 999999 };
    const [y, m] = monthKey.split('-').map(Number);
    return { label: monthLabel(y, m), sortKey: y * 100 + m };
  }
  function addMonthEntry(map: MonthMap, monthKey: string, rec: Application) {
    if (!map[monthKey]) {
      const meta = monthEntryMeta(monthKey);
      map[monthKey] = { label: meta.label, sortKey: meta.sortKey, recs: [] };
    }
    map[monthKey].recs.push(rec);
  }
  function addCountryMonthEntry(tree: CountryTree, country: string, monthKey: string, rec: Application) {
    if (!tree[country]) tree[country] = {};
    addMonthEntry(tree[country], monthKey, rec);
  }

  activeRecs.forEach((rec) => {
    const { monthKeys, isMultiMonth } = recordMonthInfo(rec);
    const countries = recordArchiveCountries(rec);

    if (rec.type === 'season_schedule' || (rec.type === 'charter' && isMultiMonth)) {
      const code = seasonCodeFor(rec);
      if (!seasonTree[code]) seasonTree[code] = { schedule: [], charter: [] };
      if (rec.type === 'season_schedule') seasonTree[code].schedule.push(rec);
      else seasonTree[code].charter.push(rec);
      return;
    }

    if (!monthKeys.size && !isMultiMonth) return;
    const monthKey = isMultiMonth ? 'MULTI' : [...monthKeys][0];
    const cat = classify(rec);
    if (cat === 'positioning') return addMonthEntry(positioningByMonth, monthKey, rec);
    if (cat === 'domestic') return addMonthEntry(domesticByMonth, monthKey, rec);
    if (cat === 'acmi') return countries.forEach((c) => addCountryMonthEntry(acmiTree, c, monthKey, rec));
    countries.forEach((c) => addCountryMonthEntry(generalTree, c, monthKey, rec));
  });

  const cancelledTree: CountryTree = {};
  cancelledRecs.forEach((rec) => {
    const { monthKeys, isMultiMonth } = recordMonthInfo(rec);
    const countries = recordArchiveCountries(rec);
    if (!monthKeys.size && !isMultiMonth) return;
    const monthKey = isMultiMonth ? 'MULTI' : [...monthKeys][0];
    countries.forEach((c) => addCountryMonthEntry(cancelledTree, c, monthKey, rec));
  });

  const total = activeRecs.length + cancelledRecs.length;
  return { seasonTree, positioningByMonth, domesticByMonth, acmiTree, generalTree, cancelledTree, total };
}
