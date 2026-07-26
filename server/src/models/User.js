import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

export async function findUserByEmail(email) {
  return prisma.user.findFirst({
    where: { email },
    include: { role: true },
  });
}

export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id: Number(id) },
    include: { role: true },
  });
}

export async function createUser(data) {
  const passwordHash = bcrypt.hashSync(data.password || 'staff123', 10);
  let roleId = null;

  if (data.role) {
    let role = await prisma.role.findFirst({
      where: { name: data.role },
    });
    if (!role) {
      role = await prisma.role.create({
        data: { name: data.role },
      });
    }
    roleId = role.id;
  }

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      roleId: roleId || 1,
      timezone: data.timezone || 'Europe/Stockholm',
    },
    include: { role: true },
  });
}

export async function updateUser(id, data) {
  const updateData = {
    ...(data.name && { name: data.name.trim() }),
    ...(data.email && { email: data.email.toLowerCase().trim() }),
    ...(data.timezone && { timezone: data.timezone }),
  };

  if (data.password) {
    updateData.passwordHash = bcrypt.hashSync(data.password, 10);
  }

  if (data.role) {
    let role = await prisma.role.findFirst({
      where: { name: data.role },
    });
    if (!role) {
      role = await prisma.role.create({
        data: { name: data.role },
      });
    }
    updateData.roleId = role.id;
  }

  return prisma.user.update({
    where: { id: Number(id) },
    data: updateData,
    include: { role: true },
  });
}

export async function deleteUser(id) {
  return prisma.user.delete({
    where: { id: Number(id) },
  });
}

export async function countUsers() {
  return prisma.user.count();
}

export async function findAllUsers() {
  return prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: { role: true },
  });
}

export async function findUserByEmailExcludingId(email, excludeId) {
  return prisma.user.findFirst({
    where: {
      email,
      id: { not: Number(excludeId) },
    },
  });
}

export async function findUsersByEmails(emails) {
  return prisma.user.findMany({
    where: { email: { in: emails } },
  });
}
