import type { Metadata } from "next";
import { Be_Vietnam_Pro, Quicksand } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const body = Be_Vietnam_Pro({
  variable: "--font-bevn",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const display = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vocab — Học từ vựng tiếng Anh theo chủ đề",
  description: "Học từ vựng tiếng Anh theo chủ đề với flashcard, lặp lại ngắt quãng và bài kiểm tra.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6">{children}</main>
        <footer className="pb-8 text-center text-xs text-muted">
          Made with 💗 — “Even the star waits for you.”
        </footer>
      </body>
    </html>
  );
}
