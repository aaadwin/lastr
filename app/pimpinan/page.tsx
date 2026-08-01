'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface BidangItem {
  id_bidang: string;
  nama_bidang: string;
}

interface BarangItem {
  id: string;
  nibar: string;
  nomor_register: string;
  kode_barang: string;
  spesifikasi: string;
  jumlah: number;
  keterangan: string;
  bidang_id: string;
  bidang?: { nama_bidang?: string } | null;
  barang?: { nama_barang?: string } | null;
  merk?: { merk?: string } | null;
  tahun?: { tahun?: string } | null;
  satuan?: { satuan?: string } | null;
  kondisi?: { kondisi?: string } | null;
}

export default function PimpinanDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  // State User & Auth
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);

  // State Data Master & Barang
  const [listBidang, setListBidang] = useState<BidangItem[]>([]);
  const [listBarang, setListBarang] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // State Filter & Search
  const [activeTab, setActiveTab] = useState<string>('ALL'); // 'ALL' atau ID bidang
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Cek Sesi User & Role Pimpinan
  useEffect(() => {
    const savedSession = localStorage.getItem('user_session');

    if (!savedSession) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(savedSession);

      // Pastikan role sesuai (misal: pimpinan / pimpinan_bidang / eksekutif)
      if (!parsedUser.role) {
        alert('Anda tidak memiliki akses ke halaman ini!');
        router.replace('/login');
        return;
      }

      setUser(parsedUser);
      fetchData(); // Muat data setelah autentikasi valid
    } catch (error) {
      console.error('Gagal membaca sesi pimpinan:', error);
      localStorage.removeItem('user_session');
      document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      router.replace('/login');
    }
  }, [router]);

  // 2. Handler Logout Lengkap (Sama seperti halaman Admin)
  const handleLogout = () => {
    // 1. Hapus sesi di LocalStorage
    localStorage.removeItem('user_session');

    // 2. Hapus Cookie agar Middleware memblokir akses secara instan
    document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';

    // 3. Force replace ke login agar history browser terhapus
    window.location.replace('/login');
  };

  // 3. Fetch Semua Data Bidang & Barang dari Supabase
  const fetchData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // Fetch Bidang
      const { data: dataBidang, error: errBidang } = await supabase
        .from('bidang')
        .select('id_bidang, nama_bidang')
        .order('nama_bidang', { ascending: true });

      if (errBidang) throw errBidang;
      setListBidang(dataBidang || []);

      // Fetch Data Barang beserta Relasi
      const { data: dataBarang, error: errBarang } = await supabase
        .from('data_barang')
        .select(`
          id,
          nibar,
          nomor_register,
          kode_barang,
          spesifikasi,
          jumlah,
          keterangan,
          bidang_id,
          bidang:bidang_id ( id_bidang, nama_bidang ),
          barang:barang_id ( nama_barang ),
          merk:merk_id ( merk ),
          tahun:tahun_id ( tahun ),
          satuan:satuan_id ( satuan ),
          kondisi:kondisi_id ( kondisi )
        `)
        .order('created_at', { ascending: false });

      if (errBarang) throw errBarang;
      setListBarang((dataBarang as any) || []);

    } catch (err: any) {
      console.error('Fetch Pimpinan Data Error:', err);
      setErrorMessage(`Gagal memuat data pimpinan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter Barang Berdasarkan Tab Bidang & Search Input
  const filteredBarang = listBarang.filter((item) => {
    const matchesTab = activeTab === 'ALL' || item.bidang_id === activeTab;
    const query = searchQuery.toLowerCase();

    const namaBarang = item.barang?.nama_barang?.toLowerCase() || '';
    const nibar = item.nibar?.toLowerCase() || '';
    const bidang = item.bidang?.nama_bidang?.toLowerCase() || '';
    const merk = item.merk?.merk?.toLowerCase() || '';

    const matchesSearch =
      namaBarang.includes(query) ||
      nibar.includes(query) ||
      bidang.includes(query) ||
      merk.includes(query);

    return matchesTab && matchesSearch;
  });

  // Total Unit Barang
  const totalSeluruhBarang = listBarang.reduce((acc, b) => acc + (b.jumlah || 0), 0);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Memuat halaman pimpinan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Dashboard Pimpinan */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-lg shadow-sm border border-gray-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wide">
                Akses Pimpinan / Eksekutif
              </span>
              {user && (
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded capitalize">
                  👤 {user.username}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Laporan & Pengawasan Aset / Barang</h1>
            <p className="text-xs text-gray-500">Monitoring rekapitulasi data barang di seluruh bidang & unit kerja</p>
          </div>

          {/* Tombol Logout Sesuai Referensi Admin */}
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-2 rounded transition font-semibold shadow-sm cursor-pointer"
          >
            Logout
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-3 rounded text-sm border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Ringkasan Statistik Per Bidang (Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-indigo-600">
            <p className="text-xs text-gray-500 font-medium uppercase">Total Seluruh Unit Barang</p>
            <p className="text-2xl font-bold text-indigo-900 mt-1">
              {totalSeluruhBarang} <span className="text-xs font-normal text-gray-500">unit</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Tercatat di {listBidang.length} Bidang</p>
          </div>

          {listBidang.map((b) => {
            const barangBidang = listBarang.filter((item) => item.bidang_id === b.id_bidang);
            const totalUnit = barangBidang.reduce((acc, cur) => acc + (cur.jumlah || 0), 0);

            return (
              <div
                key={b.id_bidang}
                onClick={() => setActiveTab(b.id_bidang)}
                className={`bg-white p-4 rounded-lg shadow-sm border cursor-pointer transition hover:border-indigo-400 ${
                  activeTab === b.id_bidang ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'
                }`}
              >
                <p className="text-xs text-gray-500 font-medium truncate">{b.nama_bidang}</p>
                <p className="text-xl font-bold text-gray-800 mt-1">
                  {totalUnit} <span className="text-xs font-normal text-gray-500">unit</span>
                </p>
                <p className="text-[11px] text-indigo-600 font-medium mt-1">
                  {barangBidang.length} Jenis Item &rarr;
                </p>
              </div>
            );
          })}
        </div>

        {/* Kontrol Filter & Tabel Utama */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          
          {/* Navigasi Tab Bidang & Form Pencarian */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b pb-4">
            
            {/* Filter Tab Bidang */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-thin">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  activeTab === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Semua Bidang ({listBarang.length})
              </button>
              {listBidang.map((b) => {
                const count = listBarang.filter((item) => item.bidang_id === b.id_bidang).length;
                return (
                  <button
                    key={b.id_bidang}
                    onClick={() => setActiveTab(b.id_bidang)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                      activeTab === b.id_bidang
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {b.nama_bidang} ({count})
                  </button>
                );
              })}
            </div>

            {/* Form Pencarian */}
            <div className="w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari barang, NIBAR, bidang..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>

          </div>

          {/* Rincian Tabel Barang */}
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Memuat data inventaris...</div>
          ) : filteredBarang.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm italic">
              Tidak ada data barang yang sesuai dengan filter/pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">NIBAR / Reg</th>
                    <th className="p-2.5">Nama Barang & Spesifikasi</th>
                    <th className="p-2.5">Bidang / Unit</th>
                    <th className="p-2.5">Merk / Tahun</th>
                    <th className="p-2.5 text-center">Jumlah</th>
                    <th className="p-2.5">Kondisi</th>
                    <th className="p-2.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBarang.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2.5 text-gray-500">{index + 1}</td>
                      <td className="p-2.5 font-mono">
                        <span className="font-semibold text-gray-800">{item.nibar || '-'}</span>
                        <br />
                        <span className="text-[10px] text-gray-400">Reg: {item.nomor_register || '-'}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-bold text-gray-900">{item.barang?.nama_barang || 'Tanpa Nama'}</span>
                        {item.spesifikasi && (
                          <p className="text-[11px] text-gray-500 line-clamp-1">{item.spesifikasi}</p>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-medium">
                          {item.bidang?.nama_bidang || 'Tanpa Bidang'}
                        </span>
                      </td>
                      <td className="p-2.5 text-gray-600">
                        {item.merk?.merk || '-'} {item.tahun?.tahun ? `(${item.tahun.tahun})` : ''}
                      </td>
                      <td className="p-2.5 text-center font-bold text-gray-800">
                        {item.jumlah || 0} {item.satuan?.satuan || ''}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          item.kondisi?.kondisi?.toLowerCase().includes('baik')
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.kondisi?.kondisi?.toLowerCase().includes('rusak berat')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.kondisi?.kondisi || 'Tidak Diketahui'}
                        </span>
                      </td>
                      <td className="p-2.5 text-gray-500 italic">
                        {item.keterangan || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}