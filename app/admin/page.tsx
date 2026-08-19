'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Package,
  FolderKanban,
  Users,
  Search,
  LogOut,
  QrCode,
  PlusCircle,
  Building2,
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Menu,
  X,
  Loader2
} from 'lucide-react';

interface StatData {
  totalBarang: number;
  totalBidang: number;
  totalUsers: number;
  totalPerbaikan: number;
  kondisiBaik: number;
  kondisiRusakRingan: number;
  kondisiRusakBerat: number;
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingStats, setFetchingStats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [statsData, setStatsData] = useState<StatData>({
    totalBarang: 0,
    totalBidang: 0,
    totalUsers: 0,
    totalPerbaikan: 0,
    kondisiBaik: 0,
    kondisiRusakRingan: 0,
    kondisiRusakBerat: 0,
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const savedSession = localStorage.getItem('user_session');

    if (!savedSession) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(savedSession);

      if (!parsedUser.role || !parsedUser.role.includes('admin')) {
        alert('Anda tidak memiliki akses ke halaman Admin!');
        router.replace('/login');
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error('Gagal membaca sesi:', error);
      localStorage.removeItem('user_session');
      document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      router.replace('/login');
      return;
    } finally {
      setLoading(false);
    }

    async function loadDashboardStats() {
      setFetchingStats(true);
      try {
        const [
          { count: countBarang },
          { count: countBidang },
          { count: countUsers },
          { data: itemsKondisi }
        ] = await Promise.all([
          supabase.from('data_barang').select('*', { count: 'exact', head: true }),
          supabase.from('bidang').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('data_barang').select('kondisi_id')
        ]);

        let baik = 0;
        let rusakRingan = 0;
        let rusakBerat = 0;

        if (itemsKondisi) {
          itemsKondisi.forEach((item) => {
            const kId = String(item.kondisi_id);
            if (kId === '1' || kId === 'baik') {
              baik++;
            } else if (kId === '2' || kId === 'rusak_ringan') {
              rusakRingan++;
            } else if (kId === '3' || kId === 'rusak_berat') {
              rusakBerat++;
            } else {
              baik++;
            }
          });
        }

        setStatsData({
          totalBarang: countBarang || 0,
          totalBidang: countBidang || 0,
          totalUsers: countUsers || 0,
          totalPerbaikan: rusakRingan + rusakBerat,
          kondisiBaik: baik,
          kondisiRusakRingan: rusakRingan,
          kondisiRusakBerat: rusakBerat,
        });
      } catch (err) {
        console.error('Gagal mengambil data statistik:', err);
      } finally {
        setFetchingStats(false);
      }
    }

    loadDashboardStats();
  }, [router, supabase]);

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    window.location.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/80 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3 bg-white/60 p-6 rounded-2xl border border-white/60 shadow-lg backdrop-blur-md">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-medium text-sm">Memuat Dashboard Admin...</p>
        </div>
      </div>
    );
  }

  // Formatting Kartu Metric
  const stats = [
    { 
      label: 'Total Inventaris', 
      value: statsData.totalBarang.toLocaleString('id-ID'), 
      icon: Boxes, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50/70', 
      border: 'border-blue-200/60' 
    },
    { 
      label: 'Total Bidang / Unit', 
      value: statsData.totalBidang.toLocaleString('id-ID'), 
      icon: Building2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50/70', 
      border: 'border-emerald-200/60' 
    },
    { 
      label: 'Total Pengguna', 
      value: statsData.totalUsers.toLocaleString('id-ID'), 
      icon: Users, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50/70', 
      border: 'border-purple-200/60' 
    },
    { 
      label: 'Barang Perlu Perbaikan', 
      value: statsData.totalPerbaikan.toLocaleString('id-ID'), 
      icon: AlertTriangle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50/70', 
      border: 'border-amber-200/60' 
    },
  ];

  const totalBarangKondisi = statsData.totalBarang || 1;
  const pctBaik = Math.round((statsData.kondisiBaik / totalBarangKondisi) * 100);
  const pctRusakRingan = Math.round((statsData.kondisiRusakRingan / totalBarangKondisi) * 100);
  const pctRusakBerat = Math.round((statsData.kondisiRusakBerat / totalBarangKondisi) * 100);

  const menuCards = [
    {
      title: 'Kelola Master Data',
      desc: 'Atur data referensi seperti Bidang, Merk, Satuan, dan Kategori.',
      path: '/admin/master-data',
      icon: FolderKanban,
      badge: 'Data Base',
    },
    {
      title: 'Kelola Barang',
      desc: 'Tambah, edit, hapus, dan lihat seluruh daftar aset & inventaris.',
      path: '/admin/barang',
      icon: Package,
      badge: 'Utama',
    },
    {
      title: 'Kelola Pengguna',
      desc: 'Manajemen akun pengguna, reset password, dan atribusi role.',
      path: '/admin/users',
      icon: Users,
      badge: 'Keamanan',
    },
  ];

  const filteredCards = menuCards.filter(
    (card) =>
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 relative overflow-hidden">
      {/* Dynamic Ambient Background Blur Circles */}
      <div className="fixed -top-20 -left-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 -right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-20 left-1/3 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* 1. HEADER UTAMA (Glassmorphism) */}
      <header className="bg-white/70 backdrop-blur-md border-b border-white/50 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Identitas Instansi */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-700/90 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md shadow-blue-200 backdrop-blur-sm">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Dinas Komunikasi dan Informatika
                </h1>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 inline" /> System Panel Inventaris Aset
                </p>
              </div>
            </div>

            {/* Profil User & Tombol Akses (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-200/50 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/60 shadow-inner">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold capitalize shadow">
                  {user?.username?.[0] || 'A'}
                </div>
                <div className="text-left text-xs">
                  <p className="font-semibold text-slate-800 capitalize leading-none">{user?.username}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user?.role}</p>
                </div>
              </div>

              <Link
                href="/admin/qr-bidang"
                className="bg-emerald-600/90 hover:bg-emerald-700 backdrop-blur-sm text-white text-xs px-3.5 py-2 rounded-lg transition font-medium flex items-center gap-1.5 shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Bidang</span>
              </Link>

              <button
                onClick={handleLogout}
                className="bg-rose-50/80 hover:bg-rose-100 backdrop-blur-sm text-rose-600 hover:text-rose-700 border border-rose-200/60 text-xs px-3.5 py-2 rounded-lg transition font-medium flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>

            {/* Toggle Mobile Menu */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-200/50 transition"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown (Glassmorphism) */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/80 backdrop-blur-lg border-b border-white/60 px-4 pt-2 pb-4 space-y-3">
            <div className="p-3 bg-slate-100/60 backdrop-blur-sm rounded-lg flex items-center gap-3 border border-white/60">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold capitalize">
                {user?.username?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 capitalize">{user?.username}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/qr-bidang"
                className="flex-1 bg-emerald-600 text-white text-xs py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5 shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Bidang</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex-1 bg-rose-50/80 text-rose-600 border border-rose-200/60 text-xs py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. KONTEN UTAMA */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* Banner Welcome & Fast Search (Frosted Glass Blue) */}
        <div className="bg-gradient-to-r from-blue-900/90 via-blue-800/90 to-indigo-900/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-white/20 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="bg-white/15 backdrop-blur-md text-blue-100 text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
              Dashboard Administrator
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
              Selamat Datang Kembali, <span className="text-blue-300 capitalize">{user?.username}</span>!
            </h2>
            <p className="text-blue-100/90 text-sm mt-2 leading-relaxed font-normal">
              Sistem Pengelolaan Inventaris Barang Dinas Komunikasi dan Informatika siap digunakan.
            </p>

            {/* Input Pencarian Fitur/Menu (Glassy Input) */}
            <div className="mt-6 relative max-w-md">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari menu, fitur, atau pengelolaan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white/80 backdrop-blur-md text-slate-800 placeholder-slate-400 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/60 shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* 3. METRIC CARDS / STATISTIK DINAMIS (Glassmorphism Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className={`bg-white/60 backdrop-blur-md p-5 rounded-2xl border ${item.border} shadow-sm hover:shadow-md transition-all flex items-center justify-between`}
              >
                <div>
                  <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {fetchingStats ? (
                      <span className="inline-block w-12 h-6 bg-slate-200/80 animate-pulse rounded"></span>
                    ) : (
                      item.value
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${item.bg} backdrop-blur-sm border border-white/40`}>
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. MENU NAVIGASI KELOLA UTAMA */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> Modul Pengelolaan Utama
            </h3>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-xs text-blue-600 hover:underline font-medium">
                Reset Pencarian
              </button>
            )}
          </div>

          {filteredCards.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md p-8 text-center rounded-2xl border border-white/60 shadow-sm">
              <p className="text-slate-500 text-sm">Tidak ada menu yang sesuai dengan kata kunci "{searchQuery}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => router.push(card.path)}
                    className="bg-white/60 backdrop-blur-md border border-white/70 hover:border-blue-400/80 hover:bg-white/80 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-slate-100/80 group-hover:bg-blue-600 group-hover:text-white transition-colors rounded-xl text-slate-700 backdrop-blur-sm border border-white/50">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 bg-slate-200/50 backdrop-blur-sm text-slate-600 rounded-full border border-white/60">
                          {card.badge}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                      <span>Buka Halaman</span>
                      <span>&rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. BAGIAN TAMBAHAN: AKSES CEPAT + STATISTIK KONDISI DINAMIS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Akses Cepat / Action Shortcuts */}
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-sm">
            <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-600" /> Akses Pintasan Cepat
            </h4>
            <div className="space-y-2.5">
              <button
                onClick={() => router.push('/admin/barang')}
                className="w-full text-left p-3 rounded-xl bg-slate-50/60 hover:bg-blue-50/80 hover:border-blue-200/80 border border-slate-200/50 text-xs font-medium text-slate-700 flex items-center justify-between transition backdrop-blur-sm"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" /> + Tambah Inventaris Barang Baru
                </span>
                <span className="text-slate-400">&rsaquo;</span>
              </button>

              <button
                onClick={() => router.push('/admin/users')}
                className="w-full text-left p-3 rounded-xl bg-slate-50/60 hover:bg-purple-50/80 hover:border-purple-200/80 border border-slate-200/50 text-xs font-medium text-slate-700 flex items-center justify-between transition backdrop-blur-sm"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" /> + Daftarkan Operator / User Baru
                </span>
                <span className="text-slate-400">&rsaquo;</span>
              </button>

              <button
                onClick={() => router.push('/admin/qr-bidang')}
                className="w-full text-left p-3 rounded-xl bg-slate-50/60 hover:bg-emerald-50/80 hover:border-emerald-200/80 border border-slate-200/50 text-xs font-medium text-slate-700 flex items-center justify-between transition backdrop-blur-sm"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600" /> Generasi Kode QR Lokasi Bidang
                </span>
                <span className="text-slate-400">&rsaquo;</span>
              </button>
            </div>
          </div>

          {/* Chart Visual Kondisi Barang (Realtime) */}
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Ringkasan Kondisi Aset Barang
              </h4>
              <span className="text-xs text-slate-400">Terintegrasi Diskominfo</span>
            </div>

            {fetchingStats ? (
              <div className="space-y-4 py-4">
                <div className="h-8 bg-slate-200/60 rounded-lg animate-pulse"></div>
                <div className="h-8 bg-slate-200/60 rounded-lg animate-pulse"></div>
                <div className="h-8 bg-slate-200/60 rounded-lg animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Kondisi Baik */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-700">Kondisi Baik ({pctBaik}%)</span>
                    <span className="text-emerald-600 font-semibold">{statsData.kondisiBaik} Unit</span>
                  </div>
                  <div className="w-full bg-slate-200/60 rounded-full h-3 overflow-hidden p-0.5 border border-white/50">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500 shadow-sm" 
                      style={{ width: `${pctBaik}%` }}
                    ></div>
                  </div>
                </div>

                {/* Kondisi Rusak Ringan */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-700">Rusak Ringan ({pctRusakRingan}%)</span>
                    <span className="text-amber-600 font-semibold">{statsData.kondisiRusakRingan} Unit</span>
                  </div>
                  <div className="w-full bg-slate-200/60 rounded-full h-3 overflow-hidden p-0.5 border border-white/50">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all duration-500 shadow-sm" 
                      style={{ width: `${pctRusakRingan}%` }}
                    ></div>
                  </div>
                </div>

                {/* Kondisi Rusak Berat */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-700">Rusak Berat / Afkir ({pctRusakBerat}%)</span>
                    <span className="text-rose-600 font-semibold">{statsData.kondisiRusakBerat} Unit</span>
                  </div>
                  <div className="w-full bg-slate-200/60 rounded-full h-3 overflow-hidden p-0.5 border border-white/50">
                    <div 
                      className="bg-rose-500 h-2 rounded-full transition-all duration-500 shadow-sm" 
                      style={{ width: `${pctRusakBerat}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200/60 text-center">
              <p className="text-[11px] text-slate-400">
                Data diperbarui secara realtime dari database inventaris dinas.
              </p>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}