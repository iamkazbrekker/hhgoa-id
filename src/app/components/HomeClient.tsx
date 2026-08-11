"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import IDCard, { IDCardData, PhotoTransform } from "./IDCard";

const ROLES = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "AI", label: "AI / ML" },
];

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.5)",
  border: "2px solid rgba(154,201,95,0.4)",
  color: "#FEE101",
  fontFamily: "Anton, sans-serif",
  fontSize: 16,
  padding: "12px 16px",
  outline: "none",
  textTransform: "uppercase",
  letterSpacing: 2,
  boxSizing: "border-box",
  display: "block",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "Anton, sans-serif",
  fontSize: 11,
  letterSpacing: 3,
  color: "#9ac95f",
  marginBottom: 8,
  textTransform: "uppercase",
};

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function HomeClient() {
  const [form, setForm] = useState<IDCardData>({
    firstName: "",
    lastName: "",
    teamName: "",
    role: "FRONTEND",
    photoUrl: null,
  });
  const [photoTransform, setPhotoTransform] = useState<PhotoTransform>({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const prevPhotoUrl = useRef<string | null>(null);

  /* ── Card preview scale ──
   * A ResizeObserver watches the card wrapper div and computes how much the
   * 440 px-wide IDCard should be scaled so it always fits the column width.
   * On desktop (column is exactly 440 px) the scale stays at 1.          */
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const [cardScale, setCardScale] = useState(1);

  useEffect(() => {
    const el = cardWrapperRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setCardScale(Math.min(1, w / 440));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Prevent site / page zoom ── */
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0" || e.key === "_")
      ) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("gesturestart", handleGesture, { passive: false });
    document.addEventListener("gesturechange", handleGesture, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("gesturestart", handleGesture);
      document.removeEventListener("gesturechange", handleGesture);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  /* ── HEIC-aware photo handler ── */
  const handlePhotoChange = useCallback(async (file: File | null) => {
    if (!file) return;
    let processedFile: File = file;

    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    if (isHeic) {
      setExportStatus("Converting iPhone photo...");
      try {
        // dynamic import so it only loads when needed
        const heic2any = (await import("heic2any")).default as (
          opts: { blob: Blob; toType?: string; quality?: number }
        ) => Promise<Blob | Blob[]>;

        const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        const blob = Array.isArray(result) ? result[0] : result;
        processedFile = new File(
          [blob],
          file.name.replace(/\.(heic|heif)$/i, ".jpg"),
          { type: "image/jpeg" }
        );
      } catch (err) {
        console.error("HEIC conversion failed:", err);
        setExportStatus("Could not convert HEIC file.");
        setTimeout(() => setExportStatus(null), 3000);
        return;
      } finally {
        setExportStatus(null);
      }
    }

    if (prevPhotoUrl.current) URL.revokeObjectURL(prevPhotoUrl.current);
    const url = URL.createObjectURL(processedFile);
    prevPhotoUrl.current = url;
    setForm((p) => ({ ...p, photoUrl: url }));
    setPhotoTransform({ scale: 1.25, x: 0, y: 0 }); // pre-zoomed so photo automatically zooms in on upload
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handlePhotoChange(file);
    },
    [handlePhotoChange]
  );

  const preview: IDCardData = {
    firstName: form.firstName || "SAMARTH",
    lastName: form.lastName || "KAPSE",
    teamName: form.teamName || "KREMLIN SPIES",
    role: form.role || "FRONTEND",
    photoUrl: form.photoUrl,
  };

  /* ── Export / Download ── */
  const generateImage = useCallback(async (): Promise<string | null> => {
    if (!exportRef.current) return null;
    const container = exportRef.current;

    // Ensure all <img> elements inside container are fully loaded before capturing
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve(null);
        return new Promise((resolve) => {
          img.onload = () => resolve(null);
          img.onerror = () => resolve(null);
        });
      })
    );

    const { toPng } = await import("html-to-image");
    return toPng(container, {
      width: 800,
      height: 1120,
      pixelRatio: 2,
      cacheBust: false,
    });
  }, []);

  const downloadCard = useCallback(async () => {
    setIsExporting(true);
    setExportStatus("Rendering card...");
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) return;
      const link = document.createElement("a");
      const name = [preview.firstName, preview.lastName]
        .filter(Boolean)
        .join("-")
        .toLowerCase() || "hh-goa";
      link.download = `${name}-hhgoa-id.png`;
      link.href = dataUrl;
      link.click();
      setExportStatus("Downloaded!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Download failed:", msg, err);
      setExportStatus("Export failed — try again.");
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(null), 2500);
    }
  }, [generateImage, preview.firstName, preview.lastName]);

  const shareOnX = useCallback(async () => {
    setIsExporting(true);
    setExportStatus("Preparing card for X...");

    // ── Single source of truth for the post text with #framedinGoa hashtag ──
    const POST_TEXT =
      "Here is my official Hacker House Goa 2026 ID card! 🌴💻\n\n#framedinGoa #HackerHouseGoa #HHGoa2026";

    try {
      const dataUrl = await generateImage();
      if (!dataUrl) {
        setExportStatus("Failed to render card image.");
        return;
      }

      // Convert data URL to Blob and File
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const filename = `${[preview.firstName, preview.lastName]
        .filter(Boolean)
        .join("-")
        .toLowerCase() || "hh-goa"
        }-id.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // ── Strategy 1: Web Share API (native share on Mobile & supported Desktop browsers) ──
      // This is the Web API that passes the local ID card photo file directly to the X app / share sheet
      // along with pre-filled text and hashtags (#framedinGoa).
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "Hacker House Goa ID Card",
            text: POST_TEXT,
          });
          setExportStatus("Shared to X!");
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            // User dismissed the share sheet
            setExportStatus(null);
            return;
          }
          console.warn("navigator.share failed, using fallback:", err);
        }
      }

      // ── Strategy 2: Fallback for web browsers without native file share ──
      // 1. Copy PNG image blob to clipboard so user can press Ctrl+V / Cmd+V in X composer
      let copiedToClipboard = false;
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof ClipboardItem !== "undefined"
      ) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          copiedToClipboard = true;
        } catch (clipErr) {
          console.warn("Could not copy image to clipboard:", clipErr);
        }
      }

      // 2. Download PNG file so user has it locally to upload/attach if needed
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();

      // 3. Update status message for the user
      if (copiedToClipboard) {
        setExportStatus(
          "Card image copied & downloaded! Paste (Ctrl+V) into your tweet on X..."
        );
      } else {
        setExportStatus(
          "Card image downloaded! Attach the saved PNG to your tweet on X..."
        );
      }

      // 4. Open X (Twitter) post intent with prefilled description and #framedinGoa tags
      setTimeout(() => {
        const encodedText = encodeURIComponent(POST_TEXT);
        window.open(`https://x.com/intent/post?text=${encodedText}`, "_blank");
      }, 600);
    } catch (err) {
      console.error("Share on X failed:", err);
      setExportStatus("Share failed — try Download PNG instead.");
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(null), 4500);
    }
  }, [generateImage, preview.firstName, preview.lastName]);

  return (
    <main style={{ background: "#060f08", overflowX: "hidden" }}>

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", textAlign: "center" }}>
        {/* Background layer 1: green texture */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image src="/id/green-bg.webp" alt="bg texture" fill style={{ objectFit: "cover", opacity: 0.35 }} priority />
        </div>

        {/* Background layer 2: trans-bg.png toile artwork with gradient blend */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <Image src="/id/trans-bg.png" alt="toile" fill style={{ objectFit: "cover", opacity: 0.55 }} priority />
        </div>

        {/* Background layer 3: Vibrant radial + linear dark green gradient overlay around trans-bg */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            background:
              "radial-gradient(ellipse at 50% 45%, rgba(26,107,58,0.55) 0%, rgba(10,35,15,0.85) 50%, rgba(6,15,8,0.97) 80%, #060f08 100%), linear-gradient(to bottom, rgba(6,15,8,0.5) 0%, transparent 40%, rgba(3,10,4,0.95) 100%)",
          }}
        />

        {/* Hero Content (Centered) */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            width: "100%",
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
          className="py-14 sm:py-24 px-5 sm:px-8"
        >
          <div
            style={{
              display: "inline-block",
              border: "2px solid #9ac95f",
              background: "rgba(10,35,15,0.7)",
              boxShadow: "0 0 20px rgba(154,201,95,0.2)",
              borderRadius: 2,
            }}
            className="px-4 py-1.5 sm:px-5 sm:py-2 mb-6 sm:mb-8"
          >
            <span
              style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9ac95f", textTransform: "uppercase" }}
              className="text-[10px] sm:text-xs tracking-[3px] sm:tracking-[6px]"
            >
              HACKER HOUSE GOA • 2026
            </span>
          </div>

          <h1
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              fontSize: "clamp(32px, 11vw, 115px)",
              color: "#FEE101",
              textTransform: "uppercase",
              lineHeight: 0.9,
              margin: "0 0 12px",
              textShadow: "5px 5px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000",
              WebkitTextStroke: "1px #000",
              letterSpacing: 3,
            }}
          >
            HACKER<br />
            <span style={{ color: "transparent", WebkitTextStroke: "3px #FEE101", textShadow: "none" }}>HOUSE</span>
          </h1>

          <h2
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              fontSize: "clamp(32px, 6vw, 64px)",
              color: "#FF0080",
              textTransform: "uppercase",
              margin: "0 0 24px",
              /* letterSpacing is responsive — tight on phones, wide on desktop */
              textShadow: "3px 3px 0 #000",
            }}
            className="tracking-[4px] sm:tracking-[10px]"
          >
            GOA
          </h2>

          <p
            style={{
              fontFamily: "sans-serif",
              color: "rgba(254,225,1,0.85)",
              lineHeight: 1.7,
              maxWidth: 520,
              textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            }}
            className="text-base sm:text-lg mb-8 sm:mb-11"
          >
            Your official hackathon identity.<br />
            <span style={{ color: "#9ac95f", fontWeight: 600 }}>Stamp your presence. Show your stack.</span>
          </p>

          <button
            onClick={() => generatorRef.current?.scrollIntoView({ behavior: "smooth" })}
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              letterSpacing: 3,
              background: "#FEE101",
              color: "#060f08",
              border: "3px solid #FEE101",
              cursor: "pointer",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              fontWeight: 700,
              boxShadow: "0 10px 30px rgba(254,225,1,0.25)",
              transition: "all 0.2s ease",
            }}
            className="text-base sm:text-lg px-8 py-4 sm:px-12 sm:py-[18px]"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#FEE101";
              e.currentTarget.style.boxShadow = "0 10px 40px rgba(254,225,1,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#FEE101";
              e.currentTarget.style.color = "#060f08";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(254,225,1,0.25)";
            }}
          >
            GENERATE YOUR CARD&nbsp;↓
          </button>
        </div>

        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 10, letterSpacing: 4, color: "rgba(154,201,95,0.4)", textTransform: "uppercase" }}>scroll</span>
          <div style={{ width: 1, height: 36, background: "rgba(154,201,95,0.25)" }} />
        </div>
      </section>

      {/* ═══ GENERATOR ═══ */}
      <section ref={generatorRef} style={{ background: "#030a04", minHeight: "100vh" }} className="py-12 px-4 sm:py-24 sm:px-6">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="text-center mb-10 sm:mb-16">
            <p style={{ fontFamily: "Anton, sans-serif", fontSize: 11, color: "#9ac95f", textTransform: "uppercase", marginBottom: 16 }} className="tracking-[3px] sm:tracking-[6px]">── ID CARD GENERATOR ──</p>
            <h2 style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: "clamp(32px, 5vw, 60px)", color: "#FEE101", textTransform: "uppercase", margin: 0, textShadow: "3px 3px 0 #000", WebkitTextStroke: "0.5px #000", letterSpacing: 2 }}>BUILD YOUR IDENTITY</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-8 lg:gap-14 items-start">

            {/* ── FORM ── */}
            <div className="bg-[rgba(20,50,25,0.65)] border-2 border-[#9ac95f] p-6 sm:p-10 backdrop-blur-md">
              <h3 style={{ fontFamily: "Anton, sans-serif", color: "#FEE101", fontSize: 18, letterSpacing: 4, textTransform: "uppercase", margin: "0 0 32px", paddingBottom: 16, borderBottom: "2px solid rgba(154,201,95,0.2)" }}>YOUR DETAILS</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label htmlFor="first-name-input" style={LABEL_STYLE}>First Name</label>
                  <input id="first-name-input" type="text" placeholder="SAMARTH" value={form.firstName} maxLength={12}
                    autoComplete="off"
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FEE101")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(154,201,95,0.4)")} />
                </div>
                <div>
                  <label htmlFor="last-name-input" style={LABEL_STYLE}>Last Name</label>
                  <input id="last-name-input" type="text" placeholder="KAPSE" value={form.lastName} maxLength={12}
                    autoComplete="off"
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    style={INPUT_STYLE}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#FEE101")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(154,201,95,0.4)")} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="team-name-input" style={LABEL_STYLE}>Team Name</label>
                <input id="team-name-input" type="text" placeholder="KREMLIN SPIES" value={form.teamName} maxLength={20}
                  autoComplete="off"
                  onChange={(e) => setForm((p) => ({ ...p, teamName: e.target.value }))}
                  style={INPUT_STYLE}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FEE101")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(154,201,95,0.4)")} />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={LABEL_STYLE}>Role</label>
                {/* Always 3 columns — labels are short enough to fit at 320 px+ */}
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Select role">
                  {ROLES.map((r) => {
                    const active = form.role === r.value;
                    return (
                      <button key={r.value} type="button" role="radio" aria-checked={active} onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                        style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", padding: "12px 8px", border: active ? "2px solid #FEE101" : "2px solid rgba(154,201,95,0.3)", background: active ? "#FEE101" : "rgba(0,0,0,0.4)", color: active ? "#060f08" : "#9ac95f", cursor: "pointer", transition: "all 0.15s", outline: "none" }}
                        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = "#FEE101"; e.currentTarget.style.color = "#FEE101"; } }}
                        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "rgba(154,201,95,0.3)"; e.currentTarget.style.color = "#9ac95f"; } }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#FEE101"; }}
                        onBlur={(e) => { if (!active) { e.currentTarget.style.borderColor = "rgba(154,201,95,0.3)"; } }}
                      >{r.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Photo upload — accepts jpg, png, webp, heic */}
              <div>
                <label style={LABEL_STYLE}>Your Photo</label>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  style={{ display: "none" }}
                  aria-label="Upload photo file"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)} />
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Click or press enter to upload photo"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  style={{ border: `2px dashed ${isDragging ? "#FEE101" : "rgba(154,201,95,0.35)"}`, background: isDragging ? "rgba(254,225,1,0.04)" : "rgba(0,0,0,0.2)", padding: "28px 20px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transition: "border-color 0.2s, background-color 0.2s", outline: "none" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FEE101")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(154,201,95,0.35)")}
                >
                  {form.photoUrl ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.photoUrl} alt="Photo preview" style={{ width: 64, height: 64, objectFit: "contain", background: "rgba(0,0,0,0.4)", border: "2px solid #9ac95f" }} />
                      <div>
                        <div style={{ color: "#9ac95f", fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: 2 }}>Photo Uploaded ✓</div>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: "sans-serif", fontSize: 11, marginTop: 4 }}>Tap or press Enter to change</div>
                        <div style={{ color: "rgba(154,201,95,0.5)", fontFamily: "sans-serif", fontSize: 10, marginTop: 2 }}>Drag or touch to reposition on preview</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ac95f" strokeWidth={1.5} aria-hidden="true">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: "#FEE101", fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>Click or drag to upload</div>
                        <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif", fontSize: 11, marginTop: 4 }}>JPG · PNG · WEBP · HEIC (iPhone)</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── LIVE PREVIEW + ACTIONS ── */}
            <div className="w-full flex flex-col items-center gap-4 lg:sticky lg:top-8">
              <div style={{ fontFamily: "Anton, sans-serif", fontSize: 11, letterSpacing: 4, color: "#9ac95f", textTransform: "uppercase" }}>── Live Preview ──</div>

              {/*
               * Card wrapper — JS-driven scaling via ResizeObserver.
               * The wrapper's height matches the card's visual height after scaling
               * so the surrounding layout collapses correctly.
               * The inner div applies the scale transform from top-center.
               */}
              <div
                ref={cardWrapperRef}
                className="card-scale-wrapper"
                style={{ height: `${Math.round(620 * cardScale)}px` }}
              >
                <div
                  className="card-scale-target"
                  style={{ transform: `scale(${cardScale})` }}
                >
                  <IDCard
                    {...preview}
                    interactive={true}
                    photoTransform={photoTransform}
                    onPhotoTransformChange={setPhotoTransform}
                    scaleHint={cardScale}
                  />
                </div>
              </div>

              {/* Zoom slider */}
              {form.photoUrl && (
                <div style={{ width: "100%", padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label htmlFor="zoom-slider" style={{ color: "#9ac95f", fontFamily: "sans-serif", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>Zoom</label>
                    <input
                      id="zoom-slider"
                      type="range"
                      min={100}
                      max={500}
                      step={5}
                      aria-label="Adjust photo zoom scale"
                      value={Math.round(photoTransform.scale * 100)}
                      onChange={(e) => setPhotoTransform((p) => ({ ...p, scale: Number(e.target.value) / 100 }))}
                      style={{ flex: 1, accentColor: "#FEE101", cursor: "pointer" }}
                    />
                    <span style={{ color: "#FEE101", fontFamily: "Anton, sans-serif", fontSize: 12, minWidth: 36, textAlign: "right" }}>
                      {Math.round(photoTransform.scale * 100)}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoTransform({ scale: 1, x: 0, y: 0 })}
                    style={{ marginTop: 6, fontFamily: "sans-serif", fontSize: 10, color: "rgba(154,201,95,0.6)", background: "none", border: "none", cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", padding: 0 }}
                  >
                    Reset position
                  </button>
                </div>
              )}

              {/* Download + Share buttons */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  onClick={downloadCard}
                  disabled={isExporting}
                  aria-busy={isExporting}
                  style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: 3, textTransform: "uppercase", padding: "14px 20px", background: "#FEE101", color: "#030a04", border: "2px solid #FEE101", cursor: isExporting ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: isExporting ? 0.6 : 1, transition: "all 0.15s" }}
                  onMouseEnter={(e) => { if (!isExporting) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#FEE101"; } }}
                  onMouseLeave={(e) => { if (!isExporting) { e.currentTarget.style.background = "#FEE101"; e.currentTarget.style.color = "#030a04"; } }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PNG
                </button>

                <button
                  type="button"
                  onClick={shareOnX}
                  disabled={isExporting}
                  aria-busy={isExporting}
                  style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: 3, textTransform: "uppercase", padding: "14px 20px", background: "#000", color: "#fff", border: "2px solid rgba(255,255,255,0.2)", cursor: isExporting ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: isExporting ? 0.6 : 1, transition: "all 0.15s" }}
                  onMouseEnter={(e) => { if (!isExporting) { e.currentTarget.style.borderColor = "#fff"; } }}
                  onMouseLeave={(e) => { if (!isExporting) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; } }}
                >
                  <XIcon />
                  Share on X
                </button>
              </div>

              {/* Status message */}
              {exportStatus && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{ fontFamily: "sans-serif", fontSize: 12, color: "#9ac95f", letterSpacing: 1, textAlign: "center", padding: "8px 16px", border: "1px solid rgba(154,201,95,0.4)", background: "rgba(154,201,95,0.08)", width: "100%", borderRadius: 2 }}
                >
                  {exportStatus}
                </div>
              )}

              <p style={{ fontFamily: "sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", margin: 0, lineHeight: 1.7 }}>
                Preview updates as you type.<br />
                Touch or drag to adjust photo position.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: "#020705", borderTop: "2px solid rgba(154,201,95,0.15)", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 22, color: "#FEE101", letterSpacing: 4, textTransform: "uppercase", textShadow: "2px 2px 0 #000" }}>HACKER HOUSE GOA</div>
        <div style={{ fontFamily: "sans-serif", fontSize: 11, color: "rgba(154,201,95,0.4)", marginTop: 8, letterSpacing: 3, textTransform: "uppercase" }}>2:47PM STUDIO • 2026</div>
      </footer>

      {/* ═══ HIDDEN EXPORT CONTAINER ═══ */}
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none", top: 0, left: 0 }}>
        <div
          ref={exportRef}
          aria-hidden="true"
          style={{
            position: "relative",
            width: 800,
            height: 1120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "#060f08",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={typeof window !== "undefined" ? `${window.location.origin}/id/green-bg.webp` : "/id/green-bg.webp"}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={typeof window !== "undefined" ? `${window.location.origin}/id/trans-bg.png` : "/id/trans-bg.png"}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }}
          />
          <div style={{ position: "relative", transform: "scale(1.45)", transformOrigin: "center" }}>
            <IDCard
              {...preview}
              photoTransform={photoTransform}
              forExport={true}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
