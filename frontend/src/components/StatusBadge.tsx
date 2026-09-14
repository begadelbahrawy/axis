import React from 'react';
import type { ApplicationStatus } from '../types';

const MAP: Record<ApplicationStatus, { cls: string; long: string; short: string }> = {
  PENDING_MANAGER_APPROVAL: { cls: 'pending', long: '⏱ Waiting Manager Approval', short: 'Manager Pending' },
  MANAGER_CHANGES_REQUESTED: { cls: 'pending', long: '⚠ Manager Changes Requested', short: 'Manager Changes' },
  MANAGER_APPROVED: { cls: 'waiting', long: '✓ Manager Approved', short: 'Manager Approved' },
  WAITING_ECAA_APPROVAL: { cls: 'waiting', long: '⏱ Waiting ECAA Approval', short: 'ECAA Pending' },
  ECAA_CHANGES_REQUESTED: { cls: 'pending', long: '⚠ ECAA Changes Requested', short: 'ECAA Changes' },
  ECAA_APPROVED: { cls: 'approved', long: '✓ ECAA Approved', short: 'ECAA Approved' },
  CANCELLED: { cls: 'cancelled', long: '✕ Cancelled', short: 'Cancelled' },
};

export default function StatusBadge({ status, longForm }: { status: ApplicationStatus; longForm?: boolean }) {
  const s = MAP[status] || MAP.PENDING_MANAGER_APPROVAL;
  return <span className={`badge ${s.cls}`}>{longForm ? s.long : s.short}</span>;
}
