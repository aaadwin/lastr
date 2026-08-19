'use client';

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

// 1. Tipe Data untuk Objek Master Item
interface MasterItem {
  id?: string;
  id_barang?: string;
  id_bidang?: string;
  id_merk?: string;
  id_satuan?: string;
  id_tahun?: string;
  nama_barang?: string;
  kondisi?: string;
  nama_bidang?: string;
  merk?: string;
  satuan?: string;
  tahun?: number;
  created_at?: string;
  [key: string]: any;
}

// 2. Type Key Tabel Master (Bidang ditempatkan pertama kali)
type MasterTabKey = 'bidang' | 'barang' | 'kondisi' | 'merk' | 'satuan' | 'tahun';

interface TabConfig {
  label: string;
  pk: string;
  fieldLabel: string;
  fieldName: string;
  fieldType: 'text' | 'number';
}

// 3. Konfigurasi Objek Master (Urutan: Bidang -> Barang -> Kondisi -> Merk -> Satuan -> Tahun)
const MASTER_CONFIG: Record<MasterTabKey, TabConfig> = {
  bidang: {
    label: 'Bidang',
    pk: 'id_bidang',
    fieldLabel: 'Nama Bidang',
    fieldName: 'nama_bidang',
    fieldType: 'text',
  },
  barang: {
    label: 'Jenis Barang',
    pk: 'id_barang',
    fieldLabel: 'Nama Barang',
    fieldName: 'nama_barang',
    fieldType: 'text',
  },
  kondisi: {
    label: 'Kondisi',
    pk: 'id',
    fieldLabel: 'Kondisi Barang',
    fieldName: 'kondisi',
    fieldType: 'text',
  },
  merk: {
    label: 'Merk',
    pk: 'id_merk',
    fieldLabel: 'Nama Merk',
    fieldName: 'merk',
    fieldType: 'text',
  },
  satuan: {
    label: 'Satuan',
    pk: 'id_satuan',
    fieldLabel: 'Nama Satuan',
    fieldName: 'satuan',
    fieldType: 'text',
  },
  tahun: {
    label: 'Tahun',
    pk: 'id_tahun',
    fieldLabel: 'Tahun',
    fieldName: 'tahun',
    fieldType: 'number',
  },
};

export default function MasterDataPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<MasterTabKey>('bidang');
  const [dataList, setDataList] = useState<MasterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [formValue, setFormValue] = useState<string>('');

  const currentConfig = MASTER_CONFIG[activeTab];

  // Reset Modal Form
  const resetForm = () => {
    setEditingItem(null);
    setFormValue('');
    setErrorMessage('');
    setIsModalOpen(false);
  };

  // Fetch Data berdasarkan Tab Aktif
  const fetchData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase
        .from(activeTab)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDataList((data as MasterItem[]) || []);
    } catch (err: any) {
      console.error('Fetch Master Error:', err);
      setErrorMessage(`Gagal mengambil data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchQuery('');
    fetchData();
  }, [activeTab]);

  // Filter Data berdasarkan Search Query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return dataList;
    const q = searchQuery.toLowerCase();
    return dataList.filter((item) => {
      const val = String(item[currentConfig.fieldName] ?? '').toLowerCase();
      return val.includes(q);
    });
  }, [dataList, searchQuery, currentConfig.fieldName]);

  // Open Modal (Tambah / Edit)
  const handleOpenModal = (item: MasterItem | null = null) => {
    setEditingItem(item);
    setErrorMessage('');
    if (item) {
      setFormValue(String(item[currentConfig.fieldName] ?? ''));
    } else {
      setFormValue('');
    }
    setIsModalOpen(true);
  };

  // Simpan Data (Insert / Update)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formValue.trim()) {
      setErrorMessage(`${currentConfig.fieldLabel} wajib diisi!`);
      return;
    }

    setLoading(true);

    const payload: Record<string, any> = {
      [currentConfig.fieldName]:
        currentConfig.fieldType === 'number'
          ? parseInt(formValue, 10)
          : formValue.trim(),
    };

    try {
      if (editingItem) {
        // UPDATE
        const pkValue = editingItem[currentConfig.pk];
        const { error } = await supabase
          .from(activeTab)
          .update(payload)
          .eq(currentConfig.pk, pkValue);

        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase.from(activeTab).insert([payload]);
        if (error) throw error;
      }

      resetForm();
      await fetchData();
    } catch (err: any) {
      Swal.fire({
    icon: 'error',
    title: 'Gagal Menambah data',
    text: err.message || 'Terjadi kesalahan pada server.',
    confirmButtonColor: '#d33',
    confirmButtonText: 'Tutup'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: MasterItem) => {
  const id = item[currentConfig.pk];
  const itemLabel = item[currentConfig.fieldName] || 'data ini';

  setDeletingId(id);
  setErrorMessage('');

  try {
    // 1. Validasi khusus jika tab yang sedang aktif adalah 'bidang'
    if (activeTab === 'bidang') {
      // Cek apakah ada data di tabel 'barang' yang terikat dengan id_bidang ini
      const { count, error: checkError } = await supabase
        .from('data_barang') // Sesuaikan dengan nama tabel barang Anda jika berbeda
        .select('*', { count: 'exact', head: true })
        .eq('bidang_id', id);

      if (checkError) throw checkError;

      if (count && count > 0) {
  Swal.fire({
    icon: 'warning', // pakai 'warning' agar pas untuk peringatan relasi data
    title: 'Tidak Bisa Dihapus!',
    html: `
      Bidang <b>"${itemLabel}"</b> tidak dapat dihapus.<br/><br/>
      Masih terdapat <b>${count} barang</b> yang terikat dengan bidang ini. Silakan hapus atau pindahkan barang-barang tersebut ke bidang lain terlebih dahulu.
    `,
    confirmButtonText: 'Saya Mengerti',
    confirmButtonColor: '#3085d6',
  });
  return;
}
    }

    // 2. Konfirmasi penghapusan (dijalankan setelah validasi relasi lolos)
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${itemLabel}"?`)) {
      return;
    }

    // 3. Proses Delete ke database Supabase
    const { error } = await supabase
      .from(activeTab)
      .delete()
      .eq(currentConfig.pk, id);

    if (error) throw error;

    await fetchData();
  } catch (err: any) {
    console.error('Delete Master Error:', err);
    setErrorMessage(`Gagal menghapus data: ${err.message}`);
  } finally {
    setDeletingId(null);
  }
};

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar dengan Tombol Back */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
              Kelola Master Data
            </h1>
            <p className="text-xs text-gray-500">
              Manajemen Referensi & Master Data Sistem
            </p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="w-full sm:w-auto text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition border border-gray-300 font-medium text-center"
          >
            &larr; Kembali ke Dashboard
          </button>
        </div>

        {/* Navigation Tabs (Scrollable Horizontal di Mobile) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 min-w-max">
            {(Object.keys(MASTER_CONFIG) as MasterTabKey[]).map((tabKey) => {
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {MASTER_CONFIG[tabKey].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && !isModalOpen && (
          <div className="bg-red-50 text-red-700 p-3 sm:p-4 rounded-xl text-xs sm:text-sm border border-red-200 font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Search & Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              🔍
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari ${currentConfig.fieldLabel.toLowerCase()}...`}
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

          {/* Button Tambah Data */}
          <button
            onClick={() => handleOpenModal(null)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>+</span> Tambah {currentConfig.label}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm sm:text-md font-bold text-gray-800">
              Daftar {currentConfig.label} ({filteredData.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs sm:text-sm text-gray-500">
              Memuat data {currentConfig.label.toLowerCase()}...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-gray-500">
              {searchQuery
                ? 'Tidak ada data yang cocok dengan pencarian.'
                : `Belum ada data ${currentConfig.label.toLowerCase()}.`}
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <th className="p-3 font-semibold w-16">No</th>
                      <th className="p-3 font-semibold">
                        {currentConfig.fieldLabel}
                      </th>
                      <th className="p-3 font-semibold">Tanggal Dibuat</th>
                      <th className="p-3 font-semibold text-center w-36">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredData.map((item, index) => {
                      const id = item[currentConfig.pk];
                      const val = item[currentConfig.fieldName];

                      return (
                        <tr
                          key={id || index}
                          className="hover:bg-gray-50 text-gray-800"
                        >
                          <td className="p-3 font-medium text-gray-500">
                            {index + 1}
                          </td>
                          <td className="p-3 font-semibold text-gray-900">
                            {val ?? '-'}
                          </td>
                          <td className="p-3 text-gray-600">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString('id-ID', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : '-'}
                          </td>
                          <td className="p-3 text-center space-x-1">
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-medium px-2.5 py-1 rounded transition border border-amber-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === id}
                              className="bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-medium px-2.5 py-1 rounded transition border border-red-200 disabled:opacity-50"
                            >
                              {deletingId === id ? '...' : 'Hapus'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredData.map((item, index) => {
                  const id = item[currentConfig.pk];
                  const val = item[currentConfig.fieldName];

                  return (
                    <div
                      key={id || index}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2"
                    >
                      <div className="flex justify-between items-start border-b pb-2">
                        <div>
                          <span className="text-[10px] font-semibold text-gray-400 mr-2">
                            #{index + 1}
                          </span>
                          <h3 className="text-sm font-bold text-gray-900 inline-block">
                            {val ?? '-'}
                          </h3>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-500 pt-1">
                        <span>Dibuat: </span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                            })
                          : '-'}
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold py-1.5 rounded transition border border-amber-200 text-center"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === id}
                          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold py-1.5 rounded transition border border-red-200 text-center disabled:opacity-50"
                        >
                          {deletingId === id ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* POP-UP MODAL FORM (TAMBAH / EDIT MASTER) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                {editingItem ? 'Edit' : 'Tambah'} {currentConfig.label}
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

              <form id="masterForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentConfig.fieldLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={currentConfig.fieldType}
                    required
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder={`Masukkan ${currentConfig.fieldLabel.toLowerCase()}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
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
                form="masterForm"
                disabled={loading}
                className={`${
                  editingItem ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-semibold px-6 py-2 rounded-lg text-xs sm:text-sm transition disabled:opacity-50`}
              >
                {loading ? 'Menyimpan...' : editingItem ? 'Perbarui Data' : 'Simpan Data'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}