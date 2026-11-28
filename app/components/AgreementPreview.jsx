// app/components/AgreementPreview.jsx
'use client';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function AgreementPreview({ isOpen, onClose, url }) {
  if (!isOpen || !url) return null;

  // Check if the file is a PDF based on the URL extension
  const isPDF = url.toLowerCase().includes('.pdf');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Signed Agreement Preview</h3>
            <p className="text-xs text-gray-500">If the document is blurry, download it to view the original clarity.</p>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-semibold transition"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Open Original
            </a>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-gray-200 p-4 flex justify-center items-center">
          {isPDF ? (
            <iframe 
              src={`${url}#toolbar=0`} 
              className="w-full h-[70vh] rounded-lg border-0 shadow-md bg-white"
              title="PDF Preview"
            />
          ) : (
            <img 
              src={url} 
              alt="Signed Agreement" 
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}