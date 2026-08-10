// =============================================================================
//  Root Layout – wraps all pages with fonts, global CSS, and metadata
// =============================================================================
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgriMind – Decision Intelligence for Farming",
  description:
    "Real-time IoT sensor dashboard with AI-powered crop recommendations powered by IBM watsonx.ai",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
