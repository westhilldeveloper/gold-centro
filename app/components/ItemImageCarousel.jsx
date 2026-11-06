// D:\gold-centro\app\components\ItemImageCarousel.jsx
'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

export function getImageUrls(item) {
  if (!item) return [];
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls.filter(Boolean);
  }
  if (Array.isArray(item.imageUrl) && item.imageUrl.length > 0) {
    return item.imageUrl.filter(Boolean);
  }
  if (typeof item.imageUrls === 'string' && item.imageUrls) {
    return [item.imageUrls];
  }
  if (typeof item.imageUrl === 'string' && item.imageUrl) {
    return [item.imageUrl];
  }
  return [];
}

export default function ItemImageCarousel({
  images,
  alt,
  onPreview,
  size = 80,
  className = '',
}) {
  const [index, setIndex] = useState(0);
  const total = images.length;

  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [total, index]);

  if (total === 0) {
    return (
      <div
        className={`flex-shrink-0 rounded-lg border-2 border-gray-200 bg-white flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <PhotoIcon
          className="text-gray-300"
          style={{ width: size * 0.4, height: size * 0.4 }}
        />
      </div>
    );
  }

  const current = images[index];
  const hasMultiple = total > 1;

  const goPrev = (e) => {
    e.stopPropagation();
    setIndex((i) => (i - 1 + total) % total);
  };
  const goNext = (e) => {
    e.stopPropagation();
    setIndex((i) => (i + 1) % total);
  };

  return (
    <div
      className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-yellow-400 transition bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(current);
        }}
        className="w-full h-full block"
      >
        <img
          src={current}
          alt={alt || 'item'}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous image"
            className="absolute left-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition"
          >
            <ChevronLeftIcon className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next image"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition"
          >
            <ChevronRightIcon className="w-3 h-3" />
          </button>
          <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-full leading-none">
            {index + 1}/{total}
          </span>
        </>
      )}
    </div>
  );
}