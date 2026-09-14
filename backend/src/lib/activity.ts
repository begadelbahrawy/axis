import { prisma } from './prisma';
import { FORM_TYPES } from './constants';

export async function logActivity(opts: {
  action: string;
  applicationId: string;
  type: string;
  userId: string;
  userName: string;
}) {
  const formTitle = FORM_TYPES[opts.type]?.title || opts.type;
  await prisma.activityLog.create({
    data: {
      action: opts.action,
      applicationId: opts.applicationId,
      requestId: opts.applicationId,
      formTitle,
      userId: opts.userId,
      userName: opts.userName,
    },
  });
}
