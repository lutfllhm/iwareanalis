import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-cbc';

// Retrieve encryption key from config and parse as buffer
function getEncryptionKey(): Buffer {
  const hexKey = config.encryptionKey;
  if (!hexKey || hexKey.length !== 64) {
    // Fallback key for development if not properly configured
    return crypto.scryptSync('dataanalis-default-salt', 'salt', 32);
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypt plain text using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine iv and encrypted text to store together
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt cipher text back to plain text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed');
  }
}
