import { prisma } from "./prisma";
import { addDays, dayKey, startOfDay } from "./dates";

export const DAILY_NEW_WORD_GOAL = 10;

/** Các mốc ôn theo sheet: từ học cách đây 1, 2, 4, 7 ngày cần ôn hôm nay. */
export const SPACED_OFFSETS = [1, 2, 4, 7];

export async function getDashboard() {
  const today = startOfDay();
  const tomorrow = addDays(today, 1);

  const [words, attempts, topics] = await Promise.all([
    prisma.word.findMany({ select: { createdAt: true, nextReviewAt: true, wrongCount: true, correctCount: true } }),
    prisma.quizAttempt.findMany({ select: { createdAt: true, mode: true, correct: true } }),
    prisma.topic.findMany({
      orderBy: { createdAt: "asc" },
      include: { words: { select: { stage: true } } },
    }),
  ]);

  const newByDay = new Map<string, number>();
  for (const w of words) newByDay.set(dayKey(w.createdAt), (newByDay.get(dayKey(w.createdAt)) ?? 0) + 1);

  const testedDays = new Set<string>();
  const activeDays = new Set<string>(newByDay.keys());
  for (const a of attempts) {
    const k = dayKey(a.createdAt);
    activeDays.add(k);
    if (a.mode === "test") testedDays.add(k);
  }

  // Chuỗi ngày học liên tiếp (nếu hôm nay chưa học thì tính đến hôm qua)
  let streak = 0;
  let cursor = activeDays.has(dayKey(today)) ? today : addDays(today, -1);
  while (activeDays.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  // Ngôi sao: ngày vừa học đủ từ mới vừa làm test
  const starDays = new Set(
    [...newByDay.entries()]
      .filter(([k, n]) => n >= DAILY_NEW_WORD_GOAL && testedDays.has(k))
      .map(([k]) => k),
  );

  const newToday = newByDay.get(dayKey(today)) ?? 0;
  const dueCount = words.filter((w) => w.nextReviewAt < tomorrow).length;
  const reviewedToday = attempts.filter((a) => a.mode === "review" && a.createdAt >= today).length;
  const testsToday = attempts.filter((a) => a.mode === "test" && a.createdAt >= today).length;
  const wrongPending = words.filter((w) => w.wrongCount > w.correctCount).length;

  const spaced = SPACED_OFFSETS.map((offset) => {
    const d = addDays(today, -offset);
    return { offset, date: d, count: newByDay.get(dayKey(d)) ?? 0 };
  });

  return {
    today,
    totalWords: words.length,
    dailyAvg: newByDay.size ? Math.round(words.length / newByDay.size) : 0,
    streak,
    topicsCount: topics.length,
    stars: starDays.size,
    goals: {
      newWords: { done: newToday >= DAILY_NEW_WORD_GOAL, value: newToday },
      review: { done: dueCount === 0, due: dueCount, reviewedToday },
      test: { done: testsToday > 0 && wrongPending === 0, tested: testsToday, wrongPending },
    },
    activeDays,
    starDays,
    newByDay,
    spaced,
    topics: topics.map((t) => ({
      id: t.id,
      name: t.name,
      emoji: t.emoji,
      count: t.words.length,
      mastered: t.words.filter((w) => w.stage >= 3).length,
    })),
  };
}
