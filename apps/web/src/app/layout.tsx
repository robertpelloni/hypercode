import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Borg",
    template: "%s | Borg",
  },
  description: "Local AI operations control plane for MCP routing, provider fallback, session supervision, and a unified dashboard.",
};

import { TRPCProvider } from "../utils/TRPCProvider";
import { Toaster } from "@borg/ui";
import { Navigation } from "../components/Navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCProvider>
          <div className="flex flex-col min-h-screen">
            <Navigation />
            <div className="flex-1 overflow-auto min-w-0">
              {children}
            </div>
          </div>
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  );
}
