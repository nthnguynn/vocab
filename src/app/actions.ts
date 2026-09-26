"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nextReviewDate, MAX_STAGE } from "@/lib/dates";
import { extractWords, toCsvExportUrl } from "@/lib/sheet";

export type FormState = { ok?: boolean; error?: string; message?: string };

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

function refresh() {
  revalidatePath("/", "layout");
}

/* ---------------- Chủ đề ---------------- */

export async function createTopic(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  if (!name) return { error: "Hãy nhập tên chủ đề nhé 🌷" };
  const exists = await prisma.topic.findUnique({ where: { name } });
  if (exists) return { error: "Chủ đề này đã có rồi" };
  await prisma.topic.create({ data: { name, emoji: str(fd, "emoji") ?? "🌸" } });
  refresh();
  return { ok: true, message: `Đã tạo chủ đề “${name}”` };
}

export async function deleteTopic(id: number) {
  await prisma.topic.delete({ where: { id } });
  refresh();
  redirect("/topics");
}

/* ---------------- Từ vựng ---------------- */

async function wordData(fd: FormData) {
  const word = str(fd, "word");
  const meaning = str(fd, "meaning");
  if (!word || !meaning) return { error: "Từ vựng và nghĩa là bắt buộc" } as const;

  let topicId = Number(fd.get("topicId"));
  const newTopic = str(fd, "newTopic");
  if (newTopic) {
    const t = await prisma.topic.upsert({ where: { name: newTopic }, update: {}, create: { name: newTopic } });
    topicId = t.id;
  }
  if (!topicId) return { error: "Hãy chọn hoặc tạo một chủ đề" } as const;

  return {
    data: {
      word,
      meaning,
      topicId,
      type: str(fd, "type"),
      definition: str(fd, "definition"),
      example: str(fd, "example"),
      note: str(fd, "note"),
    },
  } as const;
}

export async function createWord(_: FormState, fd: FormData): Promise<FormState> {
  const res = await wordData(fd);
  if ("error" in res) return { error: res.error };
  await prisma.word.create({ data: { ...res.data, nextReviewAt: nextReviewDate(0) } });
  refresh();
  return { ok: true, message: `Đã thêm “${res.data.word}” 💖` };
}

export async function updateWord(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const res = await wordData(fd);
  if ("error" in res) return { error: res.error };
  await prisma.word.update({ where: { id }, data: res.data });
  refresh();
  redirect(`/topics/${res.data.topicId}`);
}

export async function deleteWord(id: number) {
  await prisma.word.delete({ where: { id } });
  refresh();
}

/* ---------------- Ôn tập & Test ---------------- */
// Không revalidate ở đây: các trang đều render động nên sẽ lấy số liệu mới khi điều hướng,
// đồng thời tránh làm render lại (và xáo lại) bộ thẻ/đề đang làm dở.

/** Ghi kết quả ôn flashcard: nhớ → lên cấp (1-2-4-7... ngày), quên → quay về mốc 1 ngày. */
export async function recordReview(wordId: number, remembered: boolean) {
  const w = await prisma.word.findUnique({ where: { id: wordId } });
  if (!w) return;
  const stage = remembered ? Math.min(w.stage + 1, MAX_STAGE) : 0;
  await prisma.$transaction([
    prisma.word.update({
      where: { id: wordId },
      data: {
        stage,
        lastReviewAt: new Date(),
        nextReviewAt: nextReviewDate(remembered ? stage : 0),
        ...(remembered ? { correctCount: { increment: 1 } } : { wrongCount: { increment: 1 } }),
      },
    }),
    prisma.quizAttempt.create({ data: { wordId, mode: "review", correct: remembered } }),
  ]);
}

export async function recordTestAnswer(wordId: number, answer: string, correct: boolean) {
  await prisma.$transaction([
    prisma.word.update({
      where: { id: wordId },
      data: correct
        ? { correctCount: { increment: 1 } }
        : { wrongCount: { increment: 1 }, stage: 0, nextReviewAt: nextReviewDate(0) },
    }),
    prisma.quizAttempt.create({ data: { wordId, mode: "test", correct, answer } }),
  ]);
}

/* ---------------- Nhập từ Google Sheets / file CSV ---------------- */

async function importCsv(csv: string): Promise<FormState> {
  const rows = extractWords(csv);
  if (!rows.length) return { error: "Không tìm thấy dòng tiêu đề có cột Word và Meaning" };

  let added = 0;
  let updated = 0;
  for (const { topic, createdAt, ...rest } of rows) {
    const t = await prisma.topic.upsert({ where: { name: topic }, update: {}, create: { name: topic } });
    const data = {
      word: rest.word,
      meaning: rest.meaning,
      type: rest.type ?? null,
      definition: rest.definition ?? null,
      example: rest.example ?? null,
      note: rest.note ?? null,
    };
    const existing = await prisma.word.findFirst({ where: { word: rest.word, topicId: t.id } });
    if (existing) {
      await prisma.word.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      const created = createdAt ?? new Date();
      await prisma.word.create({
        data: { ...data, topicId: t.id, createdAt: created, nextReviewAt: createdAt ? created : nextReviewDate(0) },
      });
      added++;
    }
  }
  refresh();
  return { ok: true, message: `Đã nhập ${added} từ mới, cập nhật ${updated} từ 🌸` };
}

export async function importFromSheet(_: FormState, fd: FormData): Promise<FormState> {
  const url = str(fd, "url");
  const csvUrl = url && toCsvExportUrl(url);
  if (!csvUrl) return { error: "Link Google Sheets không hợp lệ" };

  try {
    const res = await fetch(csvUrl, { cache: "no-store", redirect: "follow" });
    if (!res.ok) throw new Error(String(res.status));
    return await importCsv(await res.text());
  } catch {
    return { error: "Không tải được sheet. Hãy bật chia sẻ “Bất kỳ ai có đường liên kết”." };
  }
}

export async function importFromFile(_: FormState, fd: FormData): Promise<FormState> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Hãy chọn file CSV để tải lên" };
  if (file.size > 2 * 1024 * 1024) return { error: "File quá lớn (tối đa 2MB)" };
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) return { error: "Chỉ nhận file .csv — trong Excel/Sheets chọn Tải xuống → CSV" };
  return importCsv(await file.text());
}
