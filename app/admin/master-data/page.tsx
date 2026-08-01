'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

// 1. Tipe Data untuk Objek Master Item (Generic)
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
  barcode?: string;
  created_at?: string;
  [key: string]: any;
}

// 2. Type Key Tabel Master yang Valid
type MasterTabKey = 'barang' | 'kondisi' | 'merk' | 'satuan' | 'tahun' | 'bidang';

interface TabConfig {
  label: string;
  pk: string;
  fieldLabel: string;
  fieldName: string;
  fieldType: 'text' | 'number';
  hasExtra?: boolean;
}

// 3. Konfigurasi Objek Master
const MASTER_CONFIG: Record<MasterTabKey, TabConfig> = {
  barang: {
    label: 'Data Barang',
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
  bidang: {
    label: 'Bidang',
    pk: 'id_bidang',
    fieldLabel: 'Nama Bidang',
    fieldName: 'nama_bidang',
    fieldType: 'text',
    hasExtra: true,
  },
};

export default function MasterDataPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<MasterTabKey>('barang');
  const [dataList, setDataList] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [formData, setFormData] = useState<{ value: string; barcode: string }>({
    value: '',
    barcode: '',
  });

  const currentConfig = MASTER_CONFIG[activeTab];

  // Fetch Data berdasarkan Tab Aktif
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(activeTab)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      alert('Gagal mengambil data: ' + error.message);
    } else {
      setDataList((data as MasterItem[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Open Modal (Tambah Data / Edit Data)
  const handleOpenModal = (item: MasterItem | null = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({
        value: String(item[currentConfig.fieldName] ?? ''),
        barcode: item.barcode || '',
      });
    } else {
      setFormData({ value: '', barcode: '' });
    }
    setIsModalOpen(true);
  };

  // Simpan Data (Insert / Update)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: Record<string, any> = {
      [currentConfig.fieldName]:
        currentConfig.fieldType === 'number'
          ? parseInt(formData.value, 10)
          : formData.value,
    };

    if (activeTab === 'bidang') {
      payload.barcode = formData.barcode || null;
    }

    let error = null;

    if (editingItem) {
      // UPDATE
      const pkValue = editingItem[currentConfig.pk];
      const { error: err } = await supabase
        .from(activeTab)
        .update(payload)
        .eq(currentConfig.pk, pkValue);
      error = err;
    } else {
      // INSERT
      const { error: err } = await supabase.from(activeTab).insert([payload]);
      error = err;
    }

    if (error) {
      alert('Gagal menyimpan data: ' + error.message);
    } else {
      setIsModalOpen(false);
      fetchData();
    }
    setLoading(false);
  };

  // Hapus Data (Delete)
  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    setLoading(true);
    const { error } = await supabase
      .from(activeTab)
      .delete()
      .eq(currentConfig.pk, id);

    if (error) {
      alert('Gagal menghapus data: ' + error.message);
    } else {
      fetchData();
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        padding: '24px',
        fontFamily: 'sans-serif',
        backgroundColor: '#ffffff',
        color: '#000000',
        minHeight: '100vh',
      }}
    >
      <h2 style={{ color: '#000000' }}>Kelola Master Data</h2>
      <p style={{ color: '#333333' }}>
        Halaman khusus Administrator untuk mengelola referensi/master data sistem.
      </p>

      {/* Navigation Tab */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #2563eb',
          marginBottom: '20px',
        }}
      >
        {(Object.keys(MASTER_CONFIG) as MasterTabKey[]).map((tabKey) => {
          const isActive = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              style={{
                padding: '10px 16px',
                border: '1px solid #2563eb',
                borderBottom: 'none',
                borderRadius: '6px 6px 0 0',
                backgroundColor: isActive ? '#2563eb' : '#ffffff',
                color: isActive ? '#ffffff' : '#000000',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              {MASTER_CONFIG[tabKey].label}
            </button>
          );
        })}
      </div>

      {/* Header Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ color: '#000000', margin: 0 }}>
          Daftar {currentConfig.label}
        </h3>
        <button
          onClick={() => handleOpenModal(null)}
          style={{
            backgroundColor: '#e0e7ff',
            color: '#000000',
            border: '2px solid #2563eb',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          + Tambah {currentConfig.label}
        </button>
      </div>

      {/* Table Data */}
      {loading ? (
        <p style={{ color: '#000000' }}>Memuat data...</p>
      ) : (
        <table
          border={1}
          cellPadding="10"
          cellSpacing="0"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderColor: '#2563eb',
            backgroundColor: '#ffffff',
            color: '#000000',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#dbeafe',
                color: '#000000',
                textAlign: 'left',
              }}
            >
              <th style={{ borderColor: '#2563eb' }}>No</th>
              <th style={{ borderColor: '#2563eb' }}>
                {currentConfig.fieldLabel}
              </th>
              {activeTab === 'bidang' && (
                <th style={{ borderColor: '#2563eb' }}>Barcode</th>
              )}
              <th style={{ borderColor: '#2563eb' }}>Tanggal Dibuat</th>
              <th style={{ textAlign: 'center', borderColor: '#2563eb' }}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {dataList.length === 0 ? (
              <tr>
                <td
                  colSpan={activeTab === 'bidang' ? 5 : 4}
                  style={{
                    textAlign: 'center',
                    color: '#000000',
                    borderColor: '#2563eb',
                  }}
                >
                  Belum ada data.
                </td>
              </tr>
            ) : (
              dataList.map((item, index) => (
                <tr key={item[currentConfig.pk] || index}>
                  <td style={{ borderColor: '#2563eb', color: '#000000' }}>
                    {index + 1}
                  </td>
                  <td style={{ borderColor: '#2563eb', color: '#000000' }}>
                    {item[currentConfig.fieldName]}
                  </td>
                  {activeTab === 'bidang' && (
                    <td style={{ borderColor: '#2563eb', color: '#000000' }}>
                      {item.barcode || '-'}
                    </td>
                  )}
                  <td style={{ borderColor: '#2563eb', color: '#000000' }}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString('id-ID')
                      : '-'}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      borderColor: '#2563eb',
                    }}
                  >
                    <button
                      onClick={() => handleOpenModal(item)}
                      style={{
                        marginRight: '8px',
                        padding: '4px 12px',
                        backgroundColor: '#eff6ff',
                        color: '#000000',
                        border: '1px solid #2563eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item[currentConfig.pk])}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#ffffff',
                        color: '#dc2626',
                        border: '1px solid #dc2626',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Modal Form Add/Edit */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #2563eb',
              padding: '24px',
              borderRadius: '8px',
              width: '400px',
              color: '#000000',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#000000' }}>
              {editingItem ? 'Edit' : 'Tambah'} {currentConfig.label}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    color: '#000000',
                    fontWeight: '500',
                  }}
                >
                  {currentConfig.fieldLabel}:
                </label>
                <input
                  type={currentConfig.fieldType}
                  required
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    boxSizing: 'border-box',
                    border: '1px solid #2563eb',
                    borderRadius: '4px',
                    color: '#000000',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>

              {activeTab === 'bidang' && (
                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      color: '#000000',
                      fontWeight: '500',
                    }}
                  >
                    Barcode:
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '8px',
                      boxSizing: 'border-box',
                      border: '1px solid #2563eb',
                      borderRadius: '4px',
                      color: '#000000',
                      backgroundColor: '#ffffff',
                    }}
                    placeholder="Contoh: BDG-4D7DEE6C"
                  />
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '16px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    border: '1px solid #6b7280',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#000000',
                    border: '2px solid #2563eb',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}