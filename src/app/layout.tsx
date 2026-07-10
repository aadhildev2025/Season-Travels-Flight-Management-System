import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Season Travels - Flight Management System",
  description: "Real-time departures, DST timezone conversion, passenger scheduling, and audit log manager.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
