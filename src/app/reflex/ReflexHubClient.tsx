"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  type ReflexCategory,
  type ReflexUnit,
  REFLEX_BOOKS,
  type ReflexBook,
} from "@/lib/reflex";

interface UnitProgressMeta {
  unitNumber: number;
  completedCount: number;
  bookmarkedCount: number;
  lastPracticedAt: string | null;
  bestScore: number | null;
}

interface ReflexHubClientProps {
  categories1500: ReflexCategory[];
  categories1000: ReflexCategory[];
  units: ReflexUnit[];
  progressMap: Record<number, UnitProgressMeta>;
  totalPracticedSentences: number;
  totalBookmarkedSentences: number;
}

export default function ReflexHubClient({
  categories1500,
  categories1000,
  units,
  progressMap,
  totalPracticedSentences,
  totalBookmarkedSentences,
}: ReflexHubClientProps) {
  const [activeBookId, setActiveBookId] = useState<"1500" | "1000">("1500");
  const [selectedCatId, setSelectedCatId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeBook = REFLEX_BOOKS.find((b) => b.id === activeBookId) || REFLEX_BOOKS[0];
  const activeCategories = activeBookId === "1500" ? categories1500 : categories1000;

  // Filter units of the active book
  const bookUnits = useMemo(() => {
    return units.filter((u) => u.bookId === activeBookId);
  }, [units, activeBookId]);

  // Compute stats for active book
  const bookStats = useMemo(() => {
    let practiced = 0;
    let bookmarked = 0;
    let wrong = 0;

    for (const u of bookUnits) {
      const prog = progressMap[u.unitNumber];
      if (prog) {
        practiced += prog.completedCount;
        bookmarked += prog.bookmarkedCount;
        if (prog.bestScore !== null && prog.bestScore < 80) {
          wrong += 1;
        }
      }
    }

    return {
      total: activeBook.totalSentences,
      practiced,
      pct: Math.round((practiced / Math.max(1, activeBook.totalSentences)) * 100),
      bookmarked,
      wrong,
    };
  }, [bookUnits, progressMap, activeBook]);

  // Filtered units based on category & search query
  const filteredUnits = useMemo(() => {
    return bookUnits.filter((u) => {
      // Category filter
      if (selectedCatId !== "all" && u.categoryId !== selectedCatId) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTitle =
        u.title.toLowerCase().includes(q) ||
        u.engTitle.toLowerCase().includes(q) ||
        (u.viTitle && u.viTitle.toLowerCase().includes(q));
      if (inTitle) return true;

      // Search inside unit sentences
      return u.sentences.some(
        (s) => s.vi.toLowerCase().includes(q) || s.en.toLowerCase().includes(q)
      );
    });
  }, [bookUnits, selectedCatId, searchQuery]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* ============================================================== */}
      {/* MENU DỌC BÊN TRÁI (LEFT SIDEBAR) */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-72 shrink-0 space-y-4 lg:sticky lg:top-20">
        {/* Card 1: Chọn Bộ Giáo Trình Phản Xạ */}
        <div className="card !p-4 border-petal-200 shadow-soft">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            📚 Bộ tài liệu phản xạ
          </p>

          <div className="space-y-1.5">
            {REFLEX_BOOKS.map((b) => {
              const isSelected = activeBookId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setActiveBookId(b.id);
                    setSelectedCatId("all");
                    setSearchQuery("");
                  }}
                  className={`w-full text-left rounded-xl p-3 transition flex items-start gap-3 ${
                    isSelected
                      ? "bg-gradient-to-r from-petal-500 to-petal-600 text-white shadow-soft"
                      : "bg-slate-50 hover:bg-petal-50/70 text-slate-700 hover:text-petal-700"
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{b.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-sm ${isSelected ? "text-white" : "text-slate-800"}`}>
                      {b.title}
                    </p>
                    <p className={`text-[11px] mt-0.5 line-clamp-1 ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                      {b.badge}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: Danh Mục Chủ Đề Theo Chiều Dọc */}
        <div className="card !p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              📂 Danh mục chủ đề
            </p>
            <span className="text-[11px] text-muted">
              {bookUnits.length} {activeBookId === "1500" ? "Unit" : "Chủ đề"}
            </span>
          </div>

          <nav className="space-y-1 text-sm font-medium">
            <button
              onClick={() => setSelectedCatId("all")}
              className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                selectedCatId === "all"
                  ? "bg-petal-100 text-petal-800 font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>📋 Tất cả chủ đề</span>
              <span className="chip text-[10px] bg-white/80 py-0.5 px-1.5">{bookUnits.length}</span>
            </button>

            {activeCategories.map((cat) => {
              const isSelected = selectedCatId === cat.id;
              const catUnitCount = bookUnits.filter((u) => u.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                    isSelected
                      ? "bg-petal-100 text-petal-800 font-bold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="chip text-[10px] bg-white/80 py-0.5 px-1.5 shrink-0">
                    {catUnitCount}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Card 3: Tiện Ích Luyện Tập */}
        <div className="card !p-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            ⚡ Lối tắt luyện tập
          </p>

          <Link
            href="/reflex/mixed"
            className="flex items-center gap-2.5 rounded-xl p-2.5 text-xs font-semibold text-slate-700 hover:bg-petal-50 hover:text-petal-700 transition border border-slate-100 hover:border-petal-200"
          >
            <span className="text-base">🎲</span>
            <div>
              <p>Thử thách ngẫu nhiên</p>
              <p className="text-[10px] text-muted font-normal">Trộn 30 câu ngẫu nhiên</p>
            </div>
          </Link>

          <Link
            href="/reflex/bookmarked"
            className="flex items-center gap-2.5 rounded-xl p-2.5 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition border border-slate-100 hover:border-amber-200"
          >
            <span className="text-base">⭐</span>
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p>Câu đã đánh dấu</p>
                <p className="text-[10px] text-muted font-normal">Gom riêng để rèn thêm</p>
              </div>
              {totalBookmarkedSentences > 0 && (
                <span className="chip text-[10px] bg-amber-100 text-amber-800 font-bold">
                  {totalBookmarkedSentences}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Card 4: Tiến độ bộ sách đang học */}
        <div className="card !p-4 bg-gradient-to-br from-petal-50/50 to-white">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
            <span>Tiến độ bộ {activeBook.id} câu</span>
            <span className="text-petal-600">{bookStats.pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-petal-400 to-petal-600 transition-all duration-300"
              style={{ width: `${bookStats.pct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 text-center">
            Đã luyện <b className="text-slate-800">{bookStats.practiced}</b> / {bookStats.total} câu
          </p>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* VÙNG NỘI DUNG CHÍNH BÊN PHẢI (MAIN CONTENT) */}
      {/* ============================================================== */}
      <main className="flex-1 min-w-0 space-y-6 w-full">
        {/* Banner Bộ Sách Hiện Tại */}
        <section className="card relative overflow-hidden !p-6 sm:!p-8">
          <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-petal-200/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-petal-100 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="chip bg-petal-100 text-petal-700 font-bold">
                  {activeBook.icon} {activeBook.badge}
                </span>
                <span className="text-xs text-muted">Có Audio bản xứ en-US</span>
              </div>
              <h1 className="h-display mt-2 text-2xl sm:text-3xl text-slate-900 font-bold">
                {activeBook.title}
              </h1>
              <p className="mt-1.5 max-w-xl text-slate-600 text-xs sm:text-sm leading-relaxed">
                {activeBook.subtitle}. Luyện tập với 4 chế độ: Gõ kiểm tra diff, Nói qua Micro, Thẻ rảnh tay & Ghép từ.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/reflex/mixed" className="btn text-xs !py-2.5 !px-4">
                🎲 Luyện ngẫu nhiên
              </Link>
            </div>
          </div>
        </section>

        {/* Thanh Tìm Kiếm */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Tìm kiếm trong ${bookUnits.length} bài học của ${activeBook.title}...`}
            className="w-full rounded-2xl border border-petal-200 bg-white px-5 py-3.5 pl-11 text-sm text-slate-900 shadow-soft placeholder:text-slate-400 focus:border-petal-500 focus:outline-none focus:ring-4 focus:ring-petal-100 transition"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕ Xóa
            </button>
          )}
        </div>

        {/* Danh Sách Unit Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredUnits.map((u) => {
            const progress = progressMap[u.unitNumber] || {
              completedCount: 0,
              bookmarkedCount: 0,
              lastPracticedAt: null,
              bestScore: null,
            };
            const pct = Math.round((progress.completedCount / u.sentencesCount) * 100);

            return (
              <div
                key={u.unitNumber}
                className="card flex flex-col justify-between !p-5 transition hover:border-petal-300 hover:shadow-md group"
              >
                <div>
                  {/* Header: Unit badge & Tags */}
                  <div className="flex items-center justify-between">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-petal-100 text-xs font-bold text-petal-700">
                      {activeBookId === "1500" ? `U${u.unitNumber}` : `CĐ${u.topicIndex || u.unitNumber - 100}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {progress.bookmarkedCount > 0 && (
                        <span className="text-xs text-amber-500 font-bold" title="Có câu đánh dấu sao">
                          ⭐ {progress.bookmarkedCount}
                        </span>
                      )}
                      <span className="chip text-[11px] font-medium bg-slate-100 text-slate-600">
                        {u.sentencesCount} câu
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="h-display mt-3 text-base font-bold text-slate-900 group-hover:text-petal-600 transition leading-snug">
                    {u.engTitle}
                  </h3>
                  {u.viTitle && (
                    <p className="mt-0.5 text-xs font-medium text-slate-500 line-clamp-1">
                      {u.viTitle}
                    </p>
                  )}

                  {/* Sample first sentence */}
                  <p className="mt-3 text-xs text-slate-400 italic line-clamp-1">
                    “{u.sentences[0]?.vi}”
                  </p>
                </div>

                {/* Progress bar & CTA */}
                <div className="mt-5 space-y-3 pt-3 border-t border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Tiến độ: {progress.completedCount}/{u.sentencesCount} câu
                      </span>
                      <span className="font-semibold text-petal-600">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-petal-400 to-petal-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/reflex/${u.unitNumber}`}
                    className="btn-soft w-full justify-center !py-2 text-xs font-semibold group-hover:bg-petal-600 group-hover:text-white transition"
                  >
                    ⚡ Vào luyện phản xạ
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredUnits.length === 0 && (
          <div className="card text-center !p-12">
            <p className="text-3xl">🔍</p>
            <p className="mt-2 text-base font-bold text-slate-700">Không tìm thấy bài học nào phù hợp</p>
            <p className="mt-1 text-xs text-slate-400">Hãy thử tìm từ khóa khác nhé.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCatId("all");
              }}
              className="btn-soft mt-4 !py-1.5 !px-4 text-xs"
            >
              Xem lại tất cả bài học
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
