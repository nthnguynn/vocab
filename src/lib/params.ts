type SearchParams = Record<string, string | string[] | undefined>;

/** Đọc danh sách id chủ đề từ ?topic=1&topic=2 (hoặc ?topic=1,2). */
export function topicIds(sp: SearchParams): number[] {
  const raw = sp.topic;
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(","));
  return [...new Set(list.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
}
