'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface MasterOption {
  id: string;
  nama: string;
}

interface DataBarangItem {
  id: string;
  nibar: string | null;
  nomor_register: string | null;
  kode_barang: string | null;
  spesifikasi: string | null;
  jumlah: number | null;
  keterangan: string | null;
  created_at?: string;
  updated_at?: string;
  bidang_id?: string | null;
  barang_id?: string | null;
  merk_id?: string | null;
  tahun_id?: string | null;
  satuan_id?: string | null;
  kondisi_id?: string | null;

  // Relation Join
  bidang?: { 
    nama_bidang?: string;
    barcode?: string | null;
  } | null;
  barang?: { nama_barang?: string } | null;
  merk?: { merk?: string } | null;
  tahun?: { tahun?: string | number } | null;
  satuan?: { satuan?: string } | null;
  kondisi?: { kondisi?: string; nama_kondisi?: string } | null;
}

interface UserProfile {
  id: string;
  username: string;
  bidang_id: string | null;
  nama_bidang?: string;
}

export default function OperatorBarangPage() {
  const router = useRouter();
  const supabase = createClient();

  // State Profile & Main Data
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [listDataBarang, setListDataBarang] = useState<DataBarangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Master Options Dropdown
  const [listBarangMaster, setListBarangMaster] = useState<MasterOption[]>([]);
  const [listMerk, setListMerk] = useState<MasterOption[]>([]);
  const [listTahun, setListTahun] = useState<MasterOption[]>([]);
  const [listSatuan, setListSatuan] = useState<MasterOption[]>([]);
  const [listKondisi, setListKondisi] = useState<MasterOption[]>([]);

  // Form State (Tambah / Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Field Form Sesuai Schema DB
  const [nibar, setNibar] = useState('');
  const [nomorRegister, setNomorRegister] = useState('');
  const [kodeBarang, setKodeBarang] = useState('');
  const [spesifikasi, setSpesifikasi] = useState('');
  const [jumlah, setJumlah] = useState<number>(1);
  const [keterangan, setKeterangan] = useState('');

  const [selectedBarangMaster, setSelectedBarangMaster] = useState('');
  const [selectedMerk, setSelectedMerk] = useState('');
  const [selectedTahun, setSelectedTahun] = useState('');
  const [selectedSatuan, setSelectedSatuan] = useState('');
  const [selectedKondisi, setSelectedKondisi] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setIsFormOpen(false);
    setNibar('');
    setNomorRegister('');
    setKodeBarang('');
    setSpesifikasi('');
    setJumlah(1);
    setKeterangan('');
    setSelectedBarangMaster('');
    setSelectedMerk('');
    setSelectedTahun('');
    setSelectedSatuan('');
    setSelectedKondisi('');
  };

  // Implementasi Logout Sesuai Pola Kode Admin + Supabase SignOut
  const handleLogout = async () => {
    const confirmLogout = window.confirm('Apakah Anda yakin ingin keluar?');
    if (!confirmLogout) return;

    setLoggingOut(true);
    try {
      // 1. SignOut dari Supabase Auth Client
      await supabase.auth.signOut();

      // 2. Hapus sesi di LocalStorage dan SessionStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_session');
        localStorage.clear();
        sessionStorage.clear();

        // 3. Hapus Cookie user_session & cookie Auth Supabase
        document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
        
        document.cookie.split(';').forEach((cookie) => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          if (name.includes('sb-') || name.includes('supabase')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
          }
        });
      }

      // 4. Force replace halaman ke /login agar history terhapus dan state bersih
      window.location.replace('/login');
    } catch (err: any) {
      console.error('Logout Error:', err);
      // Fallback redirect jika terjadi kesalahan async
      window.location.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  // Fetch Option Dropdown
  const fetchMasterOptions = async () => {
    try {
      const [resBarang, resMerk, resTahun, resSatuan, resKondisi] = await Promise.all([
        supabase.from('barang').select('*'),
        supabase.from('merk').select('*'),
        supabase.from('tahun').select('*'),
        supabase.from('satuan').select('*'),
        supabase.from('kondisi').select('*'),
      ]);

      if (resBarang.data) {
        setListBarangMaster(resBarang.data.map((i: any) => ({ id: i.id || i.id_barang, nama: i.nama_barang || i.barang })));
      }
      if (resMerk.data) {
        setListMerk(resMerk.data.map((i: any) => ({ id: i.id || i.id_merk, nama: i.merk || i.nama_merk })));
      }
      if (resTahun.data) {
        setListTahun(resTahun.data.map((i: any) => ({ id: i.id || i.id_tahun, nama: String(i.tahun || i.nama_tahun) })));
      }
      if (resSatuan.data) {
        setListSatuan(resSatuan.data.map((i: any) => ({ id: i.id || i.id_satuan, nama: i.satuan || i.nama_satuan })));
      }
      if (resKondisi.data) {
        setListKondisi(resKondisi.data.map((i: any) => ({ id: i.id || i.id_kondisi, nama: i.kondisi || i.nama_kondisi })));
      }
    } catch (e) {
      console.warn('Gagal memuat opsi master:', e);
    }
  };

  // Inisialisasi User Profile & Data Barang Berdasarkan Bidang User
  const initOperatorData = async () => {
  setLoading(true);
  setErrorMessage('');

  try {
    // 1. Ambil Sesi dari localStorage
    const savedSession = localStorage.getItem('user_session');
    if (!savedSession) {
      router.replace('/login');
      return;
    }

    let searchIdentifier: { field: 'id' | 'username'; value: string } | null = null;

    try {
      const parsedSession = JSON.parse(savedSession);
      if (typeof parsedSession === 'object' && parsedSession !== null) {
        if (parsedSession.id) {
          searchIdentifier = { field: 'id', value: parsedSession.id };
        } else if (parsedSession.username) {
          searchIdentifier = { field: 'username', value: parsedSession.username };
        }
      } else if (typeof parsedSession === 'string') {
        searchIdentifier = { field: 'username', value: parsedSession };
      }
    } catch {
      searchIdentifier = { field: 'username', value: savedSession };
    }

    if (!searchIdentifier) {
      setErrorMessage('Sesi login tidak valid. Silakan login kembali.');
      router.replace('/login');
      return;
    }

    // 2. Ambil User Record dari tabel 'users'
    // DIUBAH: id -> id_bidang
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('*, bidang:bidang_id ( id_bidang, nama_bidang )')
      .eq(searchIdentifier.field, searchIdentifier.value)
      .maybeSingle();

    if (userErr) {
      throw new Error(`Gagal mengambil data user: ${userErr.message}`);
    }

    if (!userData) {
      setErrorMessage('Profil operator tidak ditemukan dalam database users.');
      setLoading(false);
      return;
    }

    // Set data user ke state
    const activeUsername = userData.username || 'Operator';
    const activeBidangId = userData.bidang_id || null;
    const namaBidang = userData.bidang?.nama_bidang || 'Bidang Tidak Terdeteksi';

    setCurrentUser({
      id: userData.id,
      username: activeUsername,
      bidang_id: activeBidangId,
      nama_bidang: namaBidang,
    });

    // 3. Query Data Barang Berdasarkan bidang_id Operator
    let query = supabase
      .from('data_barang')
      .select(`
        id,
        nibar,
        nomor_register,
        kode_barang,
        spesifikasi,
        jumlah,
        keterangan,
        created_at,
        updated_at,
        bidang_id,
        barang_id,
        merk_id,
        tahun_id,
        satuan_id,
        kondisi_id,
        bidang:bidang_id ( nama_bidang ),
        barang:barang_id ( nama_barang ),
        merk:merk_id ( merk ),
        tahun:tahun_id ( tahun ),
        satuan:satuan_id ( satuan ),
        kondisi:kondisi_id ( kondisi )
      `)
      .order('created_at', { ascending: false });

    // Filter berdasarkan bidang_id jika operator terikat pada bidang tertentu
    if (activeBidangId) {
      query = query.eq('bidang_id', activeBidangId);
    }

    const { data: mainData, error: mainErr } = await query;

    if (mainErr) throw mainErr;
    setListDataBarang((mainData as any) || []);

  } catch (err: any) {
    console.error('Init Operator Data Error:', err);
    setErrorMessage(`Gagal memuat data: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    initOperatorData();
    fetchMasterOptions();
  }, []);

  // Handle Edit Data
  const handleEdit = (item: DataBarangItem) => {
    setEditingId(item.id);
    setNibar(item.nibar || '');
    setNomorRegister(item.nomor_register || '');
    setKodeBarang(item.kode_barang || '');
    setSpesifikasi(item.spesifikasi || '');
    setJumlah(item.jumlah || 1);
    setKeterangan(item.keterangan || '');

    setSelectedBarangMaster(item.barang_id || '');
    setSelectedMerk(item.merk_id || '');
    setSelectedTahun(item.tahun_id || '');
    setSelectedSatuan(item.satuan_id || '');
    setSelectedKondisi(item.kondisi_id || '');

    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Data (Tambah / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        nibar: nibar.trim() || null,
        nomor_register: nomorRegister.trim() || null,
        kode_barang: kodeBarang.trim() || null,
        spesifikasi: spesifikasi.trim() || null,
        jumlah: Number(jumlah) || 0,
        keterangan: keterangan.trim() || null,
        bidang_id: currentUser?.bidang_id || null,
        barang_id: selectedBarangMaster || null,
        merk_id: selectedMerk || null,
        tahun_id: selectedTahun || null,
        satuan_id: selectedSatuan || null,
        kondisi_id: selectedKondisi || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('data_barang')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('data_barang')
          .insert([payload]);

        if (error) throw error;
      }

      resetForm();
      await initOperatorData();
    } catch (err: any) {
      console.error('Submit Error:', err);
      setErrorMessage(`Gagal menyimpan data: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Data
  const handleDelete = async (item: DataBarangItem) => {
    const confirmDelete = window.confirm(
      `Hapus data barang "${item.barang?.nama_barang || item.kode_barang || 'ini'}"?`
    );
    if (!confirmDelete) return;

    setDeletingId(item.id);
    try {
      const { error } = await supabase
        .from('data_barang')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      await initOperatorData();
    } catch (err: any) {
      console.error('Delete Error:', err);
      setErrorMessage(`Gagal menghapus data: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Operator */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800">Panel Operator Inventaris</h1>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                {currentUser?.nama_bidang || 'Loading Unit...'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Operator Aktif:{' '}
              <span className="font-semibold text-gray-700">
                {currentUser?.username || 'Loading...'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isFormOpen) resetForm();
                else setIsFormOpen(true);
              }}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition font-medium shadow-sm"
            >
              {isFormOpen ? 'Tutup Form' : '+ Tambah Barang'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition border border-gray-300 font-medium"
            >
              &larr; Kembali
            </button>
            
            {/* Tombol Logout */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center justify-center text-sm bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2 rounded transition font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ml-2"
            >
              {loggingOut ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                'Logout'
              )}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-3 rounded text-sm break-words border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Form Collapsible (Tambah/Edit) */}
        {isFormOpen && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-md font-semibold text-gray-800">
                {editingId ? 'Edit Data Barang' : 'Form Tambah Barang Baru'}
              </h2>
              {editingId && (
                <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2 py-1 rounded">
                  Mode Edit
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Jenis Barang */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Barang</label>
                <select
                  value={selectedBarangMaster}
                  onChange={(e) => setSelectedBarangMaster(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="">-- Pilih Jenis Barang --</option>
                  {listBarangMaster.map((i) => (
                    <option key={i.id} value={i.id}>{i.nama}</option>
                  ))}
                </select>
              </div>

              {/* Kode Barang */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kode Barang</label>
                <input
                  type="text"
                  value={kodeBarang}
                  onChange={(e) => setKodeBarang(e.target.value)}
                  placeholder="Contoh: 54321"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              {/* NIBAR */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">NIBAR</label>
                <input
                  type="text"
                  value={nibar}
                  onChange={(e) => setNibar(e.target.value)}
                  placeholder="Contoh: 9987"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              {/* Nomor Register */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Register</label>
                <input
                  type="text"
                  value={nomorRegister}
                  onChange={(e) => setNomorRegister(e.target.value)}
                  placeholder="Contoh: 005"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              {/* Merk */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Merk / Brand</label>
                <select
                  value={selectedMerk}
                  onChange={(e) => setSelectedMerk(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="">-- Pilih Merk --</option>
                  {listMerk.map((i) => (
                    <option key={i.id} value={i.id}>{i.nama}</option>
                  ))}
                </select>
              </div>

              {/* Jumlah */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah</label>
                <input
                  type="number"
                  min="1"
                  value={jumlah}
                  onChange={(e) => setJumlah(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              {/* Satuan */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Satuan</label>
                <select
                  value={selectedSatuan}
                  onChange={(e) => setSelectedSatuan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="">-- Pilih Satuan --</option>
                  {listSatuan.map((i) => (
                    <option key={i.id} value={i.id}>{i.nama}</option>
                  ))}
                </select>
              </div>

              {/* Tahun */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tahun Perolehan</label>
                <select
                  value={selectedTahun}
                  onChange={(e) => setSelectedTahun(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="">-- Pilih Tahun --</option>
                  {listTahun.map((i) => (
                    <option key={i.id} value={i.id}>{i.nama}</option>
                  ))}
                </select>
              </div>

              {/* Kondisi */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kondisi Barang</label>
                <select
                  value={selectedKondisi}
                  onChange={(e) => setSelectedKondisi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="">-- Pilih Kondisi --</option>
                  {listKondisi.map((i) => (
                    <option key={i.id} value={i.id}>{i.nama}</option>
                  ))}
                </select>
              </div>

              {/* Spesifikasi */}
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Spesifikasi Detail</label>
                <textarea
                  rows={2}
                  value={spesifikasi}
                  onChange={(e) => setSpesifikasi(e.target.value)}
                  placeholder="Spesifikasi teknis..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              {/* Keterangan */}
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Keterangan..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              {/* Submit Buttons */}
              <div className="md:col-span-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${
                    editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white font-medium px-6 py-2 rounded text-sm transition disabled:opacity-50`}
                >
                  {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Data' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabel Data Barang Operator */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-md font-semibold text-gray-800 mb-4">Daftar Data Barang Inventaris</h2>

          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Memuat data barang...</p>
          ) : listDataBarang.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Belum ada data barang terdaftar untuk bidang ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                    <th className="p-2 font-semibold">No</th>
                    <th className="p-2 font-semibold">Nama / Jenis Barang</th>
                    <th className="p-2 font-semibold">Kode / NIBAR / Reg</th>
                    <th className="p-2 font-semibold">Spesifikasi</th>
                    <th className="p-2 font-semibold">Merk</th>
                    <th className="p-2 font-semibold">Kondisi</th>
                    <th className="p-2 font-semibold">Jumlah</th>
                    <th className="p-2 font-semibold">Bidang</th>
                    <th className="p-2 font-semibold">Tahun</th>
                    <th className="p-2 font-semibold">Ket</th>
                    <th className="p-2 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {listDataBarang.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50 text-gray-800 ${
                        editingId === item.id ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="p-2 font-medium">{index + 1}</td>
                      <td className="p-2 font-semibold text-gray-900">
                        {item.barang?.nama_barang || '-'}
                      </td>
                      <td className="p-2 text-gray-700">
                        <div>Kode: {item.kode_barang || '-'}</div>
                        <div className="text-[10px] text-gray-500">Nibar: {item.nibar || '-'}</div>
                        <div className="text-[10px] text-gray-500">Reg: {item.nomor_register || '-'}</div>
                      </td>
                      <td className="p-2 max-w-xs truncate">{item.spesifikasi || '-'}</td>
                      <td className="p-2">{item.merk?.merk || '-'}</td>
                      <td className="p-2">{item.kondisi?.kondisi || item.kondisi?.nama_kondisi || '-'}</td>
                      <td className="p-2 font-medium">{item.jumlah ?? 0} {item.satuan?.satuan || ''}</td>
                      <td className="p-2">{item.bidang?.nama_bidang || '-'}</td>
                      <td className="p-2">{String(item.tahun?.tahun || '-')}</td>
                      <td className="p-2 max-w-xs truncate">{item.keterangan || '-'}</td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] px-2 py-1 rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="bg-red-500 hover:bg-red-600 text-white text-[11px] px-2 py-1 rounded transition disabled:opacity-50"
                          >
                            {deletingId === item.id ? '...' : 'Hapus'}
                          </button>
                        </div>
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