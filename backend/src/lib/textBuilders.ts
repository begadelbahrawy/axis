import { FORM_TYPES } from './constants';

export const SEASONS: [string, string][] = [['Summer', 'الصيفي'], ['Winter', 'الشتوي']];
export const ACTIONS: [string, string][] = [['Operate', 'تشغيل'], ['Modify', 'تعديل'], ['Cancel', 'الغاء']];

export function seasonAr(en: string): string {
  return SEASONS.find((c) => c[0] === en)?.[1] || en;
}
export function actionAr(en: string): string {
  return ACTIONS.find((c) => c[0] === en)?.[1] || en;
}
export function seasonNounAr(en: string): string {
  return en === 'Winter' ? 'شتاء' : 'صيف';
}

type Meta = {
  countryEn?: string;
  countryOther?: string;
  seasonEn?: string;
  lessorName?: string;
  actionEn?: string;
  isAdditional?: boolean;
  year?: string;
  startDate?: string;
  endDate?: string;
};

export function buildSubjectLine(meta: Meta): string {
  return `الموضوع: اعتماد جدول تشغيل شركة اير كايرو – موسم ${seasonNounAr(meta.seasonEn || '')} ${meta.year || ''}`;
}

export function buildCoverLetterText(meta: Meta): string {
  const seasonNoun = seasonNounAr(meta.seasonEn || '');
  return `نتشرف ان نرفق لسيادتكم طية جدول تشغيل شركة اير كايرو لموسم ${seasonNoun} ${meta.year || ''}\nوذلك اعتبارا من ${meta.startDate || '—'} وحتي ${meta.endDate || '—'}`;
}

export function buildSalutation(
  type: string,
  meta: Meta,
  countrySections: { countryEn: string; countryOther?: string }[] | undefined,
  countryAr: (en: string) => string,
): string {
  const cfg = FORM_TYPES[type];
  if (!cfg) return '';
  const season = seasonAr(meta.seasonEn || '');
  const action = actionAr(meta.actionEn || '');
  const purpose = (meta.isAdditional ? 'الاضافية ' : '') + cfg.purposeWord;
  if (cfg.noCountry && cfg.noSeason) {
    return `برجاء التكرم بالعلم بالموافقة لشركة أير كايرو علي ${action} الرحلات ${purpose} التالية :`;
  }
  if (cfg.multiCountry) {
    const names = (countrySections || []).map((sec) => (sec.countryEn === 'Other' ? sec.countryOther || '—' : countryAr(sec.countryEn)));
    const countryPhrase = names.length === 0 ? '—' : names.length === 1 ? `لدولة ${names[0]}` : `لدول ${names.join('، ')}`;
    return `برجاء التكرم بالموافقة لشركة أير كايرو ${action} الرحلات ${purpose} ${countryPhrase} خلال الموسم ${season} لتكون كالتالى :`;
  }
  const country = meta.countryEn === 'Other' ? meta.countryOther || '—' : countryAr(meta.countryEn || '');
  const acmiPart = cfg.acmiExtra ? ` على طائرة ${meta.lessorName || '—'}` : '';
  return `يرجى التكرم بالموافقة لشركة "إير كايرو" على ${action} الرحلات ${purpose}${acmiPart} التالية إلى دولة ${country} في الموسم ${season} لتكون كالتالى :`;
}
