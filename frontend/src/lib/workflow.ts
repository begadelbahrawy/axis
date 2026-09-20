import type { Application, ApplicationStatus } from '../types';

export const managerApproved = (rec?: Application | null) => rec?.status === 'MANAGER_APPROVED';
export const managerPending = (rec?: Application | null) => rec?.status === 'PENDING_MANAGER_APPROVAL';
export const managerChangesRequested = (rec?: Application | null) => rec?.status === 'MANAGER_CHANGES_REQUESTED';
export const waitingEcaaApproval = (rec?: Application | null) => rec?.status === 'WAITING_ECAA_APPROVAL';
export const ecaaChangesRequested = (rec?: Application | null) => rec?.status === 'ECAA_CHANGES_REQUESTED';
export const ecaaApproved = (rec?: Application | null) => rec?.status === 'ECAA_APPROVED';
export const cancelled = (rec?: Application | null) => rec?.status === 'CANCELLED';

export function managerGateMessage(rec: Application, esigApproved: boolean): { cls: string; html: string } {
  if (managerApproved(rec)) {
    return esigApproved
      ? { cls: 'manager-approved-note', html: '✓ Manager approval granted. You can now print the application, stamp it, and upload the stamped copy — or sign it electronically instead.' }
      : { cls: 'manager-approved-note', html: '✓ Manager approval granted. You can now print the application, stamp it, and upload the stamped copy — with the official ECAA Approval No.' };
  }
  if (managerChangesRequested(rec)) {
    return { cls: 'manager-gate', html: '⚠ Manager requested changes. Review the Manager comments below, edit the application, then Generate Form again for Manager re-approval.' };
  }
  if (waitingEcaaApproval(rec)) {
    const sig = rec.attachments.eSignature;
    const text = sig ? `Electronically signed by ${sig.by} on ${sig.at ? new Date(sig.at).toLocaleString() : ''}.` : 'Stamped application uploaded.';
    return { cls: 'manager-approved-note', html: `✓ ${text} Waiting for ECAA approval.` };
  }
  if (ecaaChangesRequested(rec)) {
    return { cls: 'manager-gate', html: '⚠ ECAA requested changes. Review the ECAA comments below, edit the application, then Generate Form again. It will return to Manager Approval before ECAA review.' };
  }
  if (ecaaApproved(rec)) {
    return { cls: 'manager-approved-note', html: '✓ ECAA approval granted. The final application is available for download.' };
  }
  return { cls: 'manager-gate', html: '⏱ Waiting for Manager approval. The application cannot be printed or uploaded until the Manager approves it.' };
}

export function periodDateDisplay(iso?: string | null): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function twoLineDisplay(v1?: string, v2?: string) {
  if (v1 && v2) return `${v1} / ${v2}`;
  return v1 || v2 || '';
}

export function flightNoCellDisplay(noOut?: string, noRet?: string) {
  if (noOut && noRet) return `${noOut} / ${noRet}`;
  return noOut || noRet || '';
}

export function daysDisplay(days?: string[]) {
  if (!days || !days.length) return '';
  return days.join(', ');
}

// Combines the outbound/return purpose (PAX/POS/FRY) into a single display
// string — e.g. Out=PAX + Ret=FRY becomes "PAX / FRY". If both legs share the
// same purpose it is shown once, e.g. "PAX".
export function combineRemarks(a?: string, b?: string): string {
  const x = a || 'PAX';
  const y = b || 'PAX';
  return x === y ? x : `${x} / ${y}`;
}
