import type { Application } from '@prisma/client';

// Mirrors notificationKey()/isNotificationUnread()/userUnreadNotifications() from the
// reference prototype exactly, operating on persisted Application rows instead of the
// in-memory demo state.

type StampType =
  | 'manager-approved'
  | 'manager-changes'
  | 'ecaa-waiting'
  | 'ecaa-approved'
  | 'ecaa-changes'
  | 'manager-queue-view'
  | 'ecaa-queue-view';

function stampFor(rec: Application, type: StampType): string {
  const stampByType: Record<StampType, Date | null> = {
    'manager-approved': rec.managerApprovedAt,
    'manager-changes': rec.managerActionAt,
    'ecaa-waiting': rec.stampUploadedAt,
    'ecaa-approved': rec.ecaaActionAt,
    'ecaa-changes': rec.ecaaActionAt,
    'manager-queue-view': rec.managerQueueEnteredAt,
    'ecaa-queue-view': rec.stampUploadedAt,
  };
  const stamp = stampByType[type];
  return stamp ? stamp.toISOString() : '';
}

export function notificationKey(rec: Application, type: StampType): string {
  return `${type}:${rec.id}:${stampFor(rec, type)}`;
}

export function isNotificationUnread(rec: Application, type: StampType): boolean {
  const reads = (rec.notificationReads as Record<string, boolean>) || {};
  return !reads[notificationKey(rec, type)];
}

export type NotificationRow = {
  rec: Application;
  type: StampType;
  category: 'manager' | 'ecaa';
  kind: 'approval' | 'comment' | 'info';
};

export function userUnreadNotifications(records: Application[]): NotificationRow[] {
  const rows: NotificationRow[] = [];
  for (const r of records) {
    if (r.saved === false) continue;
    if (r.status === 'MANAGER_APPROVED' && isNotificationUnread(r, 'manager-approved')) {
      rows.push({ rec: r, type: 'manager-approved', category: 'manager', kind: 'approval' });
    }
    if (r.status === 'MANAGER_CHANGES_REQUESTED' && isNotificationUnread(r, 'manager-changes')) {
      rows.push({ rec: r, type: 'manager-changes', category: 'manager', kind: 'comment' });
    }
    if (r.status === 'WAITING_ECAA_APPROVAL' && isNotificationUnread(r, 'ecaa-waiting')) {
      rows.push({ rec: r, type: 'ecaa-waiting', category: 'ecaa', kind: 'info' });
    }
    if (r.status === 'ECAA_APPROVED' && isNotificationUnread(r, 'ecaa-approved')) {
      rows.push({ rec: r, type: 'ecaa-approved', category: 'ecaa', kind: 'approval' });
    }
    if (r.status === 'ECAA_CHANGES_REQUESTED' && isNotificationUnread(r, 'ecaa-changes')) {
      rows.push({ rec: r, type: 'ecaa-changes', category: 'ecaa', kind: 'comment' });
    }
  }
  return rows;
}
