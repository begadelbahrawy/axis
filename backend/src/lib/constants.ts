// Mirrors FORM_TYPES / REQUEST_ID_PREFIX from the reference prototype exactly.

export type FormTypeConfig = {
  title: string;
  style: 'simple' | 'wide';
  purposeWord: string;
  acmiExtra?: boolean;
  defaultAdditional?: boolean;
  manualFleet?: boolean;
  dropdownFleet?: boolean;
  noCountry?: boolean;
  noSeason?: boolean;
  domesticAirports?: boolean;
  multiCountry?: boolean;
  hasCoverLetter?: boolean;
  hasTravelProgram?: boolean;
};

export const FORM_TYPES: Record<string, FormTypeConfig> = {
  acmi: { title: 'ACMI Application', style: 'simple', purposeWord: 'المنتظمة', acmiExtra: true, defaultAdditional: false, manualFleet: true },
  positioning: { title: 'Regular Positioning Application', style: 'simple', purposeWord: 'الفارغة', defaultAdditional: false, noCountry: true, noSeason: true },
  domestic: { title: 'Domestic Application', style: 'simple', purposeWord: 'الداخلية', defaultAdditional: false, noCountry: true, noSeason: true, domesticAirports: true },
  maintenance: { title: 'Maintenance Application', style: 'simple', purposeWord: 'الفارغة', defaultAdditional: false, noCountry: true, noSeason: true, dropdownFleet: true },
  private: { title: 'Regular Private Flights Application', style: 'simple', purposeWord: 'الخاصة', defaultAdditional: false },
  charter: { title: 'Regular Charter Application', style: 'wide', purposeWord: 'السياحية', defaultAdditional: false, hasTravelProgram: true },
  season_schedule: { title: 'Regular Season Schedule Application', style: 'simple', purposeWord: 'المنتظمة', multiCountry: true, defaultAdditional: true, hasCoverLetter: true },
  schedule: { title: 'Regular Schedule Application', style: 'simple', purposeWord: 'المنتظمة', defaultAdditional: true },
  urgent_charter: { title: 'Urgent Charter Application', style: 'wide', purposeWord: 'السياحية', defaultAdditional: false, dropdownFleet: true, hasTravelProgram: true },
  urgent_positioning: { title: 'Urgent Positioning Application', style: 'wide', purposeWord: 'الفارغة', defaultAdditional: false, dropdownFleet: true, noCountry: true, noSeason: true },
  urgent_private: { title: 'Urgent Private Application', style: 'wide', purposeWord: 'الخاصة', defaultAdditional: false, dropdownFleet: true },
  urgent_schedule: { title: 'Urgent Schedule Application', style: 'wide', purposeWord: 'المنتظمة', defaultAdditional: false, dropdownFleet: true },
};

export const REQUEST_ID_PREFIX: Record<string, string> = {
  acmi: 'ACM', positioning: 'POS', domestic: 'DOM', maintenance: 'MNT', private: 'PRV',
  charter: 'CHR', season_schedule: 'SSN', schedule: 'SCH',
  urgent_charter: 'UCH', urgent_positioning: 'UPO',
  urgent_private: 'UPR', urgent_schedule: 'USC',
};

export const COUNTRIES_SEED: [string, string][] = [
  ['Albania', 'ألبانيا'], ['Armenia', 'أرمينيا'], ['Austria', 'النمسا'], ['Azerbaijan', 'أذربيجان'],
  ['Bosnia', 'البوسنة'], ['Bulgaria', 'بلغاريا'], ['Denmark', 'الدنمارك'],
  ['Emirates', 'الإمارات'], ['France', 'فرنسا'], ['Georgia', 'جورجيا'],
  ['Germany', 'ألمانيا'], ['Greece', 'اليونان'], ['Hungary', 'المجر'], ['Italy', 'إيطاليا'],
  ['Jordan', 'الأردن'], ['Kazakhstan', 'كازاخستان'], ['Kuwait', 'الكويت'], ['Lebanon', 'لبنان'],
  ['Libya', 'ليبيا'], ['Malta', 'مالطا'], ['Montenegro', 'الجبل الأسود'], ['Poland', 'بولندا'],
  ['Portugal', 'البرتغال'], ['Private Flights', 'رحلات خاصة'], ['Romania', 'رومانيا'],
  ['Russia', 'روسيا'], ['Saudi Arabia', 'السعودية'], ['Serbia', 'صربيا'], ['Slovakia', 'سلوفاكيا'],
  ['Spain', 'إسبانيا'], ['Sweden', 'السويد'], ['Switzerland', 'سويسرا'], ['Turkey', 'تركيا'],
  ['Other', 'أخرى'],
];

export const DOMESTIC_AIRPORTS_SEED: [string, string][] = [
  ['HECA/CAI', 'Cairo'], ['HEGN/HRG', 'Hurghada'], ['HESH/SSH', 'Sharm El Sheikh'], ['HELX/LXR', 'Luxor'],
  ['HESN/ASW', 'Aswan'], ['HEBA/HBE', 'Alexandria (Borg El Arab)'], ['HEMA/RMF', 'Marsa Alam'],
  ['HETB/TCP', 'Taba'], ['HESB/ABS', 'Abu Simbel'], ['HEAL/DBB', 'El Alamein'], ['HESC/HMB', 'Sohag'], ['HEAT/ATZ', 'Assiut'],
];

export const OWNED_FLEET_SEED: Record<string, string[]> = {
  A320: ['SU-BPX', 'SU-BTM', 'SU-BUJ', 'SU-BUK', 'SU-BUL', 'SU-BUM', 'SU-BUN', 'SU-BUP', 'SU-BUQ', 'SU-BUR',
    'SU-BUS', 'SU-BUT', 'SU-BUU', 'SU-BUV', 'SU-BUX', 'SU-BUY', 'SU-BUZ', 'SU-BVJ', 'SU-BVK', 'SU-BVL',
    'SU-BVM', 'SU-BVN', 'SU-BVO', 'SU-BVP', 'SU-BVQ', 'SU-BWB', 'SU-BWC', 'SU-BWD', 'SU-BWE', 'SU-BWF'],
  'ATR 72-200': ['SU-BVA', 'SU-BVB', 'SU-BVC', 'SU-BVD', 'SU-BVE', 'SU-BVF'],
  E190: ['SU-BVG', 'SU-BVH', 'SU-BVI'],
};

export const ACMI_FLEET_SEED: Record<string, string[]> = {
  A320: ['SU-SKC', 'LZ-EAH', 'LZ-EAJ'],
};

export const ACTIVE_STATUSES = [
  'PENDING_MANAGER_APPROVAL',
  'MANAGER_CHANGES_REQUESTED',
  'MANAGER_APPROVED',
  'WAITING_ECAA_APPROVAL',
  'ECAA_CHANGES_REQUESTED',
  'ECAA_APPROVED',
  'CANCELLED',
] as const;
