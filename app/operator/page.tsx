'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  merk?: string | null;
  tahun_id?: string | null;
  satuan_id?: string | null;
  kondisi_id?: string | null;

  // Relation Join
  bidang?: { 
    nama_bidang?: string;
    barcode?: string | null;
  } | null;
  barang?: { nama_barang?: string } | null;
  master_barang?: { nama_barang?: string } | null;
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

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Export Modal & Header Form State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedExportTahunId, setSelectedExportTahunId] = useState<string>('');
  const [kodeLokasi, setKodeLokasi] = useState<string>('');
  const [kabupaten, setKabupaten] = useState<string>('KABUPATEN MUSI BANYUASIN');
  const [kuasaPengguna, setKuasaPengguna] = useState<string>('Dinas Komunikasi dan Informatika');
  const [penggunaBarang, setPenggunaBarang] = useState<string>('Dinas Komunikasi dan Informatika');

  const printRef = useRef<HTMLDivElement>(null);

  // Master Options Dropdown
  const [listBarangMaster, setListBarangMaster] = useState<MasterOption[]>([]);
  const [listMerk, setListMerk] = useState<MasterOption[]>([]);
  const [listTahun, setListTahun] = useState<MasterOption[]>([]);
  const [listSatuan, setListSatuan] = useState<MasterOption[]>([]);
  const [listKondisi, setListKondisi] = useState<MasterOption[]>([]);

  // Modal / Pop-up State Form Input
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setIsModalOpen(false);
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

  const handleLogout = async () => {
    const confirmLogout = window.confirm('Apakah Anda yakin ingin keluar?');
    if (!confirmLogout) return;

    setLoggingOut(true);
    try {
      await supabase.auth.signOut();

      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_session');
        localStorage.clear();
        sessionStorage.clear();

        document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
        
        document.cookie.split(';').forEach((cookie) => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          if (name.includes('sb-') || name.includes('supabase')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
          }
        });
      }

      window.location.replace('/login');
    } catch (err: any) {
      console.error('Logout Error:', err);
      window.location.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const fetchMasterOptions = async () => {
    try {
      const [resBarang, resMerk, resTahun, resSatuan, resKondisi] = await Promise.all([
        supabase.from('barang').select('*'),
        supabase.from('merk').select('*'),
        supabase.from('tahun').select('*').order('tahun', { ascending: false }),
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

  const initOperatorData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
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

      const activeUsername = userData.username || 'Operator';
      const activeBidangId = userData.bidang_id || null;
      const namaBidang = userData.bidang?.nama_bidang || 'Bidang Tidak Terdeteksi';

      setCurrentUser({
        id: userData.id,
        username: activeUsername,
        bidang_id: activeBidangId,
        nama_bidang: namaBidang,
      });

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
          merk,
          tahun_id,
          satuan_id,
          kondisi_id,
          bidang:bidang_id ( nama_bidang ),
          barang:barang_id ( nama_barang ),
          master_barang:barang_id ( nama_barang ),
          merk:merk ( merk ),
          tahun:tahun_id ( tahun ),
          satuan:satuan_id ( satuan ),
          kondisi:kondisi_id ( kondisi )
        `)
        .order('created_at', { ascending: false });

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

  const handleOpenExportModal = () => {
    setIsExportModalOpen(true);
  };

  // Langsung Download PDF
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    if (exportFilteredBarang.length === 0) {
      alert('Tidak ada data untuk diunduh!');
      return;
    }

    setIsExportingPdf(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;

      const userBidangName = currentUser?.nama_bidang || 'Bidang';
      const filename = `KIR_${userBidangName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

      const options = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1280,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape',
        },
      } as const;

      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error('Gagal membuat PDF:', error);
      alert('Terjadi kesalahan saat mengunduh PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleEdit = (item: DataBarangItem) => {
    setEditingId(item.id);
    setNibar(item.nibar || '');
    setNomorRegister(item.nomor_register || '');
    setKodeBarang(item.kode_barang || '');
    setSpesifikasi(item.spesifikasi || '');
    setJumlah(item.jumlah || 1);
    setKeterangan(item.keterangan || '');

    setSelectedBarangMaster(item.barang_id || '');
    setSelectedMerk(item.merk || '');
    setSelectedTahun(item.tahun_id || '');
    setSelectedSatuan(item.satuan_id || '');
    setSelectedKondisi(item.kondisi_id || '');

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !kodeBarang.trim() ||
      !nibar.trim() ||
      !nomorRegister.trim() ||
      !selectedBarangMaster ||
      !selectedMerk ||
      !selectedSatuan ||
      !selectedTahun ||
      !selectedKondisi ||
      !spesifikasi.trim() ||
      !keterangan.trim() ||
      jumlah <= 0
    ) {
      alert('Semua bidang/form wajib diisi secara keseluruhan!');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        nibar: nibar.trim(),
        nomor_register: nomorRegister.trim(),
        kode_barang: kodeBarang.trim(),
        spesifikasi: spesifikasi.trim(),
        jumlah: Number(jumlah) || 0,
        keterangan: keterangan.trim(),
        bidang_id: currentUser?.bidang_id || null,
        barang_id: selectedBarangMaster,
        merk_id: selectedMerk,
        tahun_id: selectedTahun,
        satuan_id: selectedSatuan,
        kondisi_id: selectedKondisi,
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

  // Filter Data Utama berdasarkan Search Term
  const filteredDataBarang = listDataBarang.filter((item) => {
    const query = searchTerm.toLowerCase();
    const namaBarang = (item.barang?.nama_barang || item.master_barang?.nama_barang || '').toLowerCase();
    const kodeBarangVal = item.kode_barang?.toLowerCase() || '';
    const nibarVal = item.nibar?.toLowerCase() || '';
    const regVal = item.nomor_register?.toLowerCase() || '';
    const spekVal = item.spesifikasi?.toLowerCase() || '';
    const merkVal = item.merk?.merk?.toLowerCase() || '';
    const ketVal = item.keterangan?.toLowerCase() || '';

    return (
      namaBarang.includes(query) ||
      kodeBarangVal.includes(query) ||
      nibarVal.includes(query) ||
      regVal.includes(query) ||
      spekVal.includes(query) ||
      merkVal.includes(query) ||
      ketVal.includes(query)
    );
  });

  // Data Khusus Ekspor KIR dengan Filter Tahun & Sorting berdasarkan Tahun Ascending
  const exportFilteredBarang = filteredDataBarang
    .filter((item) => {
      if (!selectedExportTahunId) return true;
      return item.tahun_id === selectedExportTahunId;
    })
    .sort((a, b) => {
      const tahunA = parseInt(String(a.tahun?.tahun || '0'), 10);
      const tahunB = parseInt(String(b.tahun?.tahun || '0'), 10);
      return tahunA - tahunB;
    });

  const totalUnitBarang = filteredDataBarang.reduce((acc, curr) => acc + (curr.jumlah || 0), 0);

  const thStyle: React.CSSProperties = {
    border: '1px solid #000000',
    padding: '6px 4px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontWeight: 'bold',
    fontSize: '9px',
    color: '#000000',
    backgroundColor: '#f3f4f6',
  };

  const tdStyle: React.CSSProperties = {
    border: '1px solid #000000',
    padding: '5px 4px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: '9px',
    color: '#000000',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-5 md:p-8 antialiased selection:bg-sky-200">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* --- HEADER UTAMA --- */}
        <header className="bg-white rounded-xl p-4 sm:p-6 border border-sky-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-sky-400" />

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-1">
            
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <div className="p-3 bg-sky-100/70 text-sky-700 rounded-xl flex-shrink-0 border border-sky-200">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10 10 0 0114.142 0M1.757 8.929a15 15 0 0120.486 0" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-sky-600 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60 inline-block mb-1">
                  Pemerintah Daerah
                </span>
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                  DINAS KOMUNIKASI DAN INFORMATIKA
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Sistem Informasi Inventaris Aset &amp; Sarana Prasarana (Operator)
                </p>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <div className="text-left lg:text-right pr-2">
                <p className="text-xs text-slate-500">
                  Operator: <span className="font-semibold text-slate-700">{currentUser?.username || 'Memuat...'}</span>
                </p>
                <span className="inline-block mt-0.5 text-[11px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-medium border border-sky-200">
                  {currentUser?.nama_bidang || 'Loading Unit...'}
                </span>
              </div>

              <button
                onClick={handleOpenExportModal}
                className="text-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3.5 py-2 rounded-lg font-medium transition shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Ekspor KIR</span>
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center justify-center text-xs sm:text-sm bg-rose-50 hover:bg-rose-100 text-rose-600 active:bg-rose-200 border border-rose-200 px-3 sm:px-4 py-2 rounded-lg transition font-medium disabled:opacity-50"
                >
                  {loggingOut ? 'Proses...' : 'Logout'}
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* --- FITUR PENCARIAN BARANG --- */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama, kode, nibar, reg, merk, spek..."
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 font-medium w-full sm:w-auto text-right">
            Menampilkan <span className="font-semibold text-slate-700">{filteredDataBarang.length}</span> dari {listDataBarang.length} items
          </div>
        </div>

        {/* --- PESAN ERROR --- */}
        {errorMessage && (
          <div className="bg-rose-50 text-rose-700 p-3.5 rounded-xl text-xs sm:text-sm break-words border border-rose-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* --- DAFTAR DATA INVENTARIS --- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Daftar Data Barang Inventaris
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
              Total Unit: {totalUnitBarang}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs sm:text-sm flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <span>Memuat data inventaris...</span>
            </div>
          ) : filteredDataBarang.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
              {searchTerm ? 'Tidak ada barang yang cocok dengan kata kunci pencarian.' : 'Belum ada data barang terdaftar untuk bidang ini.'}
            </div>
          ) : (
            <>
              {/* MOBILE CARD VIEW */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredDataBarang.map((item, index) => (
                  <div key={item.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">#{index + 1}</span>
                        <h3 className="text-sm font-bold text-slate-900">{item.barang?.nama_barang || item.master_barang?.nama_barang || '-'}</h3>
                      </div>
                      <span className="text-xs font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200/60">
                        {item.jumlah ?? 0} {item.satuan?.satuan || ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div><span className="text-slate-400">Kode:</span> {item.kode_barang || '-'}</div>
                      <div><span className="text-slate-400">Merk:</span> {item.merk?.merk || '-'}</div>
                      <div><span className="text-slate-400">Nibar:</span> {item.nibar || '-'}</div>
                      <div><span className="text-slate-400">Kondisi:</span> {item.kondisi?.kondisi || item.kondisi?.nama_kondisi || '-'}</div>
                      <div><span className="text-slate-400">Reg:</span> {item.nomor_register || '-'}</div>
                      <div><span className="text-slate-400">Tahun:</span> {String(item.tahun?.tahun || '-')}</div>
                    </div>

                    {item.spesifikasi && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        <span className="font-semibold text-slate-600">Spek:</span> {item.spesifikasi}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 italic bg-amber-50/50 px-2.5 py-1 rounded border border-amber-100/60">
                      <span className="font-semibold not-italic text-slate-600">Ket:</span> {item.keterangan || 'Tidak ada keterangan'}
                    </p>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100/80">
                      <button
                        onClick={() => handleEdit(item)}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs px-3 py-1 rounded-md font-medium transition"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                      <th className="p-3">No</th>
                      <th className="p-3">Jenis Barang</th>
                      <th className="p-3">Identitas (Kode/Nibar/Reg)</th>
                      <th className="p-3">Spesifikasi</th>
                      <th className="p-3">Merk</th>
                      <th className="p-3">Kondisi</th>
                      <th className="p-3">Jumlah</th>
                      <th className="p-3">Bidang</th>
                      <th className="p-3">Tahun</th>
                      <th className="p-3">Keterangan</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDataBarang.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors text-slate-700">
                        <td className="p-3 font-medium text-slate-400">{index + 1}</td>
                        <td className="p-3 font-semibold text-slate-900">
                          {item.barang?.nama_barang || item.master_barang?.nama_barang || '-'}
                        </td>
                        <td className="p-3 text-slate-600 space-y-0.5">
                          <div className="font-medium text-slate-800">Kode: {item.kode_barang || '-'}</div>
                          <div className="text-[10px] text-slate-400">Nibar: {item.nibar || '-'}</div>
                          <div className="text-[10px] text-slate-400">Reg: {item.nomor_register || '-'}</div>
                        </td>
                        <td className="p-3 max-w-[180px] truncate" title={item.spesifikasi || ''}>
                          {item.spesifikasi || '-'}
                        </td>
                        <td className="p-3">{item.merk?.merk || '-'}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                            {item.kondisi?.kondisi || item.kondisi?.nama_kondisi || '-'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                          {item.jumlah ?? 0} {item.satuan?.satuan || ''}
                        </td>
                        <td className="p-3">{item.bidang?.nama_bidang || '-'}</td>
                        <td className="p-3">{String(item.tahun?.tahun || '-')}</td>
                        
                        <td className="p-3 max-w-[200px] truncate text-slate-500 italic" title={item.keterangan || ''}>
                          {item.keterangan || '-'}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(item)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] px-2.5 py-1 rounded transition font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>

      {/* --- POP UP / MODAL PREVIEW & EKSPOR KIR --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-gray-800">
            
            {/* Header Modal Export */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  Ekspor Kartu Inventaris Ruangan (KIR) - Operator
                </h3>
                {currentUser?.nama_bidang && (
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">
                    Bidang / Ruangan: {currentUser.nama_bidang}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {/* BARIS DROPDOWN DROPDOWN FILTER TAHUN */}
            <div className="p-4 border-b bg-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Filter Tahun Perolehan (Opsional)</label>
                <select
                  className="w-full border border-slate-300 p-2 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedExportTahunId}
                  onChange={(e) => setSelectedExportTahunId(e.target.value)}
                >
                  <option value="">-- Semua Tahun --</option>
                  {listTahun.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Kode Lokasi</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 p-2 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={kodeLokasi}
                  onChange={(e) => setKodeLokasi(e.target.value)}
                  placeholder="Masukkan Kode Lokasi..."
                />
              </div>
            </div>

            {/* Area Preview Dokumen KIR */}
            <div className="p-6 overflow-y-auto flex-1 bg-white text-black">
              <div 
                ref={printRef} 
                className="p-4"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  width: '100%',
                  minWidth: '1000px',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                {/* Header Surat/Dokumen */}
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px', textTransform: 'uppercase' }}>
                  <div>PEMERINTAH {kabupaten}</div>
                  <div>KARTU INVENTARIS RUANGAN (KIR)</div>
                  <div>BARANG MILIK DAERAH</div>
                </div>

                {/* Rincian Informasi Lokasi */}
                <table style={{ width: '100%', maxWidth: '600px', fontSize: '11px', fontWeight: '600', marginBottom: '12px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '180px', padding: '2px 0' }}>Kuasa Pengguna Barang</td>
                      <td style={{ width: '10px' }}>:</td>
                      <td>{kuasaPengguna}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 0' }}>Pengguna Barang</td>
                      <td>:</td>
                      <td>{penggunaBarang}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 0' }}>Kode Lokasi</td>
                      <td>:</td>
                      <td>{kodeLokasi || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 0' }}>Nama Ruangan / Bidang</td>
                      <td>:</td>
                      <td style={{ textTransform: 'uppercase' }}>{currentUser?.nama_bidang || '-'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* TABEL DATA BARANG */}
                <table 
                  style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse', 
                    border: '1px solid #000000'
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '30px' }}>No.</th>
                      <th style={thStyle}>NIBAR</th>
                      <th style={thStyle}>Nomor Register</th>
                      <th style={thStyle}>Kode Barang</th>
                      <th style={thStyle}>Nama Barang</th>
                      <th style={thStyle}>Spesifikasi Nama Barang</th>
                      
                      {/* KHUSUS SATUAN */}
                      <th style={{ ...thStyle, padding: 0 }}>
                        <div style={{ borderBottom: '1px solid #000000', padding: '4px 0', fontWeight: 'bold' }}>
                          Satuan
                        </div>
                        <div style={{ display: 'flex' }}>
                          <div style={{ width: '50%', borderRight: '1px solid #000000', padding: '4px 2px' }}>
                            Merk / Tipe
                          </div>
                          <div style={{ width: '50%', padding: '4px 2px' }}>
                            Tahun Perolehan
                          </div>
                        </div>
                      </th>

                      <th style={thStyle}>Jumlah</th>
                      <th style={thStyle}>Satuan</th>
                      <th style={thStyle}>Kondisi</th>
                      <th style={thStyle}>Keterangan</th>
                    </tr>
                  </thead>

                  <tbody>
                    {exportFilteredBarang.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ ...tdStyle, padding: '12px', fontStyle: 'italic' }}>
                          Tidak ada data barang untuk kriteria ini.
                        </td>
                      </tr>
                    ) : (
                      exportFilteredBarang.map((item, index) => {
                        const namaBarang = item.barang?.nama_barang || item.master_barang?.nama_barang || '-';
                        const namaMerk = item.merk?.merk || '-';
                        const tahunVal = item.tahun?.tahun || '-';
                        const satuanVal = item.satuan?.satuan || '-';
                        const kondisiVal = item.kondisi?.kondisi || item.kondisi?.nama_kondisi || '-';

                        return (
                          <tr key={item.id}>
                            <td style={tdStyle}>{index + 1}</td>
                            <td style={tdStyle}>{item.nibar || '-'}</td>
                            <td style={tdStyle}>{item.nomor_register || '-'}</td>
                            <td style={tdStyle}>{item.kode_barang || '-'}</td>
                            <td style={tdStyle}>{namaBarang}</td>
                            <td style={tdStyle}>{item.spesifikasi || '-'}</td>
                            
                            <td style={{ ...tdStyle, padding: 0 }}>
                              <div style={{ display: 'flex', height: '100%' }}>
                                <div style={{ width: '50%', borderRight: '1px solid #000000', padding: '5px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {namaMerk}
                                </div>
                                <div style={{ width: '50%', padding: '5px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {tahunVal}
                                </div>
                              </div>
                            </td>

                            <td style={tdStyle}>{item.jumlah ?? 0}</td>
                            <td style={tdStyle}>{satuanVal}</td>
                            <td style={tdStyle}>{kondisiVal}</td>
                            <td style={tdStyle}>{item.keterangan || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal Action */}
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Tutup
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={exportFilteredBarang.length === 0 || isExportingPdf || loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isExportingPdf ? 'Memproses PDF...' : '📄 Download PDF'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- POP UP / MODAL INPUT FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header Modal */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${editingId ? 'bg-amber-400' : 'bg-sky-500'}`} />
                <h2 className="text-base font-bold text-slate-800">
                  {editingId ? 'Edit Data Inventaris' : 'Tambah Barang Inventaris Baru'}
                </h2>
              </div>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-1.5 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body Form Modal */}
            <form onSubmit={handleSubmit} className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">

                {/* Kode Barang */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Kode Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={kodeBarang}
                    onChange={(e) => setKodeBarang(e.target.value)}
                    placeholder="Contoh: 54321"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  />
                </div>

                {/* NIBAR */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    NIBAR <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={nibar}
                    onChange={(e) => setNibar(e.target.value)}
                    placeholder="Contoh: 9987"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Nomor Register */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nomor Register <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={nomorRegister}
                    onChange={(e) => setNomorRegister(e.target.value)}
                    placeholder="Contoh: 005"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Jenis Barang */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Jenis Barang <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled
                    value={selectedBarangMaster}
                    onChange={(e) => setSelectedBarangMaster(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih Jenis Barang --</option>
                    {listBarangMaster.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Merk */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Merk / Brand <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled
                    value={selectedMerk}
                    onChange={(e) => setSelectedMerk(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih Merk --</option>
                    {listMerk.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Jumlah */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Jumlah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    disabled
                    min="1"
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Satuan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Satuan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled
                    value={selectedSatuan}
                    onChange={(e) => setSelectedSatuan(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih Satuan --</option>
                    {listSatuan.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Tahun */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tahun Perolehan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled
                    value={selectedTahun}
                    onChange={(e) => setSelectedTahun(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih Tahun --</option>
                    {listTahun.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Kondisi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Kondisi Barang <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedKondisi}
                    onChange={(e) => setSelectedKondisi(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800"
                  >
                    <option value="">-- Pilih Kondisi --</option>
                    {listKondisi.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Spesifikasi Detail <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    disabled
                    value={spesifikasi}
                    onChange={(e) => setSpesifikasi(e.target.value)}
                    placeholder="Deskripsi / spesifikasi teknis..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Keterangan */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Keterangan Tambahan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Nama pengguna / Keterangan kondisi / lokasi / catatan barang..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white text-slate-800"
                  />
                </div>

              </div>

              {/* Footer Modal Input */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg text-xs sm:text-sm transition border border-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${
                    editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-600 hover:bg-sky-700'
                  } text-white font-medium px-6 py-2 rounded-lg text-xs sm:text-sm transition disabled:opacity-50 shadow-sm`}
                >
                  {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Data' : 'Simpan Data'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}