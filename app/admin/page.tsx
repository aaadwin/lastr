'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Cek sesi pengguna di localStorage
    const savedSession = localStorage.getItem('user_session');

    if (!savedSession) {
      // Jika tidak ada sesi, lempar kembali ke halaman login
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(savedSession);
      
      // Proteksi Tambahan Client-Side: Pastikan role-nya adalah admin/administrator
      if (!parsedUser.role || !parsedUser.role.includes('admin')) {
        alert('Anda tidak memiliki akses ke halaman Admin!');
        router.replace('/login');
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error('Gagal membaca sesi:', error);
      
      // Hapus sesi lokal dan cookie jika data terdistorsi
      localStorage.removeItem('user_session');
      document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Handler Logout Lengkap (Bersihkan LocalStorage + Cookie)
  const handleLogout = () => {
    // 1. Hapus sesi di LocalStorage
    localStorage.removeItem('user_session');

    // 2. Hapus Cookie agar Middleware memblokir akses secara instan
    document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';

    // 3. Force replace ke login agar history browser terkelupas
    window.location.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Memuat halaman admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

{/* Header Admin */}
<header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
  <h1 className="text-xl font-bold text-gray-800">
    Panel Administrator Inventaris
  </h1>
  <div className="flex items-center gap-4">
    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full capitalize">
      👤 {user?.username} ({user?.role})
    </span>

    {/* Tombol QR Bidang */}
    <Link
      href="/admin/qr-bidang"
      className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded transition font-medium flex items-center gap-1.5"
    >
      <span>📱</span> QR Bidang
    </Link>

    <button
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded transition font-medium"
    >
      Logout
    </button>
  </div>
</header>

      {/* Konten Dashboard */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Selamat Datang, <span className="text-blue-600 capitalize">{user?.username}</span>!
          </h2>
          <p className="text-gray-600 text-sm">
            Silakan pilih menu di bawah ini untuk mengelola data barang, master data pendukung, maupun akses pengguna sistem.
          </p>
        </div>

        {/* Menu Navigasi Utama */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Kelola Barang */}
          <div 
            onClick={() => router.push('/admin/barang')}
            className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm hover:shadow-md hover:bg-blue-100 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-blue-900 text-lg group-hover:text-blue-700">
                  Kelola Barang
                </h3>
                <span className="text-xl">📦</span>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">
                Tambah, edit, hapus, dan lihat seluruh daftar barang inventaris.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Buka Menu &rarr;
            </div>
          </div>

          {/* Card 2: Kelola Master Data */}
          <div 
            onClick={() => router.push('/admin/master-data')}
            className="bg-green-50 border border-green-200 p-6 rounded-lg shadow-sm hover:shadow-md hover:bg-green-100 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-green-900 text-lg group-hover:text-green-700">
                  Kelola Master Data
                </h3>
                <span className="text-xl">🗂️</span>
              </div>
              <p className="text-xs text-green-700 leading-relaxed">
                Atur kategori dropdown (Bidang, Merk, Satuan, Kategori, Tahun).
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-green-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Buka Menu &rarr;
            </div>
          </div>

          {/* Card 3: Kelola Pengguna */}
          <div 
            onClick={() => router.push('/admin/users')}
            className="bg-purple-50 border border-purple-200 p-6 rounded-lg shadow-sm hover:shadow-md hover:bg-purple-100 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-purple-900 text-lg group-hover:text-purple-700">
                  Kelola Pengguna
                </h3>
                <span className="text-xl">👥</span>
              </div>
              <p className="text-xs text-purple-700 leading-relaxed">
                Manajemen akun pengguna, reset password, dan pembagian role.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Buka Menu &rarr;
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}