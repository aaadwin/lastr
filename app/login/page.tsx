'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    console.log('--- START LOGIN PROCESS ---');
    console.log('Input Username:', username);

    try {
      // 1. Query Supabase
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
        .eq('username', username.trim())
        .eq('password', password)
        .maybeSingle();

      console.log('Supabase Raw Output:', { userData, userError });

      if (userError) {
        console.error('Supabase Query Error:', userError);
        setErrorMessage(`Error DB: ${userError.message}`);
        setLoading(false);
        return;
      }

      if (!userData) {
        console.warn('User tidak ditemukan!');
        setErrorMessage('Username atau password salah.');
        setLoading(false);
        return;
      }

      // 2. Ambil Role
      const roleData = userData.role as any;
      const rawRoleName = Array.isArray(roleData)
        ? roleData[0]?.nama_role
        : roleData?.nama_role;

      console.log('Raw Role Name:', rawRoleName);

      if (!rawRoleName) {
        setErrorMessage('Role tidak ditemukan di database.');
        setLoading(false);
        return;
      }

      const cleanRole = String(rawRoleName).trim().toLowerCase();
      console.log('Clean Role:', cleanRole);

      // 3. Simpan Sesi (di LocalStorage & Cookie untuk Middleware)
      const sessionData = {
        id: userData.id,
        username: userData.username,
        role: cleanRole,
      };

      // Simpan di LocalStorage untuk client-side
      localStorage.setItem('user_session', JSON.stringify(sessionData));

      // Simpan di Cookie agar bisa dibaca oleh Middleware (Berlaku 1 Hari)
      document.cookie = `user_session=${encodeURIComponent(
        JSON.stringify(sessionData)
      )}; path=/; max-age=86400; SameSite=Lax`;

      // 4. Cek Routing
      let targetPath = '';
      if (cleanRole.includes('admin')) {
        targetPath = '/admin';
      } else if (cleanRole.includes('pimpinan')) {
        targetPath = '/pimpinan';
      } else if (cleanRole.includes('operator')) {
        targetPath = '/operator';
      }

      console.log('Target Path:', targetPath);

      if (!targetPath) {
        setErrorMessage(`Role '${rawRoleName}' tidak cocok dengan rute manapun.`);
        setLoading(false);
        return;
      }

      // 5. Eksekusi Force Redirect
      console.log('Melakukan redirect ke:', targetPath);
      window.location.replace(targetPath);

    } catch (err: any) {
      console.error('Catch Error:', err);
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login Sistem Inventaris
        </h2>

        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm break-words">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Masukkan username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}