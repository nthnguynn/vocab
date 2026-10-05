"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { type FormState } from "@/app/actions";
import { speak } from "./SpeakButton";

interface TopicOption {
  id: number;
  name: string;
  emoji: string;
}

interface PassageFormProps {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  topics: TopicOption[];
  initialData?: {
    id?: number;
    title?: string;
    content?: string;
    translation?: string | null;
    level?: string;
    tags?: string | null;
    topicId?: number | null;
  };
  compact?: boolean;
}

export default function PassageForm({ action, topics, initialData, compact }: PassageFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [isNewTopic, setIsNewTopic] = useState(false);
  const [content, setContent] = useState(initialData?.content ?? "");
  const [level, setLevel] = useState(initialData?.level ?? "Intermediate");

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = content.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const estimatedSeconds = Math.max(10, Math.round((wordCount / 130) * 60));

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-2xl border border-berry/30 bg-berry/10 p-3.5 text-sm font-medium text-berry">
          {state.error}
        </div>
      )}
      {state.message && (
        <div className="rounded-2xl border border-mint/30 bg-mint/10 p-3.5 text-sm font-medium text-mint">
          {state.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">
            Tiêu đề đoạn văn <span className="text-petal-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={initialData?.title}
            placeholder="Ví dụ: Stay Hungry, Stay Foolish hoặc My Favorite Hobby..."
            className="input font-medium"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label !mb-0" htmlFor="content">
              Đoạn văn tiếng Anh <span className="text-petal-500">*</span>
            </label>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{wordCount} từ</span>
              <span>·</span>
              <span>{sentenceCount} câu</span>
              <span>·</span>
              <span>~{estimatedSeconds}s đọc</span>
              {content.trim() && (
                <button
                  type="button"
                  onClick={() => speak(content)}
                  className="inline-flex items-center gap-1 rounded-md bg-petal-100 px-2 py-0.5 font-medium text-petal-700 hover:bg-petal-200 transition"
                  title="Nghe thử toàn bộ đoạn văn"
                >
                  🔊 Nghe thử
                </button>
              )}
            </div>
          </div>
          <textarea
            id="content"
            name="content"
            required
            rows={compact ? 4 : 6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung đoạn văn tiếng Anh cần học thuộc vào đây..."
            className="input leading-relaxed"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="translation">
            Bản dịch tiếng Việt (tùy chọn)
          </label>
          <textarea
            id="translation"
            name="translation"
            rows={compact ? 3 : 4}
            defaultValue={initialData?.translation ?? ""}
            placeholder="Dịch nghĩa để hiểu sâu và nhớ lâu hơn..."
            className="input leading-relaxed"
          />
        </div>

        <div>
          <label className="label" htmlFor="level">
            Độ khó / Trình độ
          </label>
          <select
            id="level"
            name="level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="input"
          >
            <option value="Beginner">🌱 Cơ bản (Beginner)</option>
            <option value="Intermediate">🌿 Trung cấp (Intermediate)</option>
            <option value="Advanced">🌳 Nâng cao (Advanced)</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="tags">
            Thẻ phân loại (Tags)
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={initialData?.tags ?? ""}
            placeholder="Ví dụ: IELTS, Speech, Daily, Phỏng vấn..."
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="topicId">
              Chủ đề liên quan
            </label>
            <button
              type="button"
              onClick={() => setIsNewTopic(!isNewTopic)}
              className="text-xs font-semibold text-petal-600 hover:underline"
            >
              {isNewTopic ? "← Chọn chủ đề có sẵn" : "＋ Thêm chủ đề mới"}
            </button>
          </div>
          {isNewTopic ? (
            <input
              name="newTopic"
              placeholder="Tên chủ đề mới (ví dụ: Công việc, Đời sống...)"
              className="input"
              autoFocus
            />
          ) : (
            <select
              id="topicId"
              name="topicId"
              defaultValue={initialData?.topicId ?? ""}
              className="input"
            >
              <option value="">(Không gắn chủ đề cụ thể)</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/passages" className="btn-ghost">
          Hủy
        </Link>
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Đang lưu..." : initialData ? "Lưu thay đổi ✨" : "Tạo đoạn văn mới 🌸"}
        </button>
      </div>
    </form>
  );
}
