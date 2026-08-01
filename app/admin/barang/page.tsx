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
  created_at: string;
  bidang_id?: string | null;
  barang_id?: string | null;
  merk_id?: string | null;
  tahun_id?: string | null;
  satuan_id?: string | null;
  kondisi_id?: string | null;
  bidang?: { 
    nama_bidang: string;
    barcode?: string | null;
    user?: { username: string } | null;
  } | null;
  barang?: { nama_barang: string } | null;
  merk?: { merk: string } | null;
  tahun?: { tahun: string | number } | null;
  satuan?: { satuan: string } | null;
  kondisi?: { kondisi: string; nama_kondisi?: string } | null;
}

export default function KelolaBarangPage() {
  const router = useRouter();
  const supabase = createClient();

  // State List Options
  const [listBidang, setListBidang] = useState<MasterOption[]>([]);
  const [listBarangMaster, setListBarangMaster] = useState<MasterOption[]>([]);
  const [listMerk, setListMerk] = useState<MasterOption[]>([]);
  const [listTahun, setListTahun] = useState<MasterOption[]>([]);
  const [listSatuan, setListSatuan] = useState<MasterOption[]>([]);
  const [listKondisi, setListKondisi] = useState<MasterOption[]>([]);

  // State Main Data
  const [listDataBarang, setListDataBarang] = useState<DataBarangItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // State Edit Mode
  const [editingId, setEditingId] = useState<string | null>(null);

  // State Form Input
  const [nibar, setNibar] = useState('');
  const [nomorRegister, setNomorRegister] = useState('');
  const [kodeBarang, setKodeBarang] = useState('');
  const [spesifikasi, setSpesifikasi] = useState('');
  const [jumlah, setJumlah] = useState<number>(1);
  const [keterangan, setKeterangan] = useState('');

  const [selectedBidang, setSelectedBidang] = useState('');
  const [selectedBarangMaster, setSelectedBarangMaster] = useState('');
  const [selectedMerk, setSelectedMerk] = useState('');
  const [selectedTahun, setSelectedTahun] = useState('');
  const [selectedSatuan, setSelectedSatuan] = useState('');
  const [selectedKondisi, setSelectedKondisi] = useState('');

  // Reset Form Input
  const resetForm = () => {
    setEditingId(null);
    setNibar('');
    setNomorRegister('');
    setKodeBarang('');
    setSpesifikasi('');
    setJumlah(1);
    setKeterangan('');
    setSelectedBidang('');
    setSelectedBarangMaster('');
    setSelectedMerk('');
    setSelectedTahun('');
    setSelectedSatuan('');
    setSelectedKondisi('');
  };

  // Fetch Master Options & Data Barang
  const fetchData = async () => {
    setLoadingData(true);
    setErrorMessage('');
    try {
      // 1. Ambil Opsi Dropdown Master
      const [resBidang, resBarang, resMerk, resTahun, resSatuan, resKondisi] = await Promise.all([
        supabase.from('bidang').select(`
          id_bidang,
          nama_bidang,
          barcode,
          user:user_id ( username )
        `),
        supabase.from('barang').select('*'),
        supabase.from('merk').select('*'),
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
      if (resMerk.data) {
        setListMerk(resMerk.data.map((i: any) => ({ id: i.id || i.id_merk, nama: i.merk || i.merk })));
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

      // 2. Fallback User / Bidang Check (Memperbaiki error 400 .not syntax)
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

      // Fallback jika tidak terdeteksi via Auth (Sintaks .not() yang diperbaiki)
      if (!activeBidangId) {
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('*, bidang:bidang_id ( id, nama_bidang )')
          .not('bidang_id', 'is', 'null') // Perbaikan: menggunakan string 'null'
          .limit(1)
          .maybeSingle();

        if (fallbackUser?.bidang_id) {
          activeBidangId = fallbackUser.bidang_id;
        }
      }

      // 3. Query Data Barang beserta Relasi (JOIN)
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
          bidang_id,
          barang_id,
          merk_id,
          tahun_id,
          satuan_id,
          kondisi_id,
          bidang:bidang_id ( 
            nama_bidang,
            barcode,
            user:user_id ( username )
          ),
          barang:barang_id ( nama_barang ),
          merk:merk_id ( merk ),
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
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set Data saat Tombol Edit Ditekan
  const handleEdit = (item: DataBarangItem) => {
    setEditingId(item.id);
    setNibar(item.nibar || '');
    setNomorRegister(item.nomor_register || '');
    setKodeBarang(item.kode_barang || '');
    setSpesifikasi(item.spesifikasi || '');
    setJumlah(item.jumlah || 1);
    setKeterangan(item.keterangan || '');

    setSelectedBidang(item.bidang_id || '');
    setSelectedBarangMaster(item.barang_id || '');
    setSelectedMerk(item.merk_id || '');
    setSelectedTahun(item.tahun_id || '');
    setSelectedSatuan(item.satuan_id || '');
    setSelectedKondisi(item.kondisi_id || '');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Form Submit (Tambah & Update)
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
        bidang_id: selectedBidang || null,
        barang_id: selectedBarangMaster || null,
        merk_id: selectedMerk || null,
        tahun_id: selectedTahun || null,
        satuan_id: selectedSatuan || null,
        kondisi_id: selectedKondisi || null,
      };

      if (editingId) {
        // Mode Update
        const { error } = await supabase
          .from('data_barang')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Mode Insert Baru
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
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Input & Kelola Data Barang</h1>
            <p className="text-xs text-gray-500">Sistem Pencatatan Inventaris Barang</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition border border-gray-300 font-medium"
          >
            &larr; Kembali ke Dashboard
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-3 rounded text-sm break-words border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Form Input / Edit Barang */}
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
            
            {/* Nama Barang Master */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pilih Jenis Barang</label>
              <select
                value={selectedBarangMaster}
                onChange={(e) => setSelectedBarangMaster(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="" className="text-gray-500">-- Pilih Jenis Barang --</option>
                {listBarangMaster.map((i) => (
                  <option key={i.id} value={i.id} className="text-gray-900">{i.nama}</option>
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
                placeholder="Contoh: 1.3.2.01.002"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* NIBAR */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">NIBAR</label>
              <input
                type="text"
                value={nibar}
                onChange={(e) => setNibar(e.target.value)}
                placeholder="Nomor Induk Barang"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Nomor Register */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Register</label>
              <input
                type="text"
                value={nomorRegister}
                onChange={(e) => setNomorRegister(e.target.value)}
                placeholder="Contoh: 0001"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Bidang */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bidang / Unit</label>
              <select
                value={selectedBidang}
                onChange={(e) => setSelectedBidang(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="" className="text-gray-500">-- Pilih Bidang --</option>
                {listBidang.map((i) => (
                  <option key={i.id} value={i.id} className="text-gray-900">{i.nama}</option>
                ))}
              </select>
            </div>

            {/* Merk */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Merk / Brand</label>
              <select
                value={selectedMerk}
                onChange={(e) => setSelectedMerk(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="" className="text-gray-500">-- Pilih Merk --</option>
                {listMerk.map((i) => (
                  <option key={i.id} value={i.id} className="text-gray-900">{i.nama}</option>
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
                <option value="" className="text-gray-500">-- Pilih Satuan --</option>
                {listSatuan.map((i) => (
                  <option key={i.id} value={i.id} className="text-gray-900">{i.nama}</option>
                ))}
              </select>
            </div>

            {/* Tahun Perolehan */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tahun Perolehan</label>
              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="" className="text-gray-500">-- Pilih Tahun --</option>
                {listTahun.map((i) => (
                  <option key={i.id} value={i.id} className="text-gray-900">{i.nama}</option>
                ))}
              </select>
            </div>

            {/* Kondisi Barang */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kondisi Barang</label>
              <select
                value={selectedKondisi}
                onChange={(e) => setSelectedKondisi(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="" className="text-gray-500">-- Pilih Kondisi --</option>
                {listKondisi.map((i) => (
                  <option key={i.id} value={i.id} className="text-gray-900">{i.nama}</option>
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
                placeholder="Spesifikasi teknis, tipe, warna, atau ukuran..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Keterangan */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan Tambahan</label>
              <textarea
                rows={2}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Kondisi barang, lokasi penyimpanan, dll..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-3 flex justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded text-sm transition"
                >
                  Batal Edit
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className={`${
                  editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium px-6 py-2 rounded text-sm transition disabled:opacity-50`}
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Data Barang' : 'Simpan Data Barang'}
              </button>
            </div>
          </form>
        </div>

        {/* Tabel Data Barang */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-md font-semibold text-gray-800 mb-4">Daftar Data Barang Inventaris</h2>

          {loadingData ? (
            <p className="text-sm text-gray-500 py-4 text-center">Memuat data barang...</p>
          ) : listDataBarang.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Belum ada data barang terdaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                    <th className="p-2 font-semibold">No</th>
                    <th className="p-2 font-semibold">Nama / Jenis Barang</th>
                    <th className="p-2 font-semibold">Kode / NIBAR</th>
                    <th className="p-2 font-semibold">Merk</th>
                    <th className="p-2 font-semibold">Kondisi</th>
                    <th className="p-2 font-semibold">Jumlah</th>
                    <th className="p-2 font-semibold">Bidang (PJ)</th>
                    <th className="p-2 font-semibold">Tahun</th>
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
                      </td>
                      <td className="p-2 text-gray-700">{item.merk?.merk || '-'}</td>
                      <td className="p-2 text-gray-700 font-medium">
                        {item.kondisi?.kondisi || item.kondisi?.nama_kondisi || '-'}
                      </td>
                      <td className="p-2 font-bold text-blue-600">
                        {item.jumlah} {item.satuan?.satuan || ''}
                      </td>
                      <td className="p-2 text-gray-700">
                        <div>{item.bidang?.nama_bidang || '-'}</div>
                        {item.bidang?.user?.username && (
                          <div className="text-[10px] text-gray-500">PJ: {item.bidang.user.username}</div>
                        )}
                      </td>
                      <td className="p-2 text-gray-700">{item.tahun?.tahun || '-'}</td>
                      <td className="p-2 text-center space-x-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-medium px-2 py-1 rounded transition border border-amber-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-medium px-2 py-1 rounded transition border border-red-200"
                        >
                          Hapus
                        </button>
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