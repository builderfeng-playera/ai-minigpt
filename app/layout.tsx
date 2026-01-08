import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI MiniGPT - ChatGPT Clone",
  description: "A ChatGPT clone built with Next.js and AI Builder API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

