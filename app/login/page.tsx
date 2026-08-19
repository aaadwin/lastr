'use client';

import { useState } from 'react';
import { authenticateUser } from '@/app/actions/loginAction';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    console.log('--- START LOGIN PROCESS ---');
    console.log('Input Username:', username);

    try {
      // 1. Panggil Server Action untuk autentikasi + hash comparison
      const result = await authenticateUser(username, password);

      if (!result.success || !result.user) {
        setErrorMessage(result.message || 'Gagal masuk ke sistem.');
        setLoading(false);
        return;
      }

      const { id, username: cleanUsername, role: cleanRole, rawRoleName } = result.user;

      console.log('Authentication Successful! Role:', cleanRole);

      // 2. Simpan Sesi (di LocalStorage & Cookie)
      const sessionData = {
        id,
        username: cleanUsername,
        role: cleanRole,
      };

      // LocalStorage
      localStorage.setItem('user_session', JSON.stringify(sessionData));

      // Cookie (Berlaku 1 Hari)
      document.cookie = `user_session=${encodeURIComponent(
        JSON.stringify(sessionData)
      )}; path=/; max-age=86400; SameSite=Lax`;

      // 3. Routing berdasarkan Role
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

      // 4. Force Redirect
      console.log('Melakukan redirect ke:', targetPath);
      window.location.replace(targetPath);

    } catch (err: any) {
      console.error('Catch Error:', err);
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden font-sans select-none">
      
      {/* 1. Subtle Rain Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter brightness-95 opacity-85 transition-all duration-700"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1920&auto=format&fit=crop')`,
        }}
      />

      {/* 2. Soft Overlay Tint for Rain Texture Softening */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-900/30 via-slate-900/20 to-blue-950/40 backdrop-blur-[1px]" />

      {/* 3. Ambient Glow Effects */}
      <div className="absolute top-[15%] left-[20%] w-[25rem] h-[25rem] bg-sky-300/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[20%] w-[22rem] h-[22rem] bg-blue-400/25 rounded-full blur-[90px] pointer-events-none" />

      {/* 4. Main Glassmorphism Card */}
      <div className="relative z-10 max-w-md w-full bg-white/75 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-sky-950/20 p-8 sm:p-10 transition-all">
        
        {/* Header Section */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-sky-400 to-blue-600 rounded-2xl shadow-lg shadow-sky-500/30 text-white text-2xl mb-1">
            🏛️
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Dinas Komunikasi
          </h1>
          <p className="text-xs font-semibold text-sky-700 tracking-wide uppercase">
            Sistem Informasi Inventaris Barang
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50/90 text-rose-700 p-3.5 rounded-2xl mb-6 text-xs font-medium break-words border border-rose-200/80 shadow-sm flex items-center gap-2.5 animate-shake">
            <span className="text-sm">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all shadow-sm"
                placeholder="Masukkan username Anda"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-sky-500/25 active:scale-[0.98] disabled:opacity-50 text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses Hak Akses...</span>
              </>
            ) : (
              'Masuk ke Sistem →'
            )}
          </button>

        </form>

        {/* Footer Credit */}
        <div className="mt-8 text-center pt-4 border-t border-slate-200/40">
          <p className="text-[11px] font-medium text-slate-500">
            &copy; {new Date().getFullYear()} Diskominfo. All Rights Reserved.
          </p>
        </div>

      </div>

    </div>
  );
}