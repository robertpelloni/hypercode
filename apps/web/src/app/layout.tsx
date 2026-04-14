import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HyperCode",
    template: "%s | HyperCode",
  },
  description: "Local AI operations control plane for MCP routing, provider fallback, session supervision, and a unified dashboard.",
};

import { TRPCProvider } from "../utils/TRPCProvider";
import { Toaster, ProviderExhaustionBanner } from "@hypercode/ui";
import { Navigation } from "../components/Navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <TRPCProvider>
          <div className="flex flex-col min-h-screen">
            <Navigation />
            <div className="flex-1 overflow-auto min-w-0">
              {children}
            </div>
          </div>
          <Toaster />
          <ProviderExhaustionBanner />
        </TRPCProvider>
      </body>
    </html>
  );
}
