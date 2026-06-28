import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "PixelReel Studio – AI Image & Video Generator",
  description:
    "Create stunning AI-generated images and videos with FLUX Schnell and Kling. PixelReel Studio is the ultimate AI creative studio.",
  keywords: ["AI image generator", "AI video generator", "FLUX", "Kling", "text to video", "text to image"],
  openGraph: {
    title: "PixelReel Studio – AI Image & Video Generator",
    description: "Create stunning AI-generated images and videos in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
