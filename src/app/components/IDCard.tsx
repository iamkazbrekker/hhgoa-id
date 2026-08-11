"use client";

import React, { useCallback } from "react";
import Image from "next/image";

const CONFIG = {
  card: { width: 440, height: 620, inset: "26px 20px" },
  badge: { x: 38, y: 42, width: 75, height: 110 },
  name: { x: 145, y: 42, width: 255 },
  photo: { x: 115, y: 185, width: 190, height: 220 },
  frontend: { x: 95, y: 372 },
  hackerHouse: { x: 36, y: 512 },
  goaHindi: { x: 36, y: 524, width: 85, height: 38 },
  studio: { x: 317, y: 527, width: 87, height: 55 },
  stampDecoration: { x: 296, y: 38, width: 100, height: 100 },
};

export interface IDCardData {
  firstName: string;
  lastName: string;
  teamName: string;
  role: string;
  photoUrl: string | null;
}

export interface PhotoTransform {
  scale: number;
  x: number;
  y: number;
}

interface IDCardProps extends Partial<IDCardData> {
  interactive?: boolean;
  photoTransform?: PhotoTransform;
  onPhotoTransformChange?: (t: PhotoTransform) => void;
  /** When true, replaces Next.js <Image> with plain <img> so html-to-image can render correctly */
  forExport?: boolean;
  /**
   * The CSS scale factor applied to the card wrapper by the parent (e.g. 0.75).
   * Touch coordinate deltas are divided by this value so photo dragging stays
   * accurate even when the card preview is scaled down on mobile.
   * Defaults to 1 (no scaling).
   */
  scaleHint?: number;
}

/**
 * Unified image component: uses plain <img> when forExport=true (for html-to-image),
 * otherwise uses Next.js <Image> for optimised loading.
 */
function Img({
  src, alt, fill, width, height, style, priority, objectFit, forExport,
}: {
  src: string; alt: string; fill?: boolean;
  width?: number; height?: number;
  style?: React.CSSProperties; priority?: boolean;
  objectFit?: React.CSSProperties["objectFit"];
  forExport?: boolean;
}) {
  if (forExport) {
    const imgStyle: React.CSSProperties = fill
      ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objectFit ?? "cover", ...style }
      : { display: "block", objectFit: objectFit ?? "cover", ...style };
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} style={imgStyle} />;
  }
  if (fill) {
    return <Image src={src} alt={alt} fill style={{ objectFit: objectFit ?? "cover", ...style }} priority={priority} />;
  }
  return <Image src={src} alt={alt} width={width!} height={height!} style={style} priority={priority} />;
}

export default function IDCard({
  firstName = "SAMARTH",
  lastName = "KAPSE",
  teamName = "KREMLIN SPIES",
  role = "FRONTEND",
  photoUrl = null,
  interactive = false,
  photoTransform = { scale: 1, x: 0, y: 0 },
  onPhotoTransformChange,
  forExport = false,
  scaleHint = 1,
}: IDCardProps) {
  const parts = teamName.trim().toUpperCase().split(/\s+/);
  const mid = Math.ceil(parts.length / 2);
  const badgeLine1 = parts.slice(0, mid).join(" ");
  const badgeLine2 = parts.slice(mid).join(" ");

  /* ── Mouse drag ── */
  const handlePhotoMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!interactive || !onPhotoTransformChange) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const initX = photoTransform.x;
      const initY = photoTransform.y;
      const initScale = photoTransform.scale;
      const onMove = (ev: MouseEvent) => {
        onPhotoTransformChange({ scale: initScale, x: initX + (ev.clientX - startX), y: initY + (ev.clientY - startY) });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [interactive, onPhotoTransformChange, photoTransform]
  );

  const photoContainerRef = React.useRef<HTMLDivElement>(null);

  const interactiveRef = React.useRef(interactive);
  interactiveRef.current = interactive;
  const photoTransformRef = React.useRef(photoTransform);
  photoTransformRef.current = photoTransform;
  const onPhotoTransformChangeRef = React.useRef(onPhotoTransformChange);
  onPhotoTransformChangeRef.current = onPhotoTransformChange;
  const scaleHintRef = React.useRef(scaleHint);
  scaleHintRef.current = scaleHint;

  const touchStateRef = React.useRef({
    isTracking: false,
    isMultiTouch: false,
    startTouch1: { x: 0, y: 0 },
    startTouch2: { x: 0, y: 0 },
    startDist: 0,
    startCenter: { x: 0, y: 0 },
    initScale: 1,
    initX: 0,
    initY: 0,
  });

  React.useEffect(() => {
    const el = photoContainerRef.current;
    if (!el) return;

    let isListeningToWindow = false;

    const cleanupWindowListeners = () => {
      if (isListeningToWindow) {
        window.removeEventListener("touchmove", onWindowTouchMove);
        window.removeEventListener("touchend", onWindowTouchEnd);
        window.removeEventListener("touchcancel", onWindowTouchEnd);
        isListeningToWindow = false;
      }
    };

    const attachWindowListeners = () => {
      if (!isListeningToWindow) {
        window.addEventListener("touchmove", onWindowTouchMove, { passive: false });
        window.addEventListener("touchend", onWindowTouchEnd, { passive: false });
        window.addEventListener("touchcancel", onWindowTouchEnd, { passive: false });
        isListeningToWindow = true;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!interactiveRef.current || !onPhotoTransformChangeRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const touches = Array.from(e.touches);
      const current = photoTransformRef.current;
      const state = touchStateRef.current;

      state.isTracking = true;
      state.initScale = current.scale;
      state.initX = current.x;
      state.initY = current.y;

      if (touches.length === 1) {
        state.isMultiTouch = false;
        state.startTouch1 = { x: touches[0].clientX, y: touches[0].clientY };
      } else if (touches.length >= 2) {
        state.isMultiTouch = true;
        state.startTouch1 = { x: touches[0].clientX, y: touches[0].clientY };
        state.startTouch2 = { x: touches[1].clientX, y: touches[1].clientY };
        state.startDist = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        );
        state.startCenter = {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2,
        };
      }

      attachWindowListeners();
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (!interactiveRef.current || !onPhotoTransformChangeRef.current) return;

      const state = touchStateRef.current;
      if (!state.isTracking) return;

      e.preventDefault();

      const touches = Array.from(e.touches);
      const sHint = scaleHintRef.current || 1;

      if (touches.length === 1) {
        if (state.isMultiTouch) {
          state.isMultiTouch = false;
          state.startTouch1 = { x: touches[0].clientX, y: touches[0].clientY };
          const current = photoTransformRef.current;
          state.initScale = current.scale;
          state.initX = current.x;
          state.initY = current.y;
        }

        const deltaX = (touches[0].clientX - state.startTouch1.x) / sHint;
        const deltaY = (touches[0].clientY - state.startTouch1.y) / sHint;

        onPhotoTransformChangeRef.current({
          scale: state.initScale,
          x: state.initX + deltaX,
          y: state.initY + deltaY,
        });
      } else if (touches.length >= 2) {
        if (!state.isMultiTouch || state.startDist === 0) {
          state.isMultiTouch = true;
          state.startTouch1 = { x: touches[0].clientX, y: touches[0].clientY };
          state.startTouch2 = { x: touches[1].clientX, y: touches[1].clientY };
          state.startDist = Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
          );
          state.startCenter = {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
          };
          const current = photoTransformRef.current;
          state.initScale = current.scale;
          state.initX = current.x;
          state.initY = current.y;
        }

        const currentDist = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        );
        const currentCenter = {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2,
        };

        if (state.startDist > 0) {
          const scaleRatio = currentDist / state.startDist;
          const newScale = Math.max(1, Math.min(5, state.initScale * scaleRatio));
          const deltaX = (currentCenter.x - state.startCenter.x) / sHint;
          const deltaY = (currentCenter.y - state.startCenter.y) / sHint;

          onPhotoTransformChangeRef.current({
            scale: newScale,
            x: state.initX + deltaX,
            y: state.initY + deltaY,
          });
        }
      }
    };

    const onWindowTouchEnd = (e: TouchEvent) => {
      const state = touchStateRef.current;
      const touches = Array.from(e.touches);

      if (touches.length === 0) {
        state.isTracking = false;
        state.isMultiTouch = false;
        cleanupWindowListeners();
      } else if (touches.length === 1) {
        state.isMultiTouch = false;
        state.startTouch1 = { x: touches[0].clientX, y: touches[0].clientY };
        const current = photoTransformRef.current;
        state.initScale = current.scale;
        state.initX = current.x;
        state.initY = current.y;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!interactiveRef.current || !onPhotoTransformChangeRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const current = photoTransformRef.current;
      const delta = e.ctrlKey ? -e.deltaY * 0.01 : (e.deltaY > 0 ? -0.1 : 0.1);
      const newScale = Math.max(1, Math.min(5, current.scale + delta));
      onPhotoTransformChangeRef.current({ ...current, scale: newScale });
    };

    let gestureInitScale = 1;
    const onGestureStart = (e: Event) => {
      if (!interactiveRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      gestureInitScale = photoTransformRef.current.scale;
    };

    const onGestureChange = (e: Event) => {
      if (!interactiveRef.current || !onPhotoTransformChangeRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const gestureEvent = e as unknown as { scale: number };
      if (gestureEvent.scale) {
        const newScale = Math.max(1, Math.min(5, gestureInitScale * gestureEvent.scale));
        const current = photoTransformRef.current;
        onPhotoTransformChangeRef.current({
          ...current,
          scale: newScale,
        });
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart, { passive: false });
    el.addEventListener("gesturechange", onGestureChange, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      cleanupWindowListeners();
    };
  }, []);

  return (
    <div
      style={{
        width: CONFIG.card.width,
        height: CONFIG.card.height,
        position: "relative",
        overflow: "hidden",
        filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.55))",
        fontFamily: "Anton, Impact, sans-serif",
      }}
    >
      {/* Outer frame */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Img src="/id/stamp.png" alt="stamp background" fill objectFit="fill" priority forExport={forExport} />
      </div>

      {/* Inner card / toile */}
      <div style={{ position: "absolute", inset: CONFIG.card.inset, zIndex: 1, overflow: "hidden", borderRadius: 2, border: "4px solid #9ac95f" }}>
        <Img src="/id/trans-bg.png" alt="goa toile" fill objectFit="cover" style={{ opacity: 0.56 }} priority forExport={forExport} />
      </div>

      {/* Component 1: Yellow badge */}
      <div style={{ position: "absolute", left: CONFIG.badge.x, top: CONFIG.badge.y, zIndex: 15, background: "#FEE101", padding: "10px 5px", width: CONFIG.badge.width, height: CONFIG.badge.height, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: "#1a6b3a" }} />
          ))}
        </div>
        <div style={{ fontFamily: "Impact, sans-serif", fontSize: 17, color: "#1a6b3a", lineHeight: 1.2, fontWeight: 700 }}>
          {badgeLine1}{badgeLine2 ? <><br />{badgeLine2}</> : null}
        </div>
      </div>

      {/* Component 2: Name */}
      <div style={{ position: "absolute", left: CONFIG.name.x, top: CONFIG.name.y, width: CONFIG.name.width, zIndex: 15, fontFamily: "Anton, sans-serif", textTransform: "uppercase", lineHeight: 1, letterSpacing: 1, textAlign: "right" }}>
        <div style={{ fontSize: 52, color: "#FEE101", textShadow: "3px 3px 0 #000", WebkitTextStroke: "1px #000" }}>
          {(firstName || "SAMARTH").toUpperCase()}
        </div>
        <div style={{ fontSize: 52, color: "transparent", WebkitTextStroke: "2px #FEE101" }}>
          {(lastName || "KAPSE").toUpperCase()}
        </div>
      </div>

      {/* Component 3: Photo */}
      <div style={{ position: "absolute", left: CONFIG.photo.x, top: CONFIG.photo.y, zIndex: 16, width: CONFIG.photo.width, height: CONFIG.photo.height }}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <div style={{ position: "absolute", top: 4, left: -8, width: CONFIG.photo.width - 4, height: CONFIG.photo.height - 4, background: "#FEE101", transform: "rotate(-18deg)", zIndex: 0, border: "2px solid #16683b" }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: CONFIG.photo.width - 4, height: CONFIG.photo.height - 4, background: "#FEE101", padding: "12px", boxShadow: "3px 3px 0 rgba(0,0,0,0.25)", zIndex: 1, border: "2px solid #16683b" }}>
            <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", background: "#060f08" }}>
              {photoUrl ? (
                <div
                  ref={photoContainerRef}
                  style={{ width: "100%", height: "100%", cursor: interactive ? "grab" : "default", overflow: "hidden", position: "relative", userSelect: "none", touchAction: "none" }}
                  onMouseDown={handlePhotoMouseDown}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt="User"
                    draggable={false}
                    style={{
                      width: "100%", height: "100%", objectFit: "contain", display: "block",
                      transform: `translate(${photoTransform.x}px, ${photoTransform.y}px) scale(${photoTransform.scale})`,
                      transformOrigin: "center",
                      pointerEvents: "none",
                    }}
                  />
                  {interactive && (
                    <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.55)", padding: "2px 6px", borderRadius: 2, pointerEvents: "none" }}>
                      <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 9, fontFamily: "sans-serif", letterSpacing: 0.5 }}>pinch to zoom · drag to move</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ width: "100%", height: "100%", background: "rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.75)", fontFamily: "sans-serif", fontSize: 13, gap: 8 }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span style={{ textAlign: "center", lineHeight: 1.3 }}>User Photo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Component 4: Role + developer.png (FIXED) */}
      <div style={{ position: "absolute", left: CONFIG.frontend.x, top: CONFIG.frontend.y, zIndex: 17, textAlign: "center", width: 250, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontFamily: " Anton, sans-serif", fontSize: 42, color: "#FEE101", textTransform: "uppercase", letterSpacing: 2, textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000", WebkitTextStroke: "0.5px #000" }}>
          {(role || "FRONTEND").toUpperCase()}
        </div>
        <div style={{ marginTop: "-45px", zIndex: 18 }}>
          <Img src="/id/developer.png" alt="डेवलपर" width={145} height={50} style={{ display: "block" }} forExport={forExport} />
        </div>
      </div>

      {/* Component 5: HACKER + HOUSE */}
      <div style={{ position: "absolute", left: CONFIG.hackerHouse.x, top: CONFIG.hackerHouse.y, zIndex: 15, fontFamily: "Anton, sans-serif", color: "#FEE101", WebkitTextStroke: "0.5px #000", lineHeight: 1 }}>
        <div style={{ fontSize: 36, letterSpacing: 1, textTransform: "uppercase" }}>HACKER</div>
        <div style={{ fontSize: 36, letterSpacing: 1, textTransform: "uppercase" }}>HOUSE</div>
      </div>

      {/* Component 5b: गोवा */}
      <div style={{ position: "absolute", left: CONFIG.goaHindi.x, top: CONFIG.goaHindi.y, zIndex: 16, width: CONFIG.goaHindi.width, height: CONFIG.goaHindi.height }}>
        <Img src="/id/goa_hindi.svg" alt="गोवा" fill objectFit="contain" forExport={forExport} />
      </div>

      {/* Component 6: 2:47 Studio */}
      <div style={{ position: "absolute", left: CONFIG.studio.x, top: CONFIG.studio.y, zIndex: 15, width: CONFIG.studio.width, height: CONFIG.studio.height }}>
        <Img src="/id/2-47.svg" alt="2:47pm studio" fill objectFit="contain" forExport={forExport} />
      </div>

      {/* Component 7: Stamp decoration */}
      <div style={{ position: "absolute", left: CONFIG.stampDecoration.x, top: CONFIG.stampDecoration.y, zIndex: 14, width: CONFIG.stampDecoration.width, height: CONFIG.stampDecoration.height }}>
        <Img src="/id/stamp.png" alt="stamp decoration" fill objectFit="contain" style={{ opacity: 1 }} forExport={forExport} />
      </div>
    </div>
  );
}
