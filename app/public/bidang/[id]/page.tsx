'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BidangInfo {
  id_bidang: string;
  nama_bidang: string;
}

interface BarangItem {
  id: string;
  nibar: string;
  nomor_register: string;
  spesifikasi: string;
  jumlah: number;
  keterangan: string;
  barang?: { nama_barang?: string } | null;
  merk?: { merk?: string } | null;
  tahun?: { tahun?: string } | null;
  satuan?: { satuan?: string } | null;
  kondisi?: { kondisi?: string } | null;
}

export default function PublicBidangPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params Next.js 15+
  const resolvedParams = use(params);
  const bidangId = resolvedParams.id;

  const supabase = createClient();

  const [bidang, setBidang] = useState<BidangInfo | null>(null);
  const [listBarang, setListBarang] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Info Bidang
        const { data: dataBidang, error: errBidang } = await supabase
          .from('bidang')
          .select('id_bidang, nama_bidang')
          .eq('id_bidang', bidangId)
          .single();

        if (errBidang) throw new Error('Bidang tidak ditemukan');
        setBidang(dataBidang);

        // 2. Fetch Barang khusus Bidang ini
        const { data: dataBarang, error: errBarang } = await supabase
          .from('data_barang')
          .select(`
            id,
            nibar,
            nomor_register,
            spesifikasi,
            jumlah,
            keterangan,
            barang:barang_id ( nama_barang ),
            merk:merk_id ( merk ),
            tahun:tahun_id ( tahun ),
            satuan:satuan_id ( satuan ),
            kondisi:kondisi_id ( kondisi )
          `)
          .eq('bidang_id', bidangId)
          .order('created_at', { ascending: false });

        if (errBarang) throw errBarang;
        setListBarang((dataBarang as any) || []);

      } catch (err: any) {
        console.error('Fetch Public Error:', err);
        setErrorMessage(err.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };

    if (bidangId) fetchData();
  }, [bidangId]);

  // Filter Barang
  const filteredBarang = listBarang.filter((item) => {
    const q = searchQuery.toLowerCase();
    const nama = item.barang?.nama_barang?.toLowerCase() || '';
    const nibar = item.nibar?.toLowerCase() || '';
    const merk = item.merk?.merk?.toLowerCase() || '';

    return nama.includes(q) || nibar.includes(q) || merk.includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Memuat informasi inventaris...
      </div>
    );
  }

  if (errorMessage || !bidang) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 text-sm p-4">
        {errorMessage || 'Halaman tidak ditemukan.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header Publik */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
            Informasi Publik Inventaris
          </span>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">
            Daftar Barang — {bidang.nama_bidang}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Menampilkan seluruh data barang dan aset yang tercatat pada {bidang.nama_bidang}.
          </p>
        </div>

        {/* Search & Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <h2 className="text-sm font-bold text-gray-800">
              Total Barang: {listBarang.length} Item
            </h2>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama barang, NIBAR, merk..."
              className="w-full sm:w-64 px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
            />
          </div>

          {filteredBarang.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400 italic">
              Tidak ada data barang yang ditemukan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">NIBAR / Reg</th>
                    <th className="p-2.5">Nama & Spesifikasi</th>
                    <th className="p-2.5">Merk / Tahun</th>
                    <th className="p-2.5 text-center">Jumlah</th>
                    <th className="p-2.5">Kondisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBarang.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2.5 text-gray-500">{idx + 1}</td>
                      <td className="p-2.5 font-mono">
                        <span className="font-semibold text-gray-800">{item.nibar || '-'}</span>
                        <br />
                        <span className="text-[10px] text-gray-400">Reg: {item.nomor_register || '-'}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-bold text-gray-900">{item.barang?.nama_barang || 'Tanpa Nama'}</span>
                        {item.spesifikasi && (
                          <p className="text-[11px] text-gray-500">{item.spesifikasi}</p>
                        )}
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