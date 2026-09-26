import Link from "next/link";
import { connection } from "next/server";
import { getDashboard, DAILY_NEW_WORD_GOAL } from "@/lib/stats";
import { addDays, dayKey, formatDate } from "@/lib/dates";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default async function Home() {
  await connection();
  const d = await getDashboard();
  const { goals } = d;
  const goalsDone = [goals.newWords.done, goals.review.done, goals.test.done].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="card relative overflow-hidden !p-7 sm:!p-9">
        <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-petal-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-petal-100 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-petal-600">{formatDate(d.today)} · Hiện có {d.stars} ⭐</p>
            <h1 className="h-display mt-2 text-3xl sm:text-4xl">Chào bạn, hôm nay học gì nhỉ? 🌷</h1>
            <p className="mt-2 max-w-xl text-muted italic">“Even the star waits for you.”</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/words" className="btn">＋ Thêm từ mới</Link>
            <Link href="/review?mode=due" className="btn-soft">🔁 Ôn tập ({goals.review.due})</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Từ đã học" value={d.totalWords} icon="📚" />
        <Stat label="Trung bình / ngày" value={d.dailyAvg} icon="📈" />
        <Stat label="Chuỗi ngày học" value={d.streak} icon="🔥" suffix="ngày" />
        <Stat label="Chủ đề" value={d.topicsCount} icon="🌷" />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Daily goals */}
        <section className="card lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="h-display text-xl">Mục tiêu hôm nay</h2>
            <span className="chip">{goalsDone}/3 hoàn thành</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-petal-100">
            <div className="h-full rounded-full bg-gradient-to-r from-petal-300 to-petal-500 transition-all" style={{ width: `${(goalsDone / 3) * 100}%` }} />
          </div>
          <ul className="mt-5 space-y-3">
            <Goal
              done={goals.newWords.done}
              title={`Học hơn ${DAILY_NEW_WORD_GOAL} từ mới`}
              detail={`Hôm nay: ${goals.newWords.value}/${DAILY_NEW_WORD_GOAL} từ`}
              href="/words"
              cta="Thêm từ"
            />
            <Goal
              done={goals.review.done}
              title="Ôn hết các từ đến hạn"
              detail={goals.review.due ? `Còn ${goals.review.due} từ cần ôn · đã ôn ${goals.review.reviewedToday} lượt` : "Không còn từ nào đến hạn 🎉"}
              href="/review?mode=due"
              cta="Ôn ngay"
            />
            <Goal
              done={goals.test.done}
              title="Làm test & sửa lỗi sai"
              detail={
                goals.test.tested
                  ? goals.test.wrongPending
                    ? `Còn ${goals.test.wrongPending} từ hay sai cần luyện lại`
                    : `Đã trả lời ${goals.test.tested} câu hôm nay`
                  : "Chưa làm bài test nào hôm nay"
              }
              href={goals.test.wrongPending ? "/test?wrong=1" : "/test"}
              cta="Làm test"
            />
          </ul>
        </section>

        {/* Calendar */}
        <section className="card lg:col-span-2">
          <Calendar today={d.today} activeDays={d.activeDays} starDays={d.starDays} newByDay={d.newByDay} />
        </section>
      </div>

      {/* Spaced repetition */}
      <section className="card">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="h-display text-xl">Lặp lại ngắt quãng</h2>
            <p className="text-sm text-muted">Ôn lại các từ đã học cách đây 1 · 2 · 4 · 7 ngày để nhớ lâu hơn.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl bg-gradient-to-br from-petal-400 to-petal-600 p-4 text-white shadow-soft">
            <p className="text-xs font-semibold uppercase opacity-80">Hôm nay</p>
            <p className="mt-1 font-display text-lg font-bold">{formatDate(d.today)}</p>
          </div>
          {d.spaced.map((s, i) => {
            const from = dayKey(s.date);
            return (
              <Link
                key={s.offset}
                href={`/review?from=${from}&to=${from}`}
                className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${
                  s.count ? "border-petal-200 bg-petal-50" : "border-dashed border-petal-100 bg-white/60"
                }`}
              >
                <p className="text-xs font-semibold text-muted uppercase">
                  Lần {i + 1} · {s.offset} ngày trước
                </p>
                <p className="mt-1 font-medium">{formatDate(s.date)}</p>
                <p className={`mt-1 text-sm ${s.count ? "text-petal-600 font-semibold" : "text-petal-300"}`}>
                  {s.count ? `${s.count} từ → ôn ngay` : "Không có từ"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Topics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="h-display text-xl">Chủ đề của bạn</h2>
          <Link href="/topics" className="btn-ghost">Xem tất cả →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {d.topics.map((t) => {
            const pct = t.count ? Math.round((t.mastered / t.count) * 100) : 0;
            return (
              <Link key={t.id} href={`/topics/${t.id}`} className="card group transition hover:-translate-y-1 hover:shadow-pop">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-petal-100 text-2xl transition group-hover:scale-110">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold">{t.name}</p>
                    <p className="text-xs text-muted">{t.count} từ · thuộc {pct}%</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-petal-100">
                  <div className="h-full rounded-full bg-petal-400" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon, suffix }: { label: string; value: number; icon: string; suffix?: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
        <span className="text-lg" aria-hidden>{icon}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-petal-600">
        {value}
        {suffix && <span className="ml-1 text-sm font-medium text-muted">{suffix}</span>}
      </p>
    </div>
  );
}

function Goal({ done, title, detail, href, cta }: { done: boolean; title: string; detail: string; href: string; cta: string }) {
  return (
    <li className={`flex items-center gap-4 rounded-2xl border p-4 transition ${done ? "border-petal-200 bg-petal-50" : "border-petal-100 bg-white"}`}>
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
          done ? "bg-petal-500 text-white" : "border-2 border-petal-200 text-transparent"
        }`}
      >
        ✓
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${done ? "text-petal-700" : ""}`}>{title}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      {!done && (
        <Link href={href} className="btn-soft !px-4 !py-2 shrink-0">
          {cta}
        </Link>
      )}
    </li>
  );
}

function Calendar({
  today,
  activeDays,
  starDays,
  newByDay,
}: {
  today: Date;
  activeDays: Set<string>;
  starDays: Set<string>;
  newByDay: Map<string, number>;
}) {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Thứ 2 là ngày đầu tuần
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ];
  const todayKey = dayKey(today);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="h-display text-xl">Tháng {today.getMonth() + 1}</h2>
        <span className="text-sm text-muted">{today.getFullYear()}</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-xs font-semibold text-muted">{w}</span>
        ))}
        {cells.map((c, i) => {
          if (!c) return <span key={i} />;
          const k = dayKey(c);
          const active = activeDays.has(k);
          const star = starDays.has(k);
          const n = newByDay.get(k);
          return (
            <span
              key={i}
              title={n ? `${n} từ mới` : undefined}
              className={`relative grid aspect-square place-items-center rounded-xl text-sm ${
                k === todayKey
                  ? "bg-petal-500 font-bold text-white shadow-soft"
                  : active
                    ? "bg-petal-200 font-semibold text-petal-800"
                    : "text-ink/70"
              }`}
            >
              {String(c.getDate()).padStart(2, "0")}
              {star && <span className="absolute -top-1 -right-1 text-xs">⭐</span>}
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-petal-200" /> Có học</span>
        <span className="flex items-center gap-1.5">⭐ Đạt mục tiêu</span>
      </div>
    </div>
  );
}
