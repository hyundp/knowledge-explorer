import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { StarfieldBackground } from "@/components/StarfieldBackground";
import { PersonaProvider } from "@/components/persona/PersonaProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Space Biology Knowledge Explorer",
  description: "NASA Space Biology Knowledge Graph Dashboard - Explore 608 papers on spaceflight biology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PersonaProvider>
          <StarfieldBackground />
          <div className="flex h-screen overflow-hidden relative z-10">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-transparent">
              {children}
            </main>
          </div>
        </PersonaProvider>
      </body>
    </html>
  );
}
