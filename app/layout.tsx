import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learn English from Sentences",
  description:
    "Analyze English sentences with multi-layer linguistic breakdown, color-coded grammar, and audio pronunciation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
