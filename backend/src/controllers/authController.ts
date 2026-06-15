import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import prisma from '../services/db';
import { config } from '../config';
import logger from '../services/logger';
import { AuthenticatedRequest } from '../middlewares/auth';

/**
 * Helper to generate JWT tokens
 */
const generateTokens = (user: { id: number; email: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtAccessSecret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Handle user login
 */
export async function login(req: Request, res: Response) {
  const { email, password, captchaToken } = req.body;

  try {
    // 1. Basic Turnstile / Captcha Verification (Placeholder validation)
    // In production, we'd call Cloudflare API to verify captchaToken.
    if (captchaToken) {
      logger.info(`CAPTCHA validation requested for ${email}`);
      // Here we assume successful validation for local dashboard purposes
    }

    // 2. Query user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Use generic warning to prevent email enumeration
      logger.warn(`Failed login attempt: user with email ${email} not found`);
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // 3. Check Account Lockout status
    if (user.lockout_until && user.lockout_until > new Date()) {
      const waitTime = Math.ceil((user.lockout_until.getTime() - Date.now()) / (60 * 1000));
      logger.warn(`Locked out account attempt: ${email} is locked for another ${waitTime} minutes`);
      return res.status(403).json({ 
        message: `Akun ini terkunci sementara karena terlalu banyak kegagalan. Silakan coba lagi dalam ${waitTime} menit.` 
      });
    }

    // 4. Compare Password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      // Login failed, increment attempts
      const newAttempts = user.failed_login_attempts + 1;
      let lockoutUntil: Date | null = null;

      if (newAttempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 mins
        logger.warn(`Account lockout triggered for email: ${email} (5 consecutive failures)`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: newAttempts,
          lockout_until: lockoutUntil,
        },
      });

      // Audit Log for failure
      await prisma.auditLog.create({
        data: {
          aksi: 'LOGIN_FAILURE',
          target: 'Users',
          user_email: email,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'] || '',
        },
      });

      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // Check if user is active
    if (!user.is_active) {
      logger.warn(`Inactive user login attempt: ${email}`);
      return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan. Silakan hubungi admin.' });
    }

    // 5. Check 2FA Status
    if (user.two_fa_enabled) {
      // Return temporary state to frontend to request OTP code
      logger.info(`User ${email} has 2FA enabled, redirecting to OTP check.`);
      return res.status(200).json({
        twoFaRequired: true,
        userId: user.id,
        email: user.email,
        role: user.role,
      });
    }

    // 6. Login Success - Reset login failures & Lockout
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        lockout_until: null,
        last_login: new Date(),
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token in HTTPOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Audit Log for success
    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        user_email: user.email,
        aksi: 'LOGIN_SUCCESS',
        target: 'Users',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`Successful login for user: ${email}`);

    return res.status(200).json({
      message: 'Login berhasil',
      accessToken,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        twoFaEnabled: user.two_fa_enabled,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan sistem' });
  }
}

/**
 * Verify 2FA TOTP code during login
 */
export async function verify2FA(req: Request, res: Response) {
  const { userId, code } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId, 10) } });
    if (!user || !user.two_fa_secret) {
      return res.status(400).json({ message: 'Pengguna tidak ditemukan atau 2FA belum diaktifkan' });
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: user.two_fa_secret,
      encoding: 'base32',
      token: code,
      window: 1, // allow +/- 30 seconds clock drift
    });

    if (!verified) {
      logger.warn(`Failed 2FA code verification for user ID: ${userId}`);
      return res.status(401).json({ message: 'Kode OTP tidak valid' });
    }

    // Reset login parameters upon success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        lockout_until: null,
        last_login: new Date(),
      },
    });

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Cookie refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        user_email: user.email,
        aksi: 'LOGIN_2FA_SUCCESS',
        target: 'Users',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`Successful 2FA login for user: ${user.email}`);

    return res.status(200).json({
      message: 'Login 2FA berhasil',
      accessToken,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        twoFaEnabled: user.two_fa_enabled,
      },
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan sistem' });
  }
}

/**
 * Setup 2FA TOTP configuration (for logged-in user in settings)
 */
export async function setup2FA(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Accurate Dashboard (${user.email})`,
    });

    // Update secret in database temporarily (we'll fully enable 2FA after they confirm code)
    await prisma.user.update({
      where: { id: user.id },
      data: { two_fa_secret: secret.base32 },
    });

    // Generate QR Code data url
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    return res.status(200).json({
      secret: secret.base32,
      qrCodeUrl,
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    return res.status(500).json({ message: 'Gagal menyiapkan 2FA' });
  }
}

/**
 * Confirm and enable 2FA
 */
export async function confirm2FA(req: AuthenticatedRequest, res: Response) {
  const { code } = req.body;
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.two_fa_secret) {
      return res.status(400).json({ message: 'Data 2FA belum dibuat' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_fa_secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Kode OTP salah' });
    }

    // Fully enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { two_fa_enabled: true },
    });

    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        user_email: user.email,
        aksi: 'ENABLE_2FA',
        target: 'Users',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`2FA enabled for user: ${user.email}`);
    return res.status(200).json({ message: '2FA berhasil diaktifkan' });
  } catch (error) {
    logger.error('Confirm 2FA error:', error);
    return res.status(500).json({ message: 'Gagal mengaktifkan 2FA' });
  }
}

/**
 * Disable 2FA
 */
export async function disable2FA(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        two_fa_enabled: false,
        two_fa_secret: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        user_email: user.email,
        aksi: 'DISABLE_2FA',
        target: 'Users',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`2FA disabled for user: ${user.email}`);
    return res.status(200).json({ message: '2FA berhasil dinonaktifkan' });
  } catch (error) {
    logger.error('Disable 2FA error:', error);
    return res.status(500).json({ message: 'Gagal menonaktifkan 2FA' });
  }
}

/**
 * Refresh JWT access token
 */
export async function refreshToken(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token is missing' });
    return;
  }

  try {
    jwt.verify(refreshToken, config.jwtRefreshSecret, async (err: any, decoded: any) => {
      if (err) {
        logger.warn('Refresh token is invalid/expired');
        res.status(403).json({ message: 'Refresh token is expired' });
        return;
      }

      // Check if user is still active in database
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || !user.is_active) {
        res.status(403).json({ message: 'User is inactive or deleted' });
        return;
      }

      // Generate new access and refresh tokens
      const tokens = generateTokens(user);

      // Save new refresh token in cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        accessToken: tokens.accessToken,
      });
      return;
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan sistem' });
    return;
  }
}

/**
 * Handle user logout
 */
export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          user_id: req.user.id,
          user_email: req.user.email,
          aksi: 'LOGOUT',
          target: 'Users',
          ip_address: req.ip,
          user_agent: req.headers['user-agent'] || '',
        },
      });
    }

    res.clearCookie('refreshToken');
    logger.info('User successfully logged out');
    return res.status(200).json({ message: 'Logout berhasil' });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan sistem' });
  }
}

/**
 * Retrieve current user profile
 */
export async function me(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        two_fa_enabled: true,
        last_login: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    logger.error('Me query error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan sistem' });
  }
}
