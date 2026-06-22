import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const encryptionKey = process.env.ENCRYPTION_KEY || '';
if (encryptionKey.length !== 64 && process.env.NODE_ENV !== 'test') {
  console.warn('WARNING: ENCRYPTION_KEY is not a 64-character hex string (32 bytes). Token encryption may fail.');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dataanalis_access_secret_key_change_me_in_production_9988',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dataanalis_refresh_secret_key_change_me_in_production_7766',
  encryptionKey: encryptionKey,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  accurate: {
    mock: process.env.ACCURATE_MOCK === 'true',
  },
};
