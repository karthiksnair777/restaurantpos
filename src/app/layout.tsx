import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flavour Kitchen - Restaurant POS",
  description: "Complete Restaurant POS System with QR Ordering, Kitchen Display, and Billing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
