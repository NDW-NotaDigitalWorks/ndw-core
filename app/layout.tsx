// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css"; // ✅ Leaflet CSS (modo stabile)
import { AutoUpdate } from "@/components/AutoUpdate";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NDW — Nota Digital Works",
  description: "Tool premium che fanno risparmiare tempo e aumentano il guadagno.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="font-sans antialiased">
        <AutoUpdate />
        {children}
      </body>
    </html>
  );
}
