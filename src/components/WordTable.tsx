import Link from "next/link";
import { deleteWord } from "@/app/actions";
import { formatDate, MAX_STAGE } from "@/lib/dates";
import SpeakButton from "./SpeakButton";
import DeleteButton from "./DeleteButton";

type Row = {
  id: number;
  word: string;
  meaning: string;
  type: string | null;
  example: string | null;
  definition: string | null;
  stage: number;
  createdAt: Date;
  topic: { id: number; name: string; emoji: string };
};

export default function WordTable({ words, showTopic = true }: { words: Row[]; showTopic?: boolean }) {
  if (words.length === 0) {
    return (
      <div className="card py-12 text-center">
        <p className="text-4xl">🌱</p>
        <p className="mt-2 text-muted">Chưa có từ nào ở đây.</p>
      </div>
    );
  }

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="hidden grid-cols-[2fr_2fr_3fr_auto] gap-4 border-b border-petal-100 bg-petal-50/70 px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase md:grid">
        <span>Từ vựng</span>
        <span>Nghĩa</span>
        <span>Ví dụ</span>
        <span className="w-36 text-right">Tiến độ</span>
      </div>
      <ul className="divide-y divide-petal-100">
        {words.map((w) => (
          <li key={w.id} className="grid gap-2 px-5 py-4 transition hover:bg-petal-50/60 md:grid-cols-[2fr_2fr_3fr_auto] md:items-center md:gap-4">
            <div className="flex items-start gap-2.5">
              <SpeakButton text={w.word} />
              <div className="min-w-0">
                <p className="font-display text-base font-bold break-words">{w.word}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {w.type && <span className="chip">{w.type}</span>}
                  {showTopic && (
                    <Link href={`/topics/${w.topic.id}`} className="chip hover:bg-petal-200">
                      {w.topic.emoji} {w.topic.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <div className="pl-10 md:pl-0">
              <p className="font-medium">{w.meaning}</p>
            </div>
            <p className="pl-10 text-sm text-muted italic md:pl-0">
              {w.example ?? w.definition ?? <span className="not-italic text-petal-200">—</span>}
            </p>
            <div className="flex items-center justify-between gap-2 pl-10 md:w-36 md:flex-col md:items-end md:pl-0">
              <div className="flex items-center gap-1" title={`Mức ghi nhớ ${w.stage}/${MAX_STAGE}`}>
                {Array.from({ length: MAX_STAGE }, (_, i) => (
                  <span key={i} className={`h-1.5 w-3 rounded-full ${i < w.stage ? "bg-petal-500" : "bg-petal-100"}`} />
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                <span className="mr-1 text-[11px] text-muted">{formatDate(w.createdAt)}</span>
                <Link href={`/words/${w.id}/edit`} className="btn-ghost !px-2" aria-label={`Sửa ${w.word}`}>✏️</Link>
                <DeleteButton
                  onDelete={deleteWord.bind(null, w.id)}
                  confirmText={`Xoá từ “${w.word}”?`}
                  label="🗑️"
                  className="btn-ghost !px-2"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
