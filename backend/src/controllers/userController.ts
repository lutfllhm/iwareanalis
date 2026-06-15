import { Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import logger from '../services/logger';

/**
 * Get all users list
 */
export async function getUsers(_req: AuthenticatedRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        is_active: true,
        two_fa_enabled: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json(users);
  } catch (error) {
    logger.error('Failed to retrieve users list:', error);
    return res.status(500).json({ message: 'Gagal mengambil data pengguna' });
  }
}

/**
 * Create a new user (Admin only)
 */
export async function createUser(req: AuthenticatedRequest, res: Response) {
  const { nama, email, password, role } = req.body;

  if (!nama || !email || !password || !role) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }

  // Password length enforcement
  if (password.length < 10) {
    return res.status(400).json({ message: 'Password minimal harus 10 karakter' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        nama,
        email,
        password_hash: passwordHash,
        role,
        is_active: true,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'CREATE_USER',
        target: `User: ${email} (Role: ${role})`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`User ${email} created successfully by admin ${req.user?.email}`);

    return res.status(201).json({
      message: 'User berhasil ditambahkan',
      user: {
        id: newUser.id,
        nama: newUser.nama,
        email: newUser.email,
        role: newUser.role,
        is_active: newUser.is_active,
      },
    });
  } catch (error) {
    logger.error('Failed to create user:', error);
    return res.status(500).json({ message: 'Gagal menambahkan pengguna baru' });
  }
}

/**
 * Update an existing user's data (Admin only)
 */
export async function updateUser(req: AuthenticatedRequest, res: Response) {
  const userId = parseInt(req.params.id, 10);
  const { nama, email, role, is_active } = req.body;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Do not allow deactivating the currently logged in administrator
    if (userId === req.user?.id && is_active === false) {
      return res.status(400).json({ message: 'Anda tidak dapat menonaktifkan akun Anda sendiri' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        nama,
        email,
        role,
        is_active,
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'UPDATE_USER',
        target: `User: ${email} (Role: ${role}, Active: ${is_active})`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`User ID ${userId} updated successfully by admin ${req.user?.email}`);

    return res.status(200).json({
      message: 'Data pengguna berhasil diperbarui',
      user: {
        id: updatedUser.id,
        nama: updatedUser.nama,
        email: updatedUser.email,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
      },
    });
  } catch (error) {
    logger.error('Failed to update user:', error);
    return res.status(500).json({ message: 'Gagal memperbarui data pengguna' });
  }
}

/**
 * Reset user password (Admin only)
 */
export async function resetPassword(req: AuthenticatedRequest, res: Response) {
  const userId = parseInt(req.params.id, 10);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 10) {
    return res.status(400).json({ message: 'Password baru minimal harus 10 karakter' });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        failed_login_attempts: 0,
        lockout_until: null, // clear lockouts if reset
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'RESET_PASSWORD_USER',
        target: `User: ${targetUser.email}`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`Password for user ID ${userId} was reset by admin ${req.user?.email}`);

    return res.status(200).json({ message: 'Password pengguna berhasil direset' });
  } catch (error) {
    logger.error('Failed to reset user password:', error);
    return res.status(500).json({ message: 'Gagal mereset password pengguna' });
  }
}

/**
 * Delete a user (Admin only)
 */
export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  const userId = parseInt(req.params.id, 10);

  if (userId === req.user?.id) {
    return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri' });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    await prisma.user.delete({ where: { id: userId } });

    await prisma.auditLog.create({
      data: {
        user_id: req.user?.id,
        user_email: req.user?.email,
        aksi: 'DELETE_USER',
        target: `User: ${targetUser.email}`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`User ID ${userId} deleted by admin ${req.user?.email}`);

    return res.status(200).json({ message: 'Pengguna berhasil dihapus' });
  } catch (error) {
    logger.error('Failed to delete user:', error);
    return res.status(500).json({ message: 'Gagal menghapus pengguna' });
  }
}
