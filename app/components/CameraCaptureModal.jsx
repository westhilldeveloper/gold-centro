'use client';
import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CameraIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function CameraCaptureModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // ✅ Use a ref to hold the stream so we always have access to the CURRENT stream
  const streamRef = useRef(null); 
  const [facingMode, setFacingMode] = useState('environment');

  // ✅ Helper to ensure all hardware tracks are stopped
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      stopCamera(); // Stop any old stream before starting a new one

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
        });
        
        streamRef.current = newStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        toast.error('Could not access camera. Please allow permissions.');
        console.error(err);
        onClose();
      }
    };

    startCamera();

    // Cleanup: runs when isOpen becomes false or facingMode changes
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // ✅ 1. STOP THE CAMERA IMMEDIATELY after the photo is taken
        stopCamera();
        
        // ✅ 2. Send the file and close
        onCapture(file);
        onClose();
      }
    }, 'image/jpeg', 0.85); 
  };

  // ✅ Custom close handler to ensure camera stops if user clicks the "X" button
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden relative">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
          <p className="text-white font-medium">Capture Photo</p>
          <button onClick={handleClose} className="text-white hover:text-red-400 p-2 bg-black/40 rounded-full backdrop-blur-sm">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-6 bg-gray-900 flex justify-center items-center gap-8">
          <button 
            onClick={toggleCamera} 
            className="text-white hover:text-yellow-400 p-3 bg-gray-800 rounded-full transition"
            title="Switch Camera"
          >
            <ArrowPathIcon className="w-6 h-6" />
          </button>
          
          <button 
            onClick={handleCapture}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-gray-400 hover:border-yellow-500 transition shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            <CameraIcon className="w-8 h-8 text-black" />
          </button>

          <div className="w-12" /> {/* Spacer to balance the switch button */}
        </div>
      </div>
    </div>
  );
}