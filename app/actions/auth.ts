// app/actions/auth.ts
'use server';

import { createClient } from '@/lib/supabase/client'; // Menggunakan Supabase client versi server
import { hashPassword, verifyPassword } from '@/lib/supabase/auth-hash';

// 1. ACTION REGISTRASI
export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string;
  const rawPassword = formData.get('password') as string;

  if (!email || !rawPassword) {
    return { success: false, message: 'Email dan password wajib diisi!' };
  }

  try {
    const supabase = await createClient();

    // Cek apakah user sudah terdaftar
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return { success: false, message: 'Email sudah terdaftar!' };
    }

    // Hash password sebelum disimpan
    const hashedPassword = await hashPassword(rawPassword);

    // Simpan ke tabel 'users' custom
    const { error } = await supabase.from('users').insert([
      {
        email,
        password: hashedPassword, // Disimpan dalam bentuk hash
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    return { success: true, message: 'Registrasi berhasil!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal meragistrasi user' };
  }
}

// 2. ACTION LOGIN
export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const rawPassword = formData.get('password') as string;

  try {
    const supabase = await createClient();

    // Cari user berdasarkan email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return { success: false, message: 'Email atau password salah!' };
    }

    // Verifikasi password input dengan hash yang tersimpan di DB
    const isPasswordValid = await verifyPassword(rawPassword, user.password);

    if (!isPasswordValid) {
      return { success: false, message: 'Email atau password salah!' };
    }

    // Password cocok! Buat session/cookie di sini jika diperlukan
    return { success: true, message: 'Login berhasil!', userId: user.id };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal proses login' };
  }
}