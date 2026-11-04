import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = {
  title: {
    default: "Resellerku | Owner Command Center",
    template: "%s · Resellerku",
  },
  description: "Business owner dashboard untuk mengelola pesanan, katalog, dan marketing assets Resellerku.",
  applicationName: "Resellerku",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
