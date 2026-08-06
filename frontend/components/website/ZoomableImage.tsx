"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import ImageLightbox from "./ImageLightbox";
import type { LightboxImage } from "./ImageLightbox";

type Props = {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
  imgClassName?: string;
  /** Additional images for multi-image lightbox (e.g. project gallery) */
  gallery?: LightboxImage[];
  /** Index within gallery to open at */
  galleryIndex?: number;
};

export default function ZoomableImage({
  src,
  alt = "",
  caption,
  className = "",
  imgClassName = "",
  gallery,
  galleryIndex = 0,
}: Props) {
  const [open, setOpen] = useState(false);

  const images: LightboxImage[] = gallery ?? [{ src, alt, caption }];
  const startIndex = gallery ? galleryIndex : 0;

  return (
    <>
      <div
        className={`relative overflow-hidden cursor-zoom-in group ${className}`}
        onDoubleClick={() => setOpen(true)}
        title="Double-click to view fullscreen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imgClassName}`}
          draggable={false}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
        />
        {/* Zoom hint overlay — shows on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[9px] tracking-widest uppercase px-2 py-1 rounded-full font-medium">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
            </svg>
            Zoom
          </span>
        </div>
      </div>

      {open &&
        createPortal(
          <ImageLightbox
            images={images}
            initialIndex={startIndex}
            onClose={() => setOpen(false)}
          />,
          document.body
        )}
    </>
  );
}
