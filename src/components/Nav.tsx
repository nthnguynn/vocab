"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Tổng quan", icon: "🏠" },
  { href: "/topics", label: "Chủ đề", icon: "🌷" },
  { href: "/words", label: "Từ vựng", icon: "📒" },
  { href: "/passages", label: "Đoạn văn", icon: "📜" },
  { href: "/review", label: "Ôn tập", icon: "🔁" },
  { href: "/test", label: "Kiểm tra", icon: "✍️" },
  { href: "/import", label: "Nhập Sheet", icon: "📥" },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-petal-100 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2" aria-label="Vocab — Trang chủ">
          <Logo className="size-11 drop-shadow-[0_4px_8px_rgb(226_58_115/0.3)] transition group-hover:-rotate-6 group-hover:scale-105" />
          <span className="hidden font-display text-xl font-bold tracking-tight text-petal-600 sm:inline">Vocab</span>
        </Link>
        <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                isActive(l.href)
                  ? "bg-petal-500 text-white shadow-soft"
                  : "text-muted hover:bg-petal-100 hover:text-petal-700"
              }`}
            >
              <span aria-hidden>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
