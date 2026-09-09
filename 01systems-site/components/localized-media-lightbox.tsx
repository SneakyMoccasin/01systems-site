"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

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
};

export function LocalizedMediaLightbox({ image, alt, helpText, closeLabel, dialogLabel }: LocalizedMediaLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [fittedSize, setFittedSize] = useState<{
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);

  const resetView = useCallback(() => {
    setZoom(MIN_ZOOM);
    dragRef.current = null;
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
  }, []);

  const openLightbox = () => {
    resetView();
    setIsOpen(true);
  };

  const closeLightbox = useCallback(() => {
    resetView();
    setIsOpen(false);
  }, [resetView]);

  useEffect(() => {
    if (!isOpen) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [closeLightbox, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const fitImage = () => {
      const ratio = image.width / image.height;
      let width = Math.min(image.width, viewport.clientWidth);
      let height = width / ratio;

      if (height > viewport.clientHeight) {
        height = viewport.clientHeight;
        width = height * ratio;
      }

      setFittedSize({
        width,
        height,
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
      });
    };

    fitImage();
    const observer = new ResizeObserver(fitImage);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [image.height, image.src, image.width, isOpen]);

  const changeZoom = (nextZoom: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  };

  return (
    <>
      <button ref={triggerRef} type="button" className="cascade-media-trigger" aria-label={`${alt}. ${helpText}`} onClick={openLightbox}>
        <Image src={image.src} alt={alt} width={image.width} height={image.height} sizes="(max-width: 900px) 100vw, 900px" />
        <span className="cascade-media-help">{helpText}</span>
      </button>

      {isOpen ? (
        <div
          className="cascade-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLightbox();
          }}
        >
          <div className="cascade-lightbox-content">
            <div className="cascade-lightbox-toolbar">
              <div className="cascade-lightbox-zoom-controls" aria-label="Zoom">
                <button type="button" aria-label="Zoom out" disabled={zoom === MIN_ZOOM} onClick={() => changeZoom(zoom - ZOOM_STEP)}>−</button>
                <button type="button" aria-label="Reset zoom to 100%" onClick={resetView}>100 %</button>
                <button type="button" aria-label="Zoom in" disabled={zoom === MAX_ZOOM} onClick={() => changeZoom(zoom + ZOOM_STEP)}>+</button>
              </div>
              <button ref={closeRef} type="button" className="cascade-lightbox-close" onClick={closeLightbox}>
                {closeLabel}
              </button>
            </div>
            <div
              ref={viewportRef}
              className={`cascade-lightbox-viewport${zoom > MIN_ZOOM ? " is-zoomed" : ""}`}
              onPointerDown={(event) => {
                const viewport = viewportRef.current;
                if (!viewport || zoom === MIN_ZOOM || event.button !== 0) return;
                viewport.setPointerCapture(event.pointerId);
                dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
              }}
              onPointerMove={(event) => {
                const viewport = viewportRef.current;
                const drag = dragRef.current;
                if (!viewport || !drag || drag.pointerId !== event.pointerId) return;
                viewport.scrollLeft = drag.left - (event.clientX - drag.x);
                viewport.scrollTop = drag.top - (event.clientY - drag.y);
              }}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
              onPointerCancel={() => { dragRef.current = null; }}
            >
              <div
                className="cascade-lightbox-canvas"
                style={fittedSize ? {
                  width: Math.max(fittedSize.viewportWidth, fittedSize.width * zoom),
                  height: Math.max(fittedSize.viewportHeight, fittedSize.height * zoom),
                } : undefined}
              >
                <Image
                  src={image.src}
                  alt={alt}
                  width={image.width}
                  height={image.height}
                  sizes="100vw"
                  className="cascade-lightbox-image"
                  unoptimized
                  priority
                  draggable={false}
                  style={fittedSize ? { width: fittedSize.width * zoom, height: fittedSize.height * zoom } : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
