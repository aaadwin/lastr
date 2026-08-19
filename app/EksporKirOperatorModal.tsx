'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ExportKirOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportKirOperatorModal({ isOpen, onClose }: ExportKirOperatorModalProps) {
  const [kodeLokasi, setKodeLokasi] = useState<string>('');
  const [kabupaten, setKabupaten] = useState<string>('KABUPATEN MUSI BANYUASIN');
  const [kuasaPengguna, setKuasaPengguna] = useState<string>('Dinas Komunikasi dan Informatika');
  const [penggunaBarang, setPenggunaBarang] = useState<string>('Dinas Komunikasi dan Informatika');

  const [reportData, setReportData] = useState<any[]>([]);
  const [userBidangName, setUserBidangName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOperatorDataAndReport();
    }
  }, [isOpen]);

  const fetchOperatorDataAndReport = async () => {
    setLoading(true);
    try {
      // 1. Dapatkan user session yang sedang login
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Pengguna tidak terautentikasi.');

      // 2. Ambil data bidang_id dari tabel users (sesuaikan jika nama tabel/kolom profil beda)
      const { data: userData, error: profileError } = await supabase
        .from('users')
        .select('bidang_id, bidang:bidang_id ( nama_bidang )')
        .eq('id', user.id)
        .single();

      if (profileError || !userData?.bidang_id) {
        throw new Error('Gagal mendapatkan bidang terikat untuk akun operator ini.');
      }

      const bidangId = userData.bidang_id;
      const namaBidang = (userData.bidang as any)?.nama_bidang || 'Bidang Operator';
      setUserBidangName(namaBidang);

      // 3. Ambil data barang khusus bidang operator tersebut
      const { data: barangData, error: barangError } = await supabase
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
          barang_id,
          merk_id,
          tahun_id,
          satuan_id,
          kondisi_id,
          master_barang:barang_id ( nama_barang ),
          merk:merk_id ( merk ),
          tahun:tahun_id ( tahun ),
          satuan:satuan_id ( satuan ),
          kondisi:kondisi_id ( kondisi )
        `)
        .eq('bidang_id', bidangId);

      if (barangError) throw barangError;

      setReportData(barangData || []);
    } catch (err: any) {
      console.error('Error fetching Operator KIR report:', err.message);
      alert('Gagal mengambil data KIR: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    if (reportData.length === 0) {
      alert('Tidak ada data untuk diunduh!');
      return;
    }

    setIsExportingPdf(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;

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

  // Base Style Sel Header
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

  // Base Style Sel Data
  const tdStyle: React.CSSProperties = {
    border: '1px solid #000000',
    padding: '5px 4px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: '9px',
    color: '#000000',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-gray-800">
        
        {/* Header Modal */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-lg text-gray-800">
              Ekspor Kartu Inventaris Ruangan (KIR) - Operator
            </h3>
            {userBidangName && (
              <p className="text-xs text-blue-600 font-semibold mt-0.5">
                Bidang / Ruangan: {userBidangName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold text-xl"
          >
            ✕
          </button>
        </div>

        {/* Form Input Informasi Surat (Tanpa Dropdown Pilih Bidang) */}
        <div className="p-4 border-b bg-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block font-semibold mb-1">Nama Kabupaten</label>
            <input
              type="text"
              className="w-full border p-2 rounded bg-white text-black"
              value={kabupaten}
              onChange={(e) => setKabupaten(e.target.value)}
              placeholder="Contoh: KABUPATEN BONE"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Kode Lokasi</label>
            <input
              type="text"
              className="w-full border p-2 rounded bg-white text-black"
              value={kodeLokasi}
              onChange={(e) => setKodeLokasi(e.target.value)}
              placeholder="Masukkan Kode Lokasi..."
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Kuasa Pengguna Barang</label>
            <input
              type="text"
              className="w-full border p-2 rounded bg-white text-black"
              value={kuasaPengguna}
              onChange={(e) => setKuasaPengguna(e.target.value)}
            />
          </div>
        </div>

        {/* PREVIEW LAPORAN */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-black">
          {loading ? (
            <div className="text-center py-12 text-gray-500 font-medium">
              Memuat data barang untuk bidang Anda...
            </div>
          ) : (
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
                    <td style={{ textTransform: 'uppercase' }}>{userBidangName}</td>
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
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ ...tdStyle, padding: '12px', fontStyle: 'italic' }}>
                        Tidak ada data barang untuk bidang Anda.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item, index) => {
                      const namaBarang = item.master_barang?.nama_barang || '-';
                      const namaMerk = item.merk?.merk || '-';
                      const tahunVal = item.tahun?.tahun || '-';
                      const satuanVal = item.satuan?.satuan || '-';
                      const kondisiVal = item.kondisi?.kondisi || '-';

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
          )}
        </div>

        {/* Footer Modal Action */}
        <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
          >
            Tutup
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={reportData.length === 0 || isExportingPdf || loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isExportingPdf ? 'Memproses PDF...' : '📄 Download PDF'}
          </button>
        </div>

      </div>
    </div>
  );
}