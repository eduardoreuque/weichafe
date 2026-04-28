import type { Metadata } from "next";
import { Nunito, Oswald } from "next/font/google";
import "./globals.css";

const bodyFont = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weichafe | Gestion Academia",
  description: "App de alumnos, mensualidades, clases diarias y comprobantes.",
  icons: {
    icon: "/logo-weichafe-2026.png",
    apple: "/logo-weichafe-2026.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
