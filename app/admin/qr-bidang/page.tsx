'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

interface BidangItem {
  id_bidang: string;
  nama_bidang: string;
}

export default function QRGeneratorBidangPage() {
  const router = useRouter();
  const supabase = createClient();

  const [listBidang, setListBidang] = useState<BidangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Trik Dapatkan Domain Otomatis (Localhost vs Hosting)
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }

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

  // Fungsi Download QR Code SVG ke Gambar PNG
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
      canvas.width = 300;
      canvas.height = 300;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, 300, 300);
        context.drawImage(image, 0, 0, 300, 300);

        const png = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = png;
        downloadLink.download = `QR-Code-${namaBidang.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    image.src = blobURL;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Cetak Barcode / QR Code Per Bidang</h1>
            <p className="text-xs text-gray-500">QR Code ini bisa dicetak/ditempel di ruang bidang agar dapat discan publik</p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition border border-gray-300"
          >
            &larr; Kembali
          </button>
        </div>

        {/* Grid QR Code */}
        {loading ? (
          <div className="text-center py-10 text-xs text-gray-500">Memuat daftar bidang...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {listBidang.map((bidang) => {
              const targetPublicUrl = `${baseUrl}/public/bidang/${bidang.id_bidang}`;

              return (
                <div
                  key={bidang.id_bidang}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center text-center space-y-4"
                >
                  <h3 className="font-bold text-sm text-gray-800">{bidang.nama_bidang}</h3>

                  {/* QR Code Canvas */}
                  <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-inner">
                    <QRCodeSVG
                      id={`qr-${bidang.id_bidang}`}
                      value={targetPublicUrl}
                      size={160}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <p className="text-[10px] text-gray-400 font-mono break-all px-2">
                    {targetPublicUrl}
                  </p>

                  <div className="flex gap-2 w-full pt-2">
                    <button
                      onClick={() => downloadQR(bidang.id_bidang, bidang.nama_bidang)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded font-semibold transition shadow-sm"
                    >
                      Download PNG
                    </button>
                    <a
                      href={targetPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-2 rounded font-medium border border-gray-300 transition flex items-center justify-center"
                    >
                      Uji Buka
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