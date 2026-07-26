import prisma from '../config/db.js';

export async function createAuditLog(data) {
  return prisma.auditLog.create({
    data: {
      userId: String(data.userId || ''),
      userName: String(data.userName || ''),
      userEmail: String(data.userEmail || ''),
      action: String(data.action || ''),
      target: String(data.target || ''),
      details: String(data.details || ''),
      ip: String(data.ip || ''),
    },
  });
}

export async function findAllAuditLogs(skip, take) {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip: skip || 0,
      take: take || 50,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count(),
  ]);

  return { logs, total };
}
