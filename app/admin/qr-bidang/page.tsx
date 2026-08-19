'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Download, Globe, Printer, ArrowLeft, ExternalLink, QrCode } from 'lucide-react';

interface BidangItem {
  id_bidang: string;
  nama_bidang: string;
}

export default function QRGeneratorBidangPage() {
  const router = useRouter();
  const supabase = createClient();

  const [listBidang, setListBidang] = useState<BidangItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom Domain State
  const [baseUrl, setBaseUrl] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    // 1. Dapatkan Domain Otomatis
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      setBaseUrl(currentOrigin);
      setCustomDomain(currentOrigin);
    }

    // 2. Fetch Data Bidang
    const fetchBidang = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bidang')
        .select('id_bidang, nama_bidang')
        .order('nama_bidang', { ascending: true });

      if (!error && data) {
        setListBidang(data);
      }
      setLoading(false);
    };

    fetchBidang();
  }, []);

  // Handler Ganti Domain Target QR
  const handleDomainChange = (val: string) => {
    setCustomDomain(val);
    setIsCustom(val !== baseUrl);
  };

  // Reset ke Origin saat ini
  const handleResetDomain = () => {
    setCustomDomain(baseUrl);
    setIsCustom(false);
  };

  // Download Tunggal (PNG)
  const downloadQR = (idBidang: string, namaBidang: string) => {
    const svgElement = document.getElementById(`qr-${idBidang}`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const context = canvas.getContext('2d');
      if (context) {
        // Background putih
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, 400, 400);
        context.drawImage(image, 20, 20, 360, 360);

        const png = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = png;
        downloadLink.download = `QR-Bidang-${namaBidang.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    image.src = blobURL;
  };

  // Fitur Print Lembar Stiker / Cetak PDF Langsung
  const handlePrintAll = () => {
    window.print();
  };

  const activeDomain = customDomain.trim().replace(/\/+$/, ''); // Hapus trailing slash jika ada

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER & NAVIGASI (Disembunyikan saat Print) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200 gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Manajemen Cetak & Update QR Code Bidang</h1>
              <p className="text-xs text-slate-500">
                Generator QR Code dinamis untuk ditempel di ruang bidang Diskominfo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAll}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl transition font-medium flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak Semua (PDF)
            </button>
            <button
              onClick={() => router.back()}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl transition border border-slate-200 font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
          </div>
        </div>

        {/* PENGATURAN DOMAIN HOSTING (Inilah Jawaban untuk Pembimbing!) */}
        <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-2xl print:hidden">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Pengaturan Target Domain Hosting (URL QR Code)
                </h3>
                {isCustom && (
                  <button
                    onClick={handleResetDomain}
                    className="text-[11px] text-amber-700 underline hover:text-amber-900 flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset ke Domain Saat Ini
                  </button>
                )}
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                Jika web dipindahkan ke hosting/domain resmi dinas baru (misal: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">https://diskominfo.go.id</code>), Anda dapat memperbarui basis URL di bawah ini sebelum mengunduh/mencetak ulang stiker QR Code.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="url"
                  value={customDomain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  placeholder="Contoh: https://inventaris.diskominfo.go.id"
                  className="flex-1 px-3.5 py-2 bg-white border border-amber-300 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* GRID QR CODE (Bisa di-print langsung secara rapi) */}
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500 flex justify-center items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Memuat daftar bidang...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
            {listBidang.map((bidang) => {
              const targetPublicUrl = `${activeDomain}/public/bidang/${bidang.id_bidang}`;

              return (
                <div
                  key={bidang.id_bidang}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center space-y-4 print:border-2 print:border-slate-800 print:shadow-none print:p-4 print:break-inside-avoid"
                >
                  <div className="border-b border-slate-100 pb-2 w-full">
                    <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase block">
                      Dinas Komunikasi & Informatika
                    </span>
                    <h3 className="font-bold text-sm text-slate-800 mt-0.5">{bidang.nama_bidang}</h3>
                  </div>

                  {/* QR Code SVG */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-inner print:border-none print:shadow-none">
                    <QRCodeSVG
                      id={`qr-${bidang.id_bidang}`}
                      value={targetPublicUrl}
                      size={160}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono break-all px-2 leading-tight">
                    {targetPublicUrl}
                  </p>

                  {/* Tombol Aksi (Sembunyi saat di-print) */}
                  <div className="flex gap-2 w-full pt-2 print:hidden">
                    <button
                      onClick={() => downloadQR(bidang.id_bidang, bidang.nama_bidang)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-xl font-medium transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PNG
                    </button>
                    <a
                      href={targetPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-medium border border-slate-200 transition flex items-center justify-center gap-1"
                      title="Uji coba link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}