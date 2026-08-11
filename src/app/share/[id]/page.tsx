import type { Metadata } from "next";
import Image from "next/image";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * /share/[id]
 *
 * Public share page for a generated Hacker House Goa ID card.
 *
 * The page carries the correct Open Graph / Twitter Card meta tags so that
 * when this URL is pasted into X (Twitter), X's crawler fetches og:image and
 * displays the generated ID card as a "summary_large_image" preview card.
 *
 * The image itself lives on Cloudinary at a deterministic URL derived from
 * the share ID — no database lookup is required.
 *
 * Why a separate page and not a direct link to the PNG?
 *   X's link-preview crawler looks for HTML with OG meta tags.
 *   A direct link to a .png file does not produce a preview card on X.
 *   A page with twitter:card="summary_large_image" and twitter:image=<png URL>
 *   does produce the desired preview.
 */

/**
 * Constructs the Cloudinary CDN URL for a given share ID.
 * The upload route stores cards as: hh-goa-2026/<shareId>.png
 * Cloudinary's deterministic URL pattern means no database lookup is needed.
 */
function getCloudinaryImageUrl(id: string): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return "";
  // Cloudinary URL format: https://res.cloudinary.com/<cloud>/image/upload/<public_id>
  // The public_id includes the folder: hh-goa-2026/<shareId>
  return `https://res.cloudinary.com/${cloudName}/image/upload/hh-goa-2026/${id}.png`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const imageUrl = getCloudinaryImageUrl(id);

  const title = "Hacker House Goa 2026 — ID Card";
  const description =
    "Check out my official Hacker House Goa 2026 ID card! #HackerHouseGoa #HHGoa2026";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hhgoa-idgenerator.vercel.app";
  const pageUrl = `${siteUrl}/share/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "HH GOA ID Card Generator",
      images: [
        {
          url: imageUrl,
          width: 1600,  // 800px × pixelRatio 2
          height: 2240, // 1120px × pixelRatio 2
          alt: "Hacker House Goa 2026 ID Card",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    // Allow X's crawler to index this page.
    robots: { index: true, follow: false },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const imageUrl = getCloudinaryImageUrl(id) || null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#060f08",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "Anton, Impact, sans-serif",
      }}
    >
      {/* Branding */}
      <p
        style={{
          color: "#9ac95f",
          fontSize: 11,
          letterSpacing: 6,
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        HACKER HOUSE GOA · 2026
      </p>

      {/* Card image */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Hacker House Goa 2026 ID Card"
          width={400}
          height={560}
          priority
          style={{
            maxWidth: "90vw",
            height: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}
        />
      ) : (
        <p style={{ color: "#FEE101", fontSize: 16 }}>Card not found.</p>
      )}

      {/* CTA */}
      <a
        href="/"
        style={{
          marginTop: 32,
          color: "#FEE101",
          fontSize: 13,
          letterSpacing: 3,
          textTransform: "uppercase",
          textDecoration: "none",
          border: "2px solid #FEE101",
          padding: "12px 24px",
        }}
      >
        Generate Your Card →
      </a>
    </main>
  );
}
