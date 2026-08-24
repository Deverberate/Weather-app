import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyperlocal Pollution Monitor",
  description: "Real-time air quality monitoring dashboard using OpenAQ data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
