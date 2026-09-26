"use client";

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export default function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      title={`Nghe phát âm “${text}”`}
      aria-label={`Nghe phát âm ${text}`}
      className={`grid size-8 shrink-0 place-items-center rounded-full bg-petal-100 text-sm transition hover:bg-petal-200 active:scale-90 ${className}`}
    >
      🔊
    </button>
  );
}
