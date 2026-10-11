"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { type ReflexCategory, type ReflexUnit } from "@/lib/reflex";

interface UnitProgressMeta {
  unitNumber: number;
  completedCount: number;
  bookmarkedCount: number;
  lastPracticedAt: string | null;
  bestScore: number | null;
}

interface ReflexHubClientProps {
  categories: ReflexCategory[];
  units: ReflexUnit[];
  progressMap: Record<number, UnitProgressMeta>;
  totalPracticedSentences: number;
  totalBookmarkedSentences: number;
}

export default function ReflexHubClient({
  categories,
  units,
  progressMap,
  totalPracticedSentences,
  totalBookmarkedSentences,
}: ReflexHubClientProps) {
  const [selectedCatId, setSelectedCatId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered units based on category and search query
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      // Category filter
      if (selectedCatId !== "all" && u.categoryId !== selectedCatId) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTitle = u.title.toLowerCase().includes(q) || (u.viTitle && u.viTitle.toLowerCase().includes(q));
      if (inTitle) return true;

      // Search inside unit sentences
      const inSentences = u.sentences.some(
        (s) => s.vi.toLowerCase().includes(q) || s.en.toLowerCase().includes(q)
      );
      return inSentences;
    });
  }, [units, selectedCatId, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="card relative overflow-hidden !p-7 sm:!p-9">
        <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-petal-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-petal-100 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="chip bg-petal-100 text-petal-700 font-bold">
                ⚡ 1.500 Câu Phản Xạ
              </span>
              <span className="text-xs text-muted">Có Audio Bản Xứ (en-US)</span>
            </div>
            <h1 className="h-display mt-2 text-3xl sm:text-4xl text-slate-900">
              Luyện Phản Xạ Viết & Nói 🌸
            </h1>
            <p className="mt-2 max-w-xl text-slate-600 text-sm leading-relaxed">
              Rèn luyện tốc độ bật ra câu tiếng Anh chuẩn phản xạ tự nhiên. Hỗ trợ 4 chế độ: Gõ kiểm tra diff, Nói qua Micro, Thẻ rảnh tay & Ghép từ.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/reflex/mixed"
              className="btn flex items-center gap-1.5 shadow-sm"
              title="Luyện ngẫu nhiên 30 câu từ toàn bộ 50 Unit"
            >
              <span>🎲</span> Thử thách ngẫu nhiên
            </Link>
            {totalBookmarkedSentences > 0 && (
              <Link
                href="/reflex/bookmarked"
                className="btn-soft flex items-center gap-1.5"
                title="Luyện các câu đã gắn dấu sao"
              >
                <span>⭐</span> Đã đánh dấu ({totalBookmarkedSentences})
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Global Stats Overview */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card text-center !p-4">
          <p className="text-xs font-medium text-slate-500">Tổng số câu</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">1.500</p>
          <p className="text-[11px] text-muted">50 Unit toàn diện</p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-xs font-medium text-slate-500">Đã luyện tập</p>
          <p className="mt-1 text-2xl font-bold text-petal-600">{totalPracticedSentences}</p>
          <p className="text-[11px] text-muted">
            {Math.round((totalPracticedSentences / 1500) * 100)}% toàn bộ khoá
          </p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-xs font-medium text-slate-500">Câu khó / Đánh dấu</p>
          <p className="mt-1 text-2xl font-bold text-amber-500">{totalBookmarkedSentences}</p>
          <p className="text-[11px] text-muted">Cần rèn luyện thêm</p>
        </div>
        <div className="card text-center !p-4">
          <p className="text-xs font-medium text-slate-500">Chủ đề bài học</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">5</p>
          <p className="text-[11px] text-muted">Từ căn bản đến nâng cao</p>
        </div>
      </section>

      {/* Search and Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm Unit, từ vựng hoặc câu phản xạ (tiếng Việt hoặc tiếng Anh)..."
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

        {/* Categories Tabs */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
          <button
            onClick={() => setSelectedCatId("all")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              selectedCatId === "all"
                ? "bg-petal-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-petal-50 hover:text-petal-700 border border-slate-200"
            }`}
          >
            Tất cả 50 Unit ({units.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                selectedCatId === cat.id
                  ? "bg-petal-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-petal-50 hover:text-petal-700 border border-slate-200"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Units Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                {/* Header: Unit badge & Category */}
                <div className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-petal-100 text-xs font-bold text-petal-700">
                    U{u.unitNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {progress.bookmarkedCount > 0 && (
                      <span className="text-xs text-amber-500 font-bold" title="Có câu đánh dấu sao">
                        ⭐ {progress.bookmarkedCount}
                      </span>
                    )}
                    <span className="chip text-[11px] font-medium bg-slate-100 text-slate-600">
                      30 câu
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

              {/* Progress & CTA */}
              <div className="mt-5 space-y-3 pt-3 border-t border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Tiến độ: {progress.completedCount}/30 câu</span>
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
          <p className="mt-2 text-base font-bold text-slate-700">Không tìm thấy Unit nào phù hợp</p>
          <p className="mt-1 text-xs text-slate-400">Hãy thử tìm từ khóa khác nhé.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCatId("all");
            }}
            className="btn-soft mt-4 !py-1.5 !px-4 text-xs"
          >
            Xem lại tất cả Unit
          </button>
        </div>
      )}
    </div>
  );
}
