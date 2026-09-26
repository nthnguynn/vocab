import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { topicIds } from "@/lib/params";
import TopicPicker from "@/components/TopicPicker";
import Quiz, { type Question } from "@/components/Quiz";

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function TestPage(props: PageProps<"/test">) {
  await connection();
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const selectedTopics = topicIds(sp);
  const count = Math.min(Math.max(Number(one("count")) || 20, 1), 100);
  const dir = one("dir") === "en-vi" ? "en-vi" : "vi-en"; // mặc định giống sheet: nhìn nghĩa → gõ từ
  const mode = one("mode") === "choice" ? "choice" : "type";
  const onlyWrong = one("wrong") === "1";

  const [topics, all] = await Promise.all([
    prisma.topic.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, emoji: true } }),
    prisma.word.findMany({ where: selectedTopics.length ? { topicId: { in: selectedTopics } } : undefined }),
  ]);

  const pool = onlyWrong ? all.filter((w) => w.wrongCount > w.correctCount) : all;
  const picked = shuffle(pool).slice(0, count);
  const answerOf = (w: (typeof all)[number]) => (dir === "vi-en" ? w.word : w.meaning);

  const questions: Question[] = picked.map((w) => {
    const answer = answerOf(w);
    const distractors = shuffle(
      [...new Set(all.map(answerOf))].filter((a) => a.toLowerCase() !== answer.toLowerCase()),
    ).slice(0, 3);
    return {
      id: w.id,
      prompt: dir === "vi-en" ? w.meaning : w.word,
      answer,
      hint: w.type,
      example: w.example,
      word: w.word,
      choices: shuffle([answer, ...distractors]),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl">Kiểm tra ✍️</h1>
        <p className="mt-1 text-muted">Tạo đề ngẫu nhiên, trả lời từng câu và sửa lỗi sai ngay.</p>
      </div>

      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-[0.7fr_1.1fr_1.1fr_auto] lg:items-end">
        <div className="sm:col-span-2 lg:col-span-full">
          <TopicPicker topics={topics} selected={selectedTopics} />
        </div>
        <div>
          <label className="label" htmlFor="count">Số câu</label>
          <input id="count" type="number" name="count" min={1} max={100} defaultValue={count} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="dir">Dạng đề</label>
          <select id="dir" name="dir" defaultValue={dir} className="input">
            <option value="vi-en">Nghĩa → Từ tiếng Anh</option>
            <option value="en-vi">Từ tiếng Anh → Nghĩa</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="mode">Cách trả lời</label>
          <select id="mode" name="mode" defaultValue={mode} className="input">
            <option value="type">Tự gõ đáp án</option>
            <option value="choice">Trắc nghiệm 4 đáp án</option>
          </select>
        </div>
        <button className="btn">▶ Start</button>
        <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2 lg:col-span-full">
          <input type="checkbox" name="wrong" value="1" defaultChecked={onlyWrong} className="size-4 accent-petal-500" />
          Chỉ luyện các từ hay trả lời sai
        </label>
      </form>

      {questions.length ? (
        <Quiz key={`${mode}:${questions.map((q) => q.id).join(",")}`} questions={questions} mode={mode} />
      ) : (
        <div className="card mx-auto max-w-xl !p-10 text-center">
          <p className="text-5xl">{onlyWrong ? "🎉" : "🌱"}</p>
          <h2 className="h-display mt-3 text-xl">{onlyWrong ? "Không còn từ nào hay sai!" : "Chưa có từ nào để làm test"}</h2>
          <div className="mt-5 flex justify-center gap-2">
            {onlyWrong ? <Link href="/test" className="btn">Làm test thường</Link> : <Link href="/words" className="btn">＋ Thêm từ</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
