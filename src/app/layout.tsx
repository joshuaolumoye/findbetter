import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Using Inter instead of Geist to avoid the build error
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Using JetBrains_Mono instead of Geist_Mono for better compatibility
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KVG Insurance Platform",
  description: "Swiss health insurance comparison and switching platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}