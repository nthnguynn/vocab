import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deletePassage, restoreDefaultPassages } from "@/app/actions";
import SpeakButton from "@/components/SpeakButton";
import DeleteButton from "@/components/DeleteButton";
import type { Prisma } from "@/generated/prisma/client";

interface SearchParams {
  q?: string;
  topic?: string;
  level?: string;
  sort?: string;
}

export default async function PassagesPage(props: { searchParams: Promise<SearchParams> }) {
  await connection();

  const sp = await props.searchParams;
  const q = sp.q?.trim();
  const topic = Number(sp.topic) || undefined;
  const level = sp.level?.trim();
  const sort = sp.sort ?? "new";

  const where: Prisma.PassageWhereInput = {
    ...(topic && { topicId: topic }),
    ...(level && { level }),
    ...(q && {
      OR: [
        { title: { contains: q } },
        { content: { contains: q } },
        { translation: { contains: q } },
        { tags: { contains: q } },
      ],
    }),
  };

  const [topics, passages, totalSessions] = await Promise.all([
    prisma.topic.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, emoji: true } }),
    prisma.passage.findMany({
      where,
      include: {
        topic: { select: { id: true, name: true, emoji: true } },
      },
      orderBy:
        sort === "az"
          ? { title: "asc" }
          : sort === "practiced"
          ? { timesPracticed: "desc" }
          : sort === "score"
          ? { bestScore: "desc" }
          : { createdAt: "desc" },
    }),
    prisma.passageSession.count(),
  ]);

  const practicedCount = passages.filter((p) => p.timesPracticed > 0).length;
  const averageScore = passages.length
    ? Math.round(
        passages.reduce((acc, p) => acc + (p.bestScore ?? 0), 0) /
          Math.max(1, passages.filter((p) => p.bestScore !== null).length)
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <section className="card relative overflow-hidden !p-7 sm:!p-9">
        <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-petal-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-petal-100 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📜</span>
              <span className="chip">Luyện học thuộc đoạn văn</span>
            </div>
            <h1 className="h-display mt-2 text-3xl sm:text-4xl">Studio Học Thuộc Đoạn Văn 🌷</h1>
            <p className="mt-2 max-w-2xl text-muted leading-relaxed">
              Ứng dụng 5 phương pháp khoa học: <strong>Luyện nghe Shadowing</strong>, <strong>Biến mất dần (Disappearing Text)</strong>, <strong>Gõ phản xạ tốc độ</strong>, <strong>Ghép câu</strong> và <strong>Tự kiểm tra đối chiếu (Smart Diff)</strong> giúp bạn nhớ sâu, nhớ lâu mọi đoạn văn tiếng Anh.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/passages/new" className="btn">
              ＋ Thêm đoạn văn mới
            </Link>
          </div>
        </div>
      </section>

      {/* Overview Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card flex items-center gap-3 !p-4">
          <span className="text-2xl">📚</span>
          <div>
            <p className="text-xs font-semibold text-muted uppercase">Tổng số đoạn</p>
            <p className="font-display text-2xl font-bold text-ink">{passages.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 !p-4">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-xs font-semibold text-muted uppercase">Đã luyện tập</p>
            <p className="font-display text-2xl font-bold text-petal-600">
              {practicedCount}/{passages.length}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 !p-4">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-xs font-semibold text-muted uppercase">Lượt luyện tập</p>
            <p className="font-display text-2xl font-bold text-ink">{totalSessions}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 !p-4">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-xs font-semibold text-muted uppercase">Điểm cao TB</p>
            <p className="font-display text-2xl font-bold text-mint">{averageScore}%</p>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="card">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1.2fr_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="q">
              Tìm kiếm
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Tiêu đề, nội dung, bản dịch hoặc tag..."
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="topic">
              Chủ đề
            </label>
            <select id="topic" name="topic" defaultValue={topic ?? ""} className="input">
              <option value="">Tất cả chủ đề</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="level">
              Trình độ
            </label>
            <select id="level" name="level" defaultValue={level ?? ""} className="input">
              <option value="">Tất cả</option>
              <option value="Beginner">Cơ bản</option>
              <option value="Intermediate">Trung cấp</option>
              <option value="Advanced">Nâng cao</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="sort">
              Sắp xếp
            </label>
            <select id="sort" name="sort" defaultValue={sort} className="input">
              <option value="new">Mới nhất</option>
              <option value="practiced">Luyện nhiều nhất</option>
              <option value="score">Điểm số cao nhất</option>
              <option value="az">A → Z theo tiêu đề</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn !w-full">
              Lọc
            </button>
            {(q || topic || level || sort !== "new") && (
              <Link href="/passages" className="btn-ghost" title="Xóa bộ lọc">
                Đặt lại
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Passages Grid */}
      <section>
        {passages.length === 0 ? (
          <div className="card !p-12 text-center">
            <span className="text-4xl">🌷</span>
            <h3 className="h-display mt-3 text-xl">Không tìm thấy đoạn văn nào</h3>
            <p className="mt-1 text-sm text-muted">
              Bạn có thể tạo đoạn văn mới hoặc nạp lại bộ 6 bài mẫu chất lượng cao.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/passages/new" className="btn">
                ＋ Thêm đoạn văn mới
              </Link>
              <form action={restoreDefaultPassages}>
                <button type="submit" className="btn-soft cursor-pointer">
                  📥 Nạp lại 6 bài mẫu mặc định
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {passages.map((p) => {
              const words = p.content.trim().split(/\s+/).filter(Boolean).length;
              const estSeconds = Math.max(10, Math.round((words / 130) * 60));

              return (
                <div
                  key={p.id}
                  className="card flex flex-col justify-between transition-all hover:border-petal-300 hover:shadow-pop"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="h-display text-lg font-bold text-ink hover:text-petal-600 transition">
                            <Link href={`/passages/${p.id}`}>{p.title}</Link>
                          </h2>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              p.level === "Beginner"
                                ? "bg-mint/15 text-mint"
                                : p.level === "Advanced"
                                ? "bg-berry/15 text-berry"
                                : "bg-petal-100 text-petal-700"
                            }`}
                          >
                            {p.level === "Beginner"
                              ? "Cơ bản"
                              : p.level === "Advanced"
                              ? "Nâng cao"
                              : "Trung cấp"}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          {p.topic && (
                            <span className="chip text-[11px]">
                              {p.topic.emoji} {p.topic.name}
                            </span>
                          )}
                          <span>{words} từ</span>
                          <span>·</span>
                          <span>~{estSeconds}s đọc</span>
                          {p.tags && (
                            <>
                              <span>·</span>
                              <span className="italic text-muted/80">{p.tags}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <SpeakButton text={p.content} className="size-8 text-xs shrink-0" />
                    </div>

                    <p className="line-clamp-3 text-sm text-ink/80 leading-relaxed font-sans">
                      {p.content}
                    </p>

                    {p.translation && (
                      <p className="line-clamp-2 text-xs text-muted/90 italic border-l-2 border-petal-200 pl-2">
                        {p.translation}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-petal-100 pt-3 text-xs">
                    <div className="flex items-center gap-2 text-muted">
                      <span>Luyện: <strong className="text-ink">{p.timesPracticed}</strong> lần</span>
                      {p.bestScore !== null && (
                        <span>
                          · Điểm: <strong className="text-mint">{p.bestScore}%</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/passages/${p.id}/edit`}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:bg-petal-100 hover:text-petal-700 transition"
                      >
                        Sửa
                      </Link>
                      <DeleteButton
                        onDelete={deletePassage.bind(null, p.id)}
                        confirmText={`Bạn có chắc muốn xoá đoạn văn “${p.title}”?`}
                        label="🗑️"
                        className="rounded-full px-2 py-1 text-xs text-muted hover:bg-petal-100 hover:!text-berry transition"
                      />
                      <Link href={`/passages/${p.id}`} className="btn !px-4 !py-1.5 text-xs">
                        Luyện ngay 🚀
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
