import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Validates the request schemas and returns a 400 Bad Request if fields fail validation rules
 */
export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      message: 'Validasi input gagal', 
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : '',
        msg: err.msg
      }))
    });
    return;
  }
  next();
}
