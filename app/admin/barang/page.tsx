'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ExportKirModal from '../../EksporKirModal';

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
  evidence_url?: string | null;
  created_at: string;
  bidang_id?: string | null;
  barang_id?: string | null;
  merk?: string | null;
  tahun_id?: string | null;
  satuan_id?: string | null;
  kondisi_id?: string | null;
  bidang?: { 
    nama_bidang: string;
    barcode?: string | null;
    user?: { username: string } | null;
  } | null;
  barang?: { nama_barang: string } | null;
  tahun?: { tahun: string | number } | null;
  satuan?: { satuan: string } | null;
  kondisi?: { kondisi: string; nama_kondisi?: string } | null;
}

export default function KelolaBarangPage() {
  const router = useRouter();
  const supabase = createClient();

  // State List Options Master
  const [listBidang, setListBidang] = useState<MasterOption[]>([]);
  const [listBarangMaster, setListBarangMaster] = useState<MasterOption[]>([]);
  const [listTahun, setListTahun] = useState<MasterOption[]>([]);
  const [listSatuan, setListSatuan] = useState<MasterOption[]>([]);
  const [listKondisi, setListKondisi] = useState<MasterOption[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // State Main Data & Search
  const [listDataBarang, setListDataBarang] = useState<DataBarangItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // State Modal & Edit Mode
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State Form Input & Evidence
  const [nibar, setNibar] = useState('');
  const [nomorRegister, setNomorRegister] = useState('');
  const [kodeBarang, setKodeBarang] = useState('');
  const [spesifikasi, setSpesifikasi] = useState('');
  const [jumlah, setJumlah] = useState<number>(1);
  const [keterangan, setKeterangan] = useState('');
  const [merkInput, setMerkInput] = useState('');

  const [selectedBidang, setSelectedBidang] = useState('');
  const [selectedBarangMaster, setSelectedBarangMaster] = useState('');
  const [selectedTahun, setSelectedTahun] = useState('');
  const [selectedSatuan, setSelectedSatuan] = useState('');
  const [selectedKondisi, setSelectedKondisi] = useState('');

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

  // Reset Form Input & Close Modal
  const resetForm = () => {
    setEditingId(null);
    setEvidenceUrl(null);
    setEvidenceFile(null);
    setNibar('');
    setNomorRegister('');
    setKodeBarang('');
    setSpesifikasi('');
    setJumlah(1);
    setKeterangan('');
    setMerkInput('');
    setSelectedBidang('');
    setSelectedBarangMaster('');
    setSelectedTahun('');
    setSelectedSatuan('');
    setSelectedKondisi('');
    setErrorMessage('');
    setIsModalOpen(false);
  };

  // Open Modal for New Entry
  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Fetch Master Options & Data Barang
  const fetchData = async () => {
    setLoadingData(true);
    setErrorMessage('');
    try {
      const [resBidang, resBarang, resTahun, resSatuan, resKondisi] = await Promise.all([
        supabase.from('bidang').select(`
          id_bidang,
          nama_bidang,
          barcode,
          user:user_id ( username )
        `),
        supabase.from('barang').select('*'),
        supabase.from('tahun').select('*'),
        supabase.from('satuan').select('*'),
        supabase.from('kondisi').select('*'),
      ]);

      if (resBidang.data) {
        setListBidang(
          resBidang.data.map((i: any) => ({
            id: i.id_bidang || i.id,
            nama: `${i.nama_bidang || i.bidang}${i.user?.username ? ` (PJ: ${i.user.username})` : ''}`,
          }))
        );
      }
      if (resBarang.data) {
        setListBarangMaster(resBarang.data.map((i: any) => ({ id: i.id || i.id_barang, nama: i.nama_barang || i.barang })));
      }
      if (resTahun.data) {
        setListTahun(resTahun.data.map((i: any) => ({ id: i.id || i.id_tahun, nama: String(i.tahun || i.nama_tahun) })));
      }
      if (resSatuan.data) {
        setListSatuan(resSatuan.data.map((i: any) => ({ id: i.id || i.id_satuan, nama: i.satuan || i.satuan })));
      }
      if (resKondisi.data) {
        setListKondisi(resKondisi.data.map((i: any) => ({ id: i.id || i.id_kondisi, nama: i.kondisi || i.nama_kondisi })));
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      let activeBidangId: string | null = null;

      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*, bidang:bidang_id ( id, nama_bidang )')
          .or(`id.eq.${authUser.id},username.eq.${authUser.email?.split('@')[0]}`)
          .maybeSingle();

        if (userData?.bidang_id) {
          activeBidangId = userData.bidang_id;
        }
      }

      if (!activeBidangId) {
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('*, bidang:bidang_id ( id, nama_bidang )')
          .not('bidang_id', 'is', 'null')
          .limit(1)
          .maybeSingle();

        if (fallbackUser?.bidang_id) {
          activeBidangId = fallbackUser.bidang_id;
        }
      }

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
          merk,
          evidence_url,
          created_at,
          bidang_id,
          barang_id,
          tahun_id,
          satuan_id,
          kondisi_id,
          bidang:bidang_id ( 
            nama_bidang,
            barcode,
            user:user_id ( username )
          ),
          barang:barang_id ( nama_barang ),
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
      console.error('Fetch Data Error:', err);
      setErrorMessage(`Gagal memuat data: ${err.message}`);
    } fontally: {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Search Multi-Kategori
  const filteredBarang = useMemo(() => {
    if (!searchQuery.trim()) return listDataBarang;
    const q = searchQuery.toLowerCase();

    return listDataBarang.filter((item) => {
      const namaBarang = item.barang?.nama_barang?.toLowerCase() || '';
      const kode = item.kode_barang?.toLowerCase() || '';
      const nibarVal = item.nibar?.toLowerCase() || '';
      const noReg = item.nomor_register?.toLowerCase() || '';
      const merkVal = item.merk?.toLowerCase() || '';
      const bidang = item.bidang?.nama_bidang?.toLowerCase() || '';
      const satuan = item.satuan?.satuan?.toLowerCase() || '';
      const kondisi = (item.kondisi?.kondisi || item.kondisi?.nama_kondisi || '').toLowerCase();
      const spec = item.spesifikasi?.toLowerCase() || '';
      const ket = item.keterangan?.toLowerCase() || '';

      return (
        namaBarang.includes(q) ||
        kode.includes(q) ||
        nibarVal.includes(q) ||
        noReg.includes(q) ||
        merkVal.includes(q) ||
        bidang.includes(q) ||
        satuan.includes(q) ||
        kondisi.includes(q) ||
        spec.includes(q) ||
        ket.includes(q)
      );
    });
  }, [listDataBarang, searchQuery]);

  // Set Data saat Tombol Edit Ditekan
  const handleEdit = (item: DataBarangItem) => {
    setEditingId(item.id);
    setEvidenceUrl(item.evidence_url || null);
    setNibar(item.nibar || '');
    setNomorRegister(item.nomor_register || '');
    setKodeBarang(item.kode_barang || '');
    setSpesifikasi(item.spesifikasi || '');
    setJumlah(item.jumlah || 1);
    setKeterangan(item.keterangan || '');
    setMerkInput(item.merk || '');

    setSelectedBidang(item.bidang_id || '');
    setSelectedBarangMaster(item.barang_id || '');
    setSelectedTahun(item.tahun_id || '');
    setSelectedSatuan(item.satuan_id || '');
    setSelectedKondisi(item.kondisi_id || '');

    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Handle Form Submit dengan Upload Evidence & Validasi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (
      !kodeBarang.trim() ||
      !nibar.trim() ||
      !nomorRegister.trim() ||
      !selectedBarangMaster ||
      !selectedBidang ||
      !merkInput.trim() ||
      !selectedSatuan ||
      !selectedTahun ||
      !selectedKondisi ||
      !spesifikasi.trim() ||
      !keterangan.trim() ||
      jumlah <= 0
    ) {
      setErrorMessage('Semua field form Wajib Diisi! Harap periksa kembali inputan Anda.');
      return;
    }

    setSubmitting(true);

    try {
      let uploadedEvidenceUrl = evidenceUrl;

      // Upload file ke Supabase Storage hanya jika mode Insert & ada file
      if (!editingId && evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `barang/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidence_barang')
          .upload(filePath, evidenceFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('evidence_barang')
          .getPublicUrl(filePath);

        uploadedEvidenceUrl = urlData.publicUrl;
      }

      const payload: any = {
        nibar: nibar.trim(),
        nomor_register: nomorRegister.trim(),
        kode_barang: kodeBarang.trim(),
        spesifikasi: spesifikasi.trim(),
        jumlah: Number(jumlah),
        keterangan: keterangan.trim(),
        merk: merkInput.trim(),
        bidang_id: selectedBidang,
        barang_id: selectedBarangMaster,
        tahun_id: selectedTahun,
        satuan_id: selectedSatuan,
        kondisi_id: selectedKondisi,
      };

      if (!editingId) {
        payload.evidence_url = uploadedEvidenceUrl;
      }

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
      await fetchData();
    } catch (err: any) {
      console.error('Submit Error:', err);
      setErrorMessage(`Gagal menyimpan data: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Data
  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data barang ini?')) return;

    try {
      const { error } = await supabase.from('data_barang').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
              Input & Kelola Data Barang
            </h1>
            <p className="text-xs text-gray-500">
              Sistem Pencatatan Inventaris Barang
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="w-full sm:w-auto text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-sm"
            >
              📄 Ekspor Report KIR
            </button>

            <button
              onClick={() => router.push('/admin')}
              className="w-full sm:w-auto text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition border border-gray-300 font-medium text-center"
            >
              &larr; Kembali ke Dashboard
            </button>
          </div>
        </div>

        {/* Global Error Message */}
        {errorMessage && !isModalOpen && (
          <div className="bg-red-50 text-red-700 p-3 sm:p-4 rounded-xl text-xs sm:text-sm border border-red-200 font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Action & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              🔍
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama, kode, NIBAR, merk, bidang, dll..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>+</span> Tambah Barang Baru
          </button>
        </div>

        {/* Tabel Data Barang */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm sm:text-md font-bold text-gray-800">
              Daftar Inventaris ({filteredBarang.length})
            </h2>
          </div>

          {loadingData ? (
            <div className="py-8 text-center text-xs sm:text-sm text-gray-500">Memuat data barang...</div>
          ) : filteredBarang.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-gray-500">
              {searchQuery ? 'Tidak ada barang yang cocok dengan pencarian.' : 'Belum ada data barang terdaftar.'}
            </div>
          ) : (
            <>
              {/* Tampilan Desktop & Tablet */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <th className="p-3 font-semibold">No</th>
                      <th className="p-3 font-semibold">Nama / Jenis Barang</th>
                      <th className="p-3 font-semibold">Kode / NIBAR</th>
                      <th className="p-3 font-semibold">Merk</th>
                      <th className="p-3 font-semibold">Kondisi</th>
                      <th className="p-3 font-semibold">Jumlah</th>
                      <th className="p-3 font-semibold">Bidang (PJ)</th>
                      <th className="p-3 font-semibold">Tahun</th>
                      <th className="p-3 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBarang.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50 text-gray-800">
                        <td className="p-3 font-medium text-gray-500">{index + 1}</td>
                        <td className="p-3 font-semibold text-gray-900">
                          {item.barang?.nama_barang || '-'}
                        </td>
                        <td className="p-3 text-gray-700">
                          <div>Kode: {item.kode_barang || '-'}</div>
                          <div className="text-[10px] text-gray-500">Nibar: {item.nibar || '-'}</div>
                        </td>
                        <td className="p-3 text-gray-700">{item.merk || '-'}</td>
                        <td className="p-3 text-gray-700 font-medium">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px]">
                            {item.kondisi?.kondisi || item.kondisi?.nama_kondisi || '-'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-blue-600">
                          {item.jumlah} {item.satuan?.satuan || ''}
                        </td>
                        <td className="p-3 text-gray-700">
                          <div>{item.bidang?.nama_bidang || '-'}</div>
                          {item.bidang?.user?.username && (
                            <div className="text-[10px] text-gray-500">PJ: {item.bidang.user.username}</div>
                          )}
                        </td>
                        <td className="p-3 text-gray-700">{item.tahun?.tahun || '-'}</td>
                        <td className="p-3 text-center space-x-1">
                          {/* Tombol Lihat Evidence */}
                          {item.evidence_url ? (
                            <a
                              href={item.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-medium px-2.5 py-1 rounded transition border border-emerald-200 inline-block"
                            >
                              Lihat
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic px-1">No File</span>
                          )}
                          <button
                            onClick={() => handleEdit(item)}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-medium px-2.5 py-1 rounded transition border border-amber-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-medium px-2.5 py-1 rounded transition border border-red-200"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tampilan Mobile */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredBarang.map((item, index) => (
                  <div key={item.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                    <div className="flex justify-between items-start border-b pb-2">
                      <div>
                        <span className="text-[10px] font-semibold text-gray-400 mr-2">#{index + 1}</span>
                        <h3 className="text-sm font-bold text-gray-900 inline-block">
                          {item.barang?.nama_barang || 'Tanpa Nama'}
                        </h3>
                        <p className="text-[11px] text-gray-500">Kode: {item.kode_barang || '-'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                        {item.jumlah} {item.satuan?.satuan || ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 pt-1">
                      <div><span className="text-gray-400">NIBAR:</span> {item.nibar || '-'}</div>
                      <div><span className="text-gray-400">Merk:</span> {item.merk || '-'}</div>
                      <div><span className="text-gray-400">Bidang:</span> {item.bidang?.nama_bidang || '-'}</div>
                      <div><span className="text-gray-400">Kondisi:</span> {item.kondisi?.kondisi || '-'}</div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                      {item.evidence_url ? (
                        <a
                          href={item.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded transition border border-emerald-200 text-center flex items-center"
                        >
                          Lihat
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic self-center px-2">No File</span>
                      )}
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold py-1.5 rounded transition border border-amber-200 text-center"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold py-1.5 rounded transition border border-red-200 text-center"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* POP-UP MODAL FORM INPUT & EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                {editingId ? 'Edit Data Barang' : 'Tambah Barang Baru'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {errorMessage && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-200">
                  ⚠️ {errorMessage}
                </div>
              )}

              <form id="barangForm" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

                {/* Kode Barang */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kode Barang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={kodeBarang}
                    onChange={(e) => setKodeBarang(e.target.value)}
                    placeholder="Contoh: 1.3.2.01.002"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* NIBAR */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    NIBAR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nibar}
                    onChange={(e) => setNibar(e.target.value)}
                    placeholder="Nomor Induk Barang"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Nomor Register */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nomor Register <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nomorRegister}
                    onChange={(e) => setNomorRegister(e.target.value)}
                    placeholder="Contoh: 0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Jenis Barang Master */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Jenis Barang <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBarangMaster}
                    onChange={(e) => setSelectedBarangMaster(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">-- Pilih Jenis --</option>
                    {listBarangMaster.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Bidang */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Bidang / Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBidang}
                    onChange={(e) => setSelectedBidang(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">-- Pilih Bidang --</option>
                    {listBidang.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Merk */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Merk / Brand <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={merkInput}
                    onChange={(e) => setMerkInput(e.target.value)}
                    placeholder="Contoh: Asus, Toshiba, Honda..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Jumlah */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Jumlah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>

                {/* Satuan */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSatuan}
                    onChange={(e) => setSelectedSatuan(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">-- Pilih Satuan --</option>
                    {listSatuan.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Tahun Perolehan */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tahun Perolehan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTahun}
                    onChange={(e) => setSelectedTahun(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">-- Pilih Tahun --</option>
                    {listTahun.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Kondisi Barang */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kondisi Barang <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedKondisi}
                    onChange={(e) => setSelectedKondisi(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">-- Pilih Kondisi --</option>
                    {listKondisi.map((i) => (
                      <option key={i.id} value={i.id}>{i.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Spesifikasi */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Spesifikasi Detail <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={spesifikasi}
                    onChange={(e) => setSpesifikasi(e.target.value)}
                    placeholder="Spesifikasi teknis, tipe, warna, atau ukuran..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Keterangan */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Keterangan Tambahan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Nama pengguna, Kondisi barang, lokasi penyimpanan, dll..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Form Input File Evidence */}
                <div className="sm:col-span-2 md:col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Upload Evidence (Gambar, PDF, Word)
                  </label>
                  
                  {editingId && evidenceUrl ? (
                    <div className="flex items-center justify-between p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-600">
                      <span>🔒 Evidence sudah diunggah dan tidak dapat diubah.</span>
                      <a
                        href={evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-semibold underline hover:text-blue-800"
                      >
                        Lihat Evidence
                      </a>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      capture="environment"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEvidenceFile(e.target.files[0]);
                        }
                      }}
                      className="border border-gray-300 p-2 text-xs rounded-lg bg-white w-full"
                    />
                  )}
                </div>

              </form>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg text-xs sm:text-sm transition"
              >
                Batal
              </button>
              <button
                type="submit"
                form="barangForm"
                disabled={submitting}
                className={`${
                  editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-semibold px-6 py-2 rounded-lg text-xs sm:text-sm transition disabled:opacity-50`}
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Data' : 'Simpan Data'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Render Modal KIR */}
      <ExportKirModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}