import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWord } from "@/app/actions";
import { addDays, parseDayKey } from "@/lib/dates";
import WordForm from "@/components/WordForm";
import WordTable from "@/components/WordTable";
import type { Prisma } from "@/generated/prisma/client";

export default async function WordsPage(props: PageProps<"/words">) {
  await connection();
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const q = one("q")?.trim();
  const topic = Number(one("topic")) || undefined;
  const from = parseDayKey(one("from"));
  const to = parseDayKey(one("to"));
  const sort = one("sort") ?? "new";

  const where: Prisma.WordWhereInput = {
    ...(topic && { topicId: topic }),
    ...(q && { OR: [{ word: { contains: q } }, { meaning: { contains: q } }] }),
    ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lt: addDays(to, 1) }) } }),
  };

  const [topics, words] = await Promise.all([
    prisma.topic.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, emoji: true } }),
    prisma.word.findMany({
      where,
      include: { topic: { select: { id: true, name: true, emoji: true } } },
      orderBy: sort === "az" ? { word: "asc" } : sort === "old" ? { createdAt: "asc" } : { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl">Từ vựng 📒</h1>
        <p className="mt-1 text-muted">Thêm từ mới và tra cứu lại toàn bộ sổ từ của bạn.</p>
      </div>

      <section className="card">
        <h2 className="h-display mb-4 text-lg">＋ Thêm từ mới</h2>
        <WordForm action={createWord} topics={topics} compact />
      </section>

      <section className="space-y-3">
        <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.3fr_1fr_1fr_1fr_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="q">Tìm kiếm</label>
            <input id="q" name="q" defaultValue={q} placeholder="Từ hoặc nghĩa…" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="topic">Chủ đề</label>
            <select id="topic" name="topic" defaultValue={topic ?? ""} className="input">
              <option value="">Tất cả</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="from">Từ ngày</label>
            <input id="from" type="date" name="from" defaultValue={one("from")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="to">Đến ngày</label>
            <input id="to" type="date" name="to" defaultValue={one("to")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="sort">Sắp xếp</label>
            <select id="sort" name="sort" defaultValue={sort} className="input">
              <option value="new">Mới nhất</option>
              <option value="old">Cũ nhất</option>
              <option value="az">A → Z</option>
            </select>
          </div>
          <button className="btn">Lọc</button>
        </form>
        <p className="px-1 text-sm text-muted">
          Tìm thấy <b className="text-petal-600">{words.length}</b> từ
        </p>
        <WordTable words={words} />
      </section>
    </div>
  );
}
