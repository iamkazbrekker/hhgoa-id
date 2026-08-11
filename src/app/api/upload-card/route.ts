import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/upload-card
 *
 * Accepts a multipart/form-data request containing the generated ID-card PNG
 * (field name: "file").  Uploads it to Cloudinary (public access) and
 * returns the secure Cloudinary URL plus a share ID so the client can
 * construct the /share/[id] page URL.
 *
 * Required environment variables (server-side only — never expose to browser):
 *   CLOUDINARY_CLOUD_NAME   — your Cloudinary cloud name
 *   CLOUDINARY_API_KEY      — your Cloudinary API key
 *   CLOUDINARY_API_SECRET   — your Cloudinary API secret  ← NEVER expose this
 *
 * Get them from: cloudinary.com → Dashboard → API Keys
 *
 * Why this endpoint exists:
 *   X's intent URL (x.com/intent/post?text=…) can only prefill post text.
 *   It cannot accept a data URL, blob URL, or any browser-local binary.
 *   X's crawler must be able to fetch og:image from a public HTTPS URL,
 *   which Cloudinary provides without any additional infrastructure.
 */

// Configure Cloudinary once at module load time using server-only env vars.
// These are read on the server; they are never sent to the browser.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: NextRequest) {
  // Pre-flight: verify all three credentials are present.
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error(
      "[upload-card] Cloudinary credentials are not configured. " +
        "Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET " +
        "to .env.local (dev) and Vercel environment variables (production)."
    );
    return NextResponse.json(
      {
        error:
          "Storage not configured. Add CLOUDINARY_CLOUD_NAME, " +
          "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing or invalid 'file' field" },
        { status: 400 }
      );
    }

    // Generate a unique share ID — this becomes the Cloudinary public_id
    // and the key used in /share/[id].
    const shareId = crypto.randomUUID();

    // Convert the Blob to a Buffer so we can upload it via the SDK.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary using the upload_stream helper wrapped in a Promise.
    // Folder: hh-goa-2026/  Public ID: <shareId>  (no user-provided name used)
    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              public_id: `hh-goa-2026/${shareId}`,
              resource_type: "image",
              format: "png",
              overwrite: false,
              // Do not apply any transformations — preserve the generated card exactly.
            },
            (error, result) => {
              if (error || !result) {
                reject(error ?? new Error("Cloudinary upload returned no result"));
              } else {
                resolve(result as { secure_url: string });
              }
            }
          )
          .end(buffer);
      }
    );

    return NextResponse.json({
      // imageUrl is the full Cloudinary CDN URL — used by the share page for og:image.
      imageUrl: result.secure_url,
      // shareId is what the client uses to build /share/<shareId>.
      shareId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Do NOT include Cloudinary credentials in the error message.
    console.error("[upload-card] Cloudinary upload error:", message);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
