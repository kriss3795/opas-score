import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/client/store";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Opa's Score",
  description: "Football, Formule 1 et tous tes sports, rien que pour toi.",
  appleWebApp: { capable: true, title: "Opa's Score", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0D12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="antialiased">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
