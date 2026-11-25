import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { APP_CONFIG } from "@/config/constants";
import { siteConfig } from "@/config/site";
import { Theme } from "@/components/theme";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  icons: { icon: siteConfig.logo.light },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning style={{ "--primary": APP_CONFIG.primaryColor } as React.CSSProperties}>
      <body className="bg-background font-sans text-foreground antialiased">
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
