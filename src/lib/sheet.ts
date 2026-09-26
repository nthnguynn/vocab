export type SheetWord = {
  word: string;
  type?: string;
  topic: string;
  meaning: string;
  definition?: string;
  example?: string;
  note?: string;
  createdAt?: Date;
};

/** Đoán ký tự phân cách: Excel bản địa hay lưu CSV bằng ";" và dán từ Sheets thì là tab. */
function detectDelimiter(text: string) {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const count = (ch: string) => head.split(ch).length - 1;
  return [",", ";", "\t"].sort((x, y) => count(y) - count(x))[0];
}

/** Parser CSV nhỏ gọn, hỗ trợ ô có dấu ngoặc kép, xuống dòng và BOM của Excel. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delim = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Nhận M/D/YYYY (Google Sheets) hoặc YYYY-MM-DD. */
function parseSheetDate(s: string) {
  const v = s.trim();
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]), 12);
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
  return undefined;
}

/** Tên cột được chấp nhận (tiếng Anh hoặc tiếng Việt, không phân biệt hoa thường). */
const COLUMN_ALIASES = {
  word: ["word", "từ vựng", "từ", "tu vung"],
  meaning: ["meaning", "nghĩa", "nghia"],
  topic: ["topic", "chủ đề", "chu de"],
  type: ["type", "loại từ", "loai tu"],
  definition: ["definition", "định nghĩa", "định nghĩa chi tiết"],
  example: ["example", "ví dụ", "vi du"],
  note: ["note", "ghi chú"],
  time: ["time", "date", "ngày", "ngày học", "thời gian"],
} as const;
type Column = keyof typeof COLUMN_ALIASES;

// "Word *" hay "Meaning (bắt buộc)" đều được hiểu là Word / Meaning
const normHeader = (c: string) =>
  c.normalize("NFC").toLowerCase().replace(/\(.*?\)|\*/g, "").trim();

const findCol = (header: string[], key: Column) =>
  header.findIndex((c) => (COLUMN_ALIASES[key] as readonly string[]).includes(c));

/**
 * Đọc bảng từ vựng: tìm dòng tiêu đề có cột Word & Meaning ở bất kỳ vị trí nào
 * (sheet "Bảng tổng" hoặc file template), sau đó lấy mọi dòng có từ vựng.
 */
export function extractWords(csv: string): SheetWord[] {
  const rows = parseCsv(csv);
  const headerIdx = rows.findIndex((r) => {
    const h = r.map(normHeader);
    return findCol(h, "word") >= 0 && findCol(h, "meaning") >= 0;
  });
  if (headerIdx === -1) return [];
  const header = rows[headerIdx].map(normHeader);
  const idx = Object.fromEntries(
    (Object.keys(COLUMN_ALIASES) as Column[]).map((k) => [k, findCol(header, k)]),
  ) as Record<Column, number>;

  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const opt = (r: string[], i: number) => get(r, i) || undefined;

  const words: SheetWord[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const word = get(r, idx.word);
    const meaning = get(r, idx.meaning);
    // Bỏ dòng trống và dòng tiêu đề phụ tiếng Việt (Từ vựng / Nghĩa)
    if (!word || !meaning || findCol([normHeader(word)], "word") === 0) continue;
    words.push({
      word,
      meaning,
      topic: get(r, idx.topic) || "Chung",
      type: opt(r, idx.type),
      definition: opt(r, idx.definition),
      example: opt(r, idx.example),
      note: opt(r, idx.note),
      createdAt: parseSheetDate(get(r, idx.time)),
    });
  }
  return words;
}

/** Chuyển link Google Sheets bất kỳ thành link export CSV (giữ nguyên gid nếu có). */
export function toCsvExportUrl(url: string) {
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!id) return null;
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}
