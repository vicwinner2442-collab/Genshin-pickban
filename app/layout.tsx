import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genshin Pickban",
  description: "Драфтилка по Genshin",
  icons: {
    icon: "/icon.jpg",
    shortcut: "/icon.jpg",
    apple: "/icon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
