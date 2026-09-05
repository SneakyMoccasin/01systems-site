"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type LightboxImage = {
  src: string;
  width: number;
  height: number;
};

type LocalizedMediaLightboxProps = {
  image: LightboxImage;
  alt: string;
  helpText: string;
  closeLabel: string;
  dialogLabel: string;
  thumbnailClassName?: string;
};

export function LocalizedMediaLightbox({
  image,
  alt,
  helpText,
  closeLabel,
  dialogLabel,
  thumbnailClassName,
}: LocalizedMediaLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="cascade-media-trigger"
        aria-label={`${alt}. ${helpText}`}
        onClick={() => setIsOpen(true)}
      >
        <Image
          src={image.src}
          alt={alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 900px) 100vw, 900px"
          className={thumbnailClassName}
        />
        <span className="cascade-media-help">{helpText}</span>
      </button>

      {isOpen ? (
        <div
          className="cascade-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div className="cascade-lightbox-content">
            <button
              ref={closeRef}
              type="button"
              className="cascade-lightbox-close"
              onClick={() => setIsOpen(false)}
            >
              {closeLabel}
            </button>
            <Image
              src={image.src}
              alt={alt}
              width={image.width}
              height={image.height}
              sizes="100vw"
              className="cascade-lightbox-image"
              unoptimized
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
