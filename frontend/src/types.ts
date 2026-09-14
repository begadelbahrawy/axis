export type Role = 'SPECIALIST' | 'MANAGER' | 'ECAA' | 'ADMIN';

export type User = { id: string; name: string; email: string; role: Role; active: boolean };

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

export const DAY_OPTIONS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'DAILY'];
export const REMARKS_TYPES = ['PAX', 'POS', 'FRY'];
export const SEASONS: [string, string][] = [['Summer', 'الصيفي'], ['Winter', 'الشتوي']];
export const ACTIONS: [string, string][] = [['Operate', 'تشغيل'], ['Modify', 'تعديل'], ['Cancel', 'الغاء']];

export type ApplicationStatus =
  | 'PENDING_MANAGER_APPROVAL'
  | 'MANAGER_CHANGES_REQUESTED'
  | 'MANAGER_APPROVED'
  | 'WAITING_ECAA_APPROVAL'
  | 'ECAA_CHANGES_REQUESTED'
  | 'ECAA_APPROVED'
  | 'CANCELLED';

export type FileRef = { url: string; name: string; mimeType?: string; uploadedBy: string; uploadedAt: string };
export type SignatureRef = { url: string; by: string; at: string; name?: string };

export type ApplicationData = {
  meta: Record<string, any>;
  rows: any[];
  countrySections: any[];
  manualFleetRows: any[];
  pickedFleetRows: any[];
  aircraftBlocks: string[];
  travelPages: any[];
  travelProgramEnabled: boolean;
  travelProgram: Record<string, any>;
  comments: string;
  salutationText: string;
  coverLetterText?: string;
  ecaaResponse: string;
};

export type ApplicationAttachments = {
  stampFile: FileRef | null;
  ecaaApprovalFile: FileRef | null;
  eSignature: SignatureRef | null;
  ecaaESignature: SignatureRef | null;
  supportingDocuments: FileRef[];
};

export type Application = {
  id: string;
  type: string;
  status: ApplicationStatus;
  saved: boolean;
  createdById: string;
  preparedBy: string;
  createdAt: string;
  updatedAt: string;
  managerApprovedBy: string | null;
  managerApprovedAt: string | null;
  managerActionBy: string | null;
  managerActionAt: string | null;
  managerNotes: string | null;
  managerQueueEnteredAt: string | null;
  ecaaActionBy: string | null;
  ecaaActionAt: string | null;
  ecaaNotes: string | null;
  approvalNumber: string | null;
  stampUploadedAt: string | null;
  data: ApplicationData;
  attachments: ApplicationAttachments;
  notificationReads: Record<string, boolean>;
};

export type Settings = {
  id: string;
  esigApproved: boolean;
  companySignatureUrl: string | null;
  companySignatureName: string | null;
  companySignatureUploadedBy: string | null;
  companySignatureUploadedAt: string | null;
};
