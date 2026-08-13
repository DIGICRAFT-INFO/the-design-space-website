"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import ImageLightbox from "@/components/website/ImageLightbox";
import type { LightboxImage } from "@/components/website/ImageLightbox";

interface GalleryImage {
  id: string;
  file_url: string;
  caption?: string;
}

interface Props {
  images: GalleryImage[];
  projectTitle: string;
}

export default function PortfolioGallery({ images, projectTitle }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const lightboxImages: LightboxImage[] = images.map((img) => ({
    src: img.file_url,
    alt: img.caption || projectTitle,
    caption: img.caption || undefined,
  }));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {images.map((img, i) => (
          <motion.div
            key={img.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setLightboxIndex(i)}
            className={`relative overflow-hidden rounded-sm group ${
              i % 3 === 0 ? "md:col-span-2 aspect-video" : "aspect-[4/5]"
            }`}
          >
            <img
              src={img.file_url}
              alt={img.caption || projectTitle}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
            />
            {/* Hover overlay with zoom icon */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full font-semibold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
                </svg>
                View
              </span>
            </div>
            {/* Image number badge */}
            <span className="absolute bottom-2 right-2 text-[9px] font-bold text-white/60 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {i + 1} / {images.length}
            </span>
          </motion.div>
        ))}
      </div>

      {lightboxIndex !== null &&
        createPortal(
          <ImageLightbox
            images={lightboxImages}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />,
          document.body
        )}
    </>
  );
}
