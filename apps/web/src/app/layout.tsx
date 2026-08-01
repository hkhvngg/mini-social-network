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
  title: "Misonet — Mạng xã hội đồ thị",
  description:
    "Kết nối bạn bè, chia sẻ khoảnh khắc và khám phá những mối quan hệ chung.",
  openGraph: {
    title: "Misonet — Mỗi kết nối, một câu chuyện mới",
    description:
      "Kết nối bạn bè, chia sẻ khoảnh khắc và khám phá những mối quan hệ chung.",
    type: "website",
    locale: "vi_VN",
    images: [
      {
        url: "/og.png",
        width: 1792,
        height: 933,
        alt: "Misonet — Mỗi kết nối, một câu chuyện mới",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Misonet — Mỗi kết nối, một câu chuyện mới",
    description:
      "Kết nối bạn bè, chia sẻ khoảnh khắc và khám phá những mối quan hệ chung.",
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
