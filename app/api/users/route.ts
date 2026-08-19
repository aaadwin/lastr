import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // 1. Ambil 'pengguna' dari body request
    const { id, username, pengguna, password, role_id, bidang_id } = body;

    if (!username || !role_id) {
      return NextResponse.json({ error: 'Username dan Role wajib diisi' }, { status: 400 });
    }

    // 2. Masukkan 'pengguna' ke dalam payload
    const payload: Record<string, any> = {
      username: username.trim(),
      pengguna: pengguna ? pengguna.trim() : null, // <--- PENAMBAHAN PENTING
      role_id: role_id || null,
      bidang_id: bidang_id || null,
    };

    // Hash password jika password diisi (wajib untuk user baru, opsional saat update)
    if (password && password.trim() !== '') {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);
      payload.password = hashedPassword;
    }

    if (id) {
      // --- UPDATE USER ---
      payload.updated_at = new Date().toISOString();
      const { error } = await supabase.from('users').update(payload).eq('id', id);
      if (error) throw error;

      return NextResponse.json({ message: 'User berhasil diperbarui' });
    } else {
      // --- INSERT USER BARU ---
      if (!password || !password.trim()) {
        return NextResponse.json({ error: 'Password wajib diisi untuk user baru' }, { status: 400 });
      }
      payload.created_at = new Date().toISOString();

      const { error } = await supabase.from('users').insert([payload]);
      if (error) throw error;

      return NextResponse.json({ message: 'User berhasil dibuat' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 });
  }
}