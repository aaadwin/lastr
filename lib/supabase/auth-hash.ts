// d:/inventaris-baru/lib/supabase/auth-hash.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// PASTIKAN ADA KATA 'export' DI SINI
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// PASTIKAN ADA KATA 'export' DI SINI JUGA
export async function verifyPassword(
  plainTextPassword: string,
  hashedPasswordFromDB: string
): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, hashedPasswordFromDB);
}