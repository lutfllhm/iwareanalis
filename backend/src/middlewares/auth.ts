import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import prisma from '../services/db';
import logger from '../services/logger';

// Custom Request Interface to hold user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'analyst' | 'viewer';
  };
}

/**
 * Authenticate JWT access token from headers
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({ message: 'Authentication token is missing' });
    return;
  }

  jwt.verify(token, config.jwtAccessSecret, (err: any, user: any) => {
    if (err) {
      logger.warn('Failed JWT access token verification:', err.message);
      res.status(403).json({ message: 'Token is invalid or expired' });
      return;
    }
    
    req.user = user;
    next();
  });
}

/**
 * Enforce RBAC rules
 */
export function requireRole(allowedRoles: ('admin' | 'analyst' | 'viewer')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized. Authenticated session required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied. User ${req.user.email} (${req.user.role}) tried to access route restricted to: ${allowedRoles.join(', ')}`);
      res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      return;
    }

    next();
  };
}

/**
 * Security Rate Limiter for Login Endpoint
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per window
  message: {
    message: 'Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, _next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} trying to login`);
    // Create audit log for rate limiting trigger
    prisma.auditLog.create({
      data: {
        aksi: 'LOGIN_RATE_LIMIT_EXCEEDED',
        target: 'Authentication',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
      },
    }).catch(err => logger.error('Failed to create rate limit audit log:', err));
    
    res.status(429).json(options.message);
  }
});
