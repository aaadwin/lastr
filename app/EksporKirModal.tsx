'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Bidang {
  bidang_id?: string;
  id_bidang?: string;
  id?: string;
  nama_bidang: string;
}

interface Tahun {
  tahun_id?: string;
  id_tahun?: string;
  id?: string;
  tahun: string;
}

interface Kondisi {
  kondisi_id?: string;
  id_kondisi?: string;
  id?: string;
  kondisi: string;
}

interface ExportKirModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Map prioritas urutan kondisi baku BMD
const KONDISI_PRIORITY: Record<string, number> = {
  'baik': 1,
  'rusak ringan': 2,
  'rusak berat': 3,
};

export default function ExportKirModal({ isOpen, onClose }: ExportKirModalProps) {
  const [bidangList, setBidangList] = useState<Bidang[]>([]);
  const [tahunList, setTahunList] = useState<Tahun[]>([]);
  const [kondisiList, setKondisiList] = useState<Kondisi[]>([]);

  const [selectedBidangId, setSelectedBidangId] = useState<string>('');
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [selectedKondisiId, setSelectedKondisiId] = useState<string>('');
  const [sortByKondisi, setSortByKondisi] = useState<'asc' | 'desc' | 'none'>('none');
  const [kodeLokasi, setKodeLokasi] = useState<string>('');

  // Nilai tetap
  const kabupaten = 'KABUPATEN MUSI BANYUASIN';
  const kuasaPengguna = 'Dinas Komunikasi dan Informatika';
  const penggunaBarang = 'Dinas Komunikasi dan Informatika';

  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedBidangName, setSelectedBidangName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isReadyToExport, setIsReadyToExport] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
    }
  }, [isOpen]);

  const fetchMasterData = async () => {
    try {
      const [bidangRes, tahunRes, kondisiRes] = await Promise.all([
        supabase.from('bidang').select('*').order('nama_bidang', { ascending: true }),
        supabase.from('tahun').select('*').order('tahun', { ascending: false }),
        supabase.from('kondisi').select('*').order('kondisi', { ascending: true }),
      ]);

      if (bidangRes.error) throw bidangRes.error;
      if (tahunRes.error) throw tahunRes.error;
      if (kondisiRes.error) throw kondisiRes.error;

      if (bidangRes.data) setBidangList(bidangRes.data);
      if (tahunRes.data) setTahunList(tahunRes.data);
      if (kondisiRes.data) setKondisiList(kondisiRes.data);
    } catch (err: any) {
      console.error('Gagal mengambil data master:', err.message);
      alert('Gagal memuat filter data master: ' + err.message);
    }
  };

  const getItemId = (item: any): string => {
    return item.bidang_id || item.id_bidang || item.tahun_id || item.id_tahun || item.kondisi_id || item.id_kondisi || item.id || '';
  };

  const handleGenerateReport = async () => {
    if (!selectedBidangId) {
      alert('Silakan pilih Ruangan / Bidang terlebih dahulu!');
      return;
    }

    setLoading(true);
    try {
      const currentBidang = bidangList.find((b) => getItemId(b) === selectedBidangId);
      setSelectedBidangName(currentBidang ? currentBidang.nama_bidang : '');

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
          bidang_id,
          barang_id,
          merk_id,
          tahun_id,
          satuan_id,
          kondisi_id,
          merk,
          barang ( nama_barang ),
          tahun ( tahun ),
          satuan ( satuan ),
          kondisi ( kondisi )
        `)
        .eq('bidang_id', selectedBidangId);

      if (selectedTahunId) {
        query = query.eq('tahun_id', selectedTahunId);
      }

      if (selectedKondisiId) {
        query = query.eq('kondisi_id', selectedKondisiId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase Query Error:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Gagal mengambil data dari server');
      }

      let sortedData = [...(data || [])];

      sortedData.sort((a: any, b: any) => {
        if (sortByKondisi !== 'none') {
          const nameA = (a.kondisi?.kondisi || '').toLowerCase().trim();
          const nameB = (b.kondisi?.kondisi || '').toLowerCase().trim();

          const rankA = KONDISI_PRIORITY[nameA] ?? 99;
          const rankB = KONDISI_PRIORITY[nameB] ?? 99;

          if (rankA !== rankB) {
            return sortByKondisi === 'asc' ? rankA - rankB : rankB - rankA;
          }
        }

        const tahunA = parseInt(a.tahun?.tahun || '0', 10);
        const tahunB = parseInt(b.tahun?.tahun || '0', 10);
        return tahunA - tahunB;
      });

      setReportData(sortedData);
      setIsReadyToExport(true);
    } catch (err: any) {
      console.error('Error fetching KIR report:', err);
      alert('Gagal mengambil data laporan: ' + err.message);
    } fontally: {
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

      const filename = `KIR_${selectedBidangName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden text-gray-800">
        
        {/* Header Modal */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">
            Ekspor Kartu Inventaris Ruangan (KIR) ke PDF
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold text-xl"
          >
            ✕
          </button>
        </div>

        {/* Form Filter & Sortir */}
        <div className="p-4 border-b bg-gray-100 flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            
            <div className="min-w-0">
              <label className="block font-semibold mb-1 text-xs">Ruangan / Bidang *</label>
              <select
                className="w-full border p-2 rounded bg-white text-black text-xs truncate focus:ring-2 focus:ring-blue-500"
                value={selectedBidangId}
                onChange={(e) => {
                  setSelectedBidangId(e.target.value);
                  setIsReadyToExport(false);
                }}
              >
                <option value="">-- Pilih Ruangan --</option>
                {bidangList.map((b) => {
                  const id = getItemId(b);
                  return (
                    <option key={id} value={id}>
                      {b.nama_bidang}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block font-semibold mb-1 text-xs">Filter Tahun</label>
              <select
                className="w-full border p-2 rounded bg-white text-black text-xs truncate focus:ring-2 focus:ring-blue-500"
                value={selectedTahunId}
                onChange={(e) => {
                  setSelectedTahunId(e.target.value);
                  setIsReadyToExport(false);
                }}
              >
                <option value="">-- Semua Tahun --</option>
                {tahunList.map((t) => {
                  const id = getItemId(t);
                  return (
                    <option key={id} value={id}>
                      {t.tahun}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block font-semibold mb-1 text-xs">Filter Kondisi</label>
              <select
                className="w-full border p-2 rounded bg-white text-black text-xs truncate focus:ring-2 focus:ring-blue-500"
                value={selectedKondisiId}
                onChange={(e) => {
                  setSelectedKondisiId(e.target.value);
                  setIsReadyToExport(false);
                }}
              >
                <option value="">-- Semua Kondisi --</option>
                {kondisiList.map((k) => {
                  const id = getItemId(k);
                  return (
                    <option key={id} value={id}>
                      {k.kondisi}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block font-semibold mb-1 text-xs">Sortir Kondisi</label>
              <select
                className="w-full border p-2 rounded bg-white text-black text-xs truncate focus:ring-2 focus:ring-blue-500"
                value={sortByKondisi}
                onChange={(e) => {
                  setSortByKondisi(e.target.value as 'asc' | 'desc' | 'none');
                  setIsReadyToExport(false);
                }}
              >
                <option value="none">Default (Tahun)</option>
                <option value="asc">Baik → Rusak Berat</option>
                <option value="desc">Rusak Berat → Baik</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="block font-semibold mb-1 text-xs">Kode Lokasi</label>
              <input
                type="text"
                className="w-full border p-2 rounded bg-white text-black text-xs focus:ring-2 focus:ring-blue-500"
                value={kodeLokasi}
                onChange={(e) => setKodeLokasi(e.target.value)}
                placeholder="Kode Lokasi..."
              />
            </div>

          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Memuat Data...' : 'Tampilkan Preview'}
            </button>
          </div>
        </div>

        {/* PREVIEW LAPORAN */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-black">
          {isReadyToExport ? (
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
              {/* Header Surat */}
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px', textTransform: 'uppercase' }}>
                <div>PEMERINTAH {kabupaten}</div>
                <div>KARTU INVENTARIS RUANGAN (KIR)</div>
                <div>BARANG MILIK DAERAH</div>
              </div>

              {/* Rincian Lokasi */}
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
                    <td style={{ textTransform: 'uppercase' }}>{selectedBidangName}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tabel Barang */}
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
                        Tidak ada data barang untuk ruangan/kriteria ini.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item, index) => {
                      const namaBarang = item.barang?.nama_barang || '-';
                      const namaMerk = item.merk?.merk || item.merk || '-';
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
          ) : (
            <div className="text-center py-12 text-gray-400">
              Silakan pilih Ruangan / Bidang dan filter/sortir yang diinginkan, lalu klik <b>"Tampilkan Preview"</b>.
            </div>
          )}
        </div>

        {/* Footer Modal Action */}
        <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 text-sm"
          >
            Tutup
          </button>
          {isReadyToExport && (
            <button
              onClick={handleDownloadPdf}
              disabled={reportData.length === 0 || isExportingPdf}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 text-sm"
            >
              {isExportingPdf ? 'Memproses PDF...' : '📄 Download PDF'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}