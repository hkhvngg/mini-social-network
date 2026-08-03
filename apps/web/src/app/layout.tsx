import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!siteUrl) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SITE_URL");
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: { icon: "/logo.png", apple: "/logo.png" },
  title: "Misonet — Có chuyện gì, mình kể nhau nghe",
  description:
    "Giữ liên lạc với người bạn quý và chia sẻ những điều gần gũi mỗi ngày.",
  openGraph: {
    title: "Misonet — Có chuyện gì, mình kể nhau nghe",
    description:
      "Giữ liên lạc với người bạn quý và chia sẻ những điều gần gũi mỗi ngày.",
    type: "website",
    locale: "vi_VN",
    images: [
      {
        url: "/og.png",
        width: 1792,
        height: 933,
        alt: "Misonet — Có chuyện gì, mình kể nhau nghe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Misonet — Có chuyện gì, mình kể nhau nghe",
    description:
      "Giữ liên lạc với người bạn quý và chia sẻ những điều gần gũi mỗi ngày.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
