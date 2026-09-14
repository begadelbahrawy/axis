export const AC_TYPE_PAX: Record<string, string> = { A320: '174', E190: '110', ATR: '76' };

export const NATIONALITY_MAP: Record<string, [string, string]> = {
  Albania: ['Albanian', 'ألباني'], Armenia: ['Armenian', 'أرميني'], Austria: ['Austrian', 'نمساوي'],
  Azerbaijan: ['Azerbaijani', 'أذربيجاني'], Bosnia: ['Bosnian', 'بوسني'], Bulgaria: ['Bulgarian', 'بلغاري'],
  Denmark: ['Danish', 'دنماركي'], Emirates: ['Emirati', 'إماراتي'], France: ['French', 'فرنسي'],
  Georgia: ['Georgian', 'جورجي'], Germany: ['German', 'ألماني'], Greece: ['Greek', 'يوناني'],
  Hungary: ['Hungarian', 'مجري'], Italy: ['Italian', 'إيطالي'], Jordan: ['Jordanian', 'أردني'],
  Kazakhstan: ['Kazakh', 'كازاخستاني'], Kuwait: ['Kuwaiti', 'كويتي'], Lebanon: ['Lebanese', 'لبناني'],
  Libya: ['Libyan', 'ليبي'], Malta: ['Maltese', 'مالطي'], Montenegro: ['Montenegrin', 'مونتينيغري'],
  Poland: ['Polish', 'بولندي'], Portugal: ['Portuguese', 'برتغالي'], Romania: ['Romanian', 'روماني'],
  Russia: ['Russian', 'روسي'], 'Saudi Arabia': ['Saudi', 'سعودي'], Serbia: ['Serbian', 'صربي'],
  Slovakia: ['Slovak', 'سلوفاكي'], Spain: ['Spanish', 'إسباني'], Sweden: ['Swedish', 'سويدي'],
  Switzerland: ['Swiss', 'سويسري'], Turkey: ['Turkish', 'تركي'],
};

export const DAY_FULLNAME: Record<string, [string, string]> = {
  SAT: ['Saturday', 'السبت'], SUN: ['Sunday', 'الاحد'], MON: ['Monday', 'الاثنين'], TUE: ['Tuesday', 'الثلاثاء'],
  WED: ['Wednesday', 'الاربعاء'], THU: ['Thursday', 'الخميس'], FRI: ['Friday', 'الجمعة'], DAILY: ['Daily', 'يوميا'],
};

export const TRAVEL_FIXED_OPERATOR = {
  name: 'Air Cairo', phone: '202-22687683/4', fax: '202-22686695', email: 'OPS-CONTROL@FLYAIRCAIRO.COM',
  address: '6 El-Safa St., El-Sayed Zakaria Khalil, Sheraton Heliopolis, Cairo - Egypt',
};
export const TRAVEL_FIXED_HANDLING = {
  name: 'Egypt Air Ground Services', phone: '0120 222 1677', fax: '',
  email: 'hndlgcontracts@egyptair.com', address: 'Egypt Air admin south building, 4th floor, Cairo international airport road, Cairo, Egypt',
};

export function daysFullDisplay(days?: string[]): { en: string; ar: string } {
  if (!days || days.length === 0) return { en: '—', ar: '' };
  if (days.includes('DAILY')) return { en: DAY_FULLNAME.DAILY[0], ar: DAY_FULLNAME.DAILY[1] };
  return {
    en: days.map((d) => (DAY_FULLNAME[d] || [d])[0]).join(', '),
    ar: days.map((d) => (DAY_FULLNAME[d] || [d, ''])[1]).join('، '),
  };
}

export function combineFlightNo(dep?: string, arr?: string): string {
  if (!dep && !arr) return '';
  if (!arr) return `SM${dep}`;
  if (!dep) return `SM${arr}`;
  let i = 0;
  while (i < dep.length && i < arr.length && dep[i] === arr[i]) i++;
  const suffix = arr.slice(i) || arr;
  return `SM${dep}/${suffix}`;
}

export function nightsBetween(fromIso?: string, toIso?: string): number | null {
  if (!fromIso || !toIso) return null;
  const d1 = new Date(fromIso).getTime();
  const d2 = new Date(toIso).getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  const diff = Math.round((d2 - d1) / 86400000);
  return diff >= 0 ? diff : null;
}

export function bilingualDisplay(en?: string, ar?: string): string {
  if (en && ar) return `${en} [${ar}]`;
  return en || ar || '—';
}

export function emptyTravelProgramData() {
  return {
    egyptian: { nameEn: '', nameAr: '', phone: '', fax: '', email: '', address: '' },
    foreign: { nameEn: '', nameAr: '', phone: '', fax: '', email: '', address: '' },
    acType: 'A320',
    acTypeOther: '',
    pax: AC_TYPE_PAX.A320,
    hotelPage1En: '',
    hotelPage1Ar: '',
    hotelPage2En: '',
    hotelPage2Ar: '',
  };
}

export function travelProgramFlightData(rows: any[]) {
  const row0 = rows[0];
  const row1 = rows[1];
  const rowRoute = (r: any) => (r ? `${r.fromDep || '—'}/${r.toDep || '—'}/${r.toArr || r.fromDep || '—'}` : '');
  const days = row0 ? daysFullDisplay(row0.days) : { en: '—', ar: '' };
  const periodText = row0 && (row0.periodFrom || row0.periodTo) ? `${pd(row0.periodFrom) || '—'} - ${pd(row0.periodTo) || '—'}` : '—';
  const nights = row0 ? nightsBetween(row0.periodFrom, row0.periodTo) : null;
  return {
    flightNo1: row0 ? combineFlightNo(row0.flightNoDep, row0.flightNoArr) : '',
    route1: rowRoute(row0),
    flightNo2: row1 ? combineFlightNo(row1.flightNoDep, row1.flightNoArr) : '',
    route2: rowRoute(row1),
    days,
    periodText,
    nights,
  };
}

function pd(iso?: string) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}
