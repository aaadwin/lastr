'use server';

import { createClient } from '@/lib/supabase/client';
import { verifyPassword } from '@/lib/supabase/auth-hash';

export async function authenticateUser(usernameInput: string, passwordInput: string) {
  try {
    const supabase = await createClient();

    // 1. Cari user hanya berdasarkan username (tanpa membandingkan password plain-text)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        password,
        role:role_id (
          nama_role
        )
      `)
      .eq('username', usernameInput.trim())
      .maybeSingle();

    if (userError) {
      console.error('Supabase DB Error:', userError);
      return { success: false, message: `Error DB: ${userError.message}` };
    }

    if (!userData) {
      return { success: false, message: 'Username atau password salah.' };
    }

    // 2. Verifikasi Password Hash menggunakan bcrypt.compare
    const isPasswordValid = await verifyPassword(passwordInput, userData.password);

    if (!isPasswordValid) {
      return { success: false, message: 'Username atau password salah.' };
    }

    // 3. Ambil Nama Role
    const roleData = userData.role as any;
    const rawRoleName = Array.isArray(roleData)
      ? roleData[0]?.nama_role
      : roleData?.nama_role;

    if (!rawRoleName) {
      return { success: false, message: 'Role tidak ditemukan di database.' };
    }

    const cleanRole = String(rawRoleName).trim().toLowerCase();

    // 4. Return Data User jika autentikasi sukses
    return {
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        role: cleanRole,
        rawRoleName,
      },
    };
  } catch (err: any) {
    console.error('Login Action Error:', err);
    return { success: false, message: err?.message || 'Terjadi kesalahan sistem.' };
  }
}