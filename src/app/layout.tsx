import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FindBetter – Trusted Swiss Healthcare & Insurance Platform",
  description:
    "FindBetter helps individuals and families in Switzerland compare, choose, and manage the best healthcare insurance plans. Get transparent comparisons, expert insights, and secure online switching to save on your health premiums.",
  keywords: [
    "Swiss health insurance",
    "Switzerland healthcare",
    "compare health insurance",
    "Swiss medical insurance",
    "KVG insurance platform",
    "Swiss health plans",
    "findbetter",
    "affordable Swiss health insurance",
  ],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "FindBetter – Trusted Swiss Healthcare & Insurance Platform",
    description:
      "FindBetter simplifies Swiss healthcare insurance. Compare plans, manage policies, and make informed health coverage decisions with ease.",
    url: "https://findbetter.ch",
    siteName: "FindBetter",
    images: [
      {
        url: "/favicon.png",
        width: 512,
        height: 512,
        alt: "FindBetter Logo",
      },
    ],
    locale: "en_CH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FindBetter – Swiss Healthcare & Insurance Platform",
    description:
      "Compare, choose, and manage Swiss health insurance easily with FindBetter.",
    images: ["/favicon.png"],
  },
  metadataBase: new URL("https://findbetter.ch"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
