import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Genshin Pickban",
  description: "Сайт для батлів по Геншину. Драфти, піки, бани, хрести -- все на місці",
  openGraph: {
    title: "Genshin Pickban",
    description: "Сайт для батлів по Геншину. Драфти, піки, бани, хрести -- все на місці",
  },
  twitter: {
    card: "summary",
    title: "Genshin Pickban",
    description: "Сайт для батлів по Геншину. Драфти, піки, бани, хрести -- все на місці",
  },
  icons: {
    icon: "/icon.jpg?v=2",
    shortcut: "/icon.jpg?v=2",
    apple: "/icon.jpg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={rubik.className}>
      <body>{children}</body>
    </html>
  );
}
