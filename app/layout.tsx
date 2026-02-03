// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
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
      <head>
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-o9N1j7kGStb6u3g1p1u0uWb1Qp8p8GqWQxXkGkP6u3s="
          crossOrigin=""
        />
      </head>
      <body className="font-sans antialiased"><AutoUpdate />{children}</body>
    </html>
  );
}
