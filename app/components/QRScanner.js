'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanner({ onScan, onError, onClose }) {
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);
  const isRunningRef = useRef(false); // ✅ track running state

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const html5QrCode = new Html5Qrcode('qr-reader');
    setScanner(html5QrCode);

    const startScanner = async () => {
      try {
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // ✅ Success – stop scanner safely
            if (isRunningRef.current) {
              html5QrCode.stop().catch(() => {});
              isRunningRef.current = false;
            }
            setIsScanning(false);
            setScanSuccess(true);
            if (onScan) onScan(decodedText);
          },
          (errorMessage) => {
            // Ignore continuous errors
          }
        );
        isRunningRef.current = true;
        setIsScanning(true);
      } catch (err) {
        console.error('QR Scanner start error:', err);
        if (onError) onError(err.message);
      }
    };

    startScanner();

    // ✅ Cleanup: only stop if actually running
    return () => {
      if (html5QrCode && isRunningRef.current) {
        html5QrCode.stop().catch(() => {});
        isRunningRef.current = false;
      }
    };
  }, []);

  const handleClose = () => {
    if (scanner && isRunningRef.current) {
      scanner.stop().catch(() => {});
      isRunningRef.current = false;
    }
    setIsScanning(false);
    if (onClose) onClose();
  };

  return (
    <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden">
      <div id="qr-reader" className="w-full h-full" />
      
      {!isScanning && !scanSuccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
          <p className="text-lg font-medium">⏹️ Scanning stopped</p>
        </div>
      )}
      
      {scanSuccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/80 text-white">
          <div className="text-center">
            <p className="text-4xl">✅</p>
            <p className="text-lg font-bold mt-2">QR Scanned!</p>
            <p className="text-sm">Verifying...</p>
          </div>
        </div>
      )}
      
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg z-10"
      >
        ✕
      </button>
    </div>
  );
}