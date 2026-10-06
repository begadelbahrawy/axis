import { describe, it, expect } from 'vitest';
import { buildSalutation, buildCoverLetterText, buildSubjectLine, seasonNounAr } from '../../src/lib/textBuilders';

const countryAr = (en: string) => ({ 'Saudi Arabia': 'السعودية', France: 'فرنسا' }[en] || en);

describe('seasonNounAr', () => {
  it('maps Winter to شتاء and anything else to صيف', () => {
    expect(seasonNounAr('Winter')).toBe('شتاء');
    expect(seasonNounAr('Summer')).toBe('صيف');
    expect(seasonNounAr('')).toBe('صيف');
  });
});

describe('buildSalutation', () => {
  it('uses the noCountry+noSeason phrasing for domestic applications', () => {
    const text = buildSalutation('domestic', { actionEn: 'Operate' }, [], countryAr);
    expect(text).toContain('الرحلات');
    expect(text).toContain('الداخلية');
    expect(text).not.toContain('الموسم');
  });

  it('includes the country and season for a single-country application', () => {
    const text = buildSalutation('charter', { countryEn: 'Saudi Arabia', seasonEn: 'Summer', actionEn: 'Operate' }, [], countryAr);
    expect(text).toContain('السعودية');
    expect(text).toContain('الصيفي');
    expect(text).toContain('السياحية');
  });

  it('inserts the free-text country as-is when countryEn is Other', () => {
    const text = buildSalutation('charter', { countryEn: 'Other', countryOther: 'دولة تجريبية', seasonEn: 'Summer', actionEn: 'Operate' }, [], countryAr);
    expect(text).toContain('دولة تجريبية');
  });

  it('includes the lessor name for ACMI applications', () => {
    const text = buildSalutation('acmi', { countryEn: 'France', seasonEn: 'Winter', actionEn: 'Operate', lessorName: 'نايل اير' }, [], countryAr);
    expect(text).toContain('نايل اير');
    expect(text).toContain('المنتظمة');
  });

  it('joins multiple country names for a multi-country season-schedule application', () => {
    const text = buildSalutation(
      'season_schedule',
      { seasonEn: 'Summer', actionEn: 'Operate' },
      [{ countryEn: 'Saudi Arabia' }, { countryEn: 'France' }],
      countryAr,
    );
    expect(text).toContain('السعودية');
    expect(text).toContain('فرنسا');
    expect(text).toContain('لدول');
  });

  it('marks additional flights with the extra prefix word', () => {
    const withExtra = buildSalutation('charter', { countryEn: 'France', seasonEn: 'Summer', actionEn: 'Operate', isAdditional: true }, [], countryAr);
    const without = buildSalutation('charter', { countryEn: 'France', seasonEn: 'Summer', actionEn: 'Operate', isAdditional: false }, [], countryAr);
    expect(withExtra).toContain('الاضافية');
    expect(without).not.toContain('الاضافية');
  });

  it('returns an empty string for an unknown type', () => {
    expect(buildSalutation('not-a-real-type', {}, [], countryAr)).toBe('');
  });
});

describe('buildCoverLetterText / buildSubjectLine', () => {
  it('includes the season noun and year in both', () => {
    const meta = { seasonEn: 'Winter', year: '2027', startDate: '1 يناير', endDate: '31 مارس' };
    expect(buildSubjectLine(meta)).toContain('شتاء');
    expect(buildSubjectLine(meta)).toContain('2027');
    const letter = buildCoverLetterText(meta);
    expect(letter).toContain('شتاء');
    expect(letter).toContain('1 يناير');
    expect(letter).toContain('31 مارس');
  });
});
