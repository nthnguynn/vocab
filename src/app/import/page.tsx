import { FileImportForm, SheetImportForm } from "@/components/ImportForm";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1oyJGrDUKMmXatil3Ktl5cNlvvvxFHpyiOyhXMl1eBqI/edit#gid=713086134";

const COLUMNS: [string, string, boolean][] = [
  ["Word", "Từ tiếng Anh", true],
  ["Meaning", "Nghĩa tiếng Việt", true],
  ["Topic", "Chủ đề — tự tạo nếu chưa có", false],
  ["Type", "Noun, Verb, Adjective…", false],
  ["Example", "Câu ví dụ", false],
  ["Definition", "Định nghĩa chi tiết", false],
  ["Note", "Ghi chú", false],
];

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="h-display text-3xl">Nhập từ vựng 📥</h1>
        <p className="mt-1 text-muted">Điền template rồi tải lên — chỉ cần 2 cột Word và Meaning là đủ. Từ đã có sẽ được cập nhật.</p>
      </div>

      <section className="card !p-7">
        <Step n={1} title="Tải template về">
          Mở bằng Excel hoặc Google Sheets, xoá 3 dòng mẫu và điền từ của bạn.
        </Step>
        <div className="mt-4 flex flex-wrap gap-2 pl-12">
          <a href="/vocab-template.csv" download="vocab-template.csv" className="btn">⬇️ Tải template (.csv)</a>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-petal-100 sm:ml-12">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-petal-100">
              {COLUMNS.map(([col, desc, required]) => (
                <tr key={col} className={required ? "bg-petal-50" : ""}>
                  <td className="w-32 px-4 py-2">
                    <code className="font-semibold text-petal-700">{col}</code>
                  </td>
                  <td className="px-4 py-2 text-muted">{desc}</td>
                  <td className="px-4 py-2 text-right">
                    {required ? <span className="chip !bg-petal-500 !text-white">bắt buộc</span> : <span className="text-xs text-petal-300">tuỳ chọn</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted sm:ml-12">
          Tên cột tiếng Việt (Từ vựng, Nghĩa, Chủ đề, Loại từ, Ví dụ…) cũng được. Bỏ trống Topic thì từ vào chủ đề “Chung”.
        </p>
      </section>

      <section className="card !p-7">
        <Step n={2} title="Tải file lên">
          Lưu file dạng <b>CSV</b> (Excel: Lưu thành → CSV UTF-8 · Google Sheets: Tệp → Tải xuống → .csv).
        </Step>
        <div className="mt-4 sm:pl-12">
          <FileImportForm />
        </div>
      </section>

      <section className="card !p-7">
        <Step n={3} title="Hoặc đồng bộ thẳng từ Google Sheets">
          Dán link sheet đã bật chia sẻ “Bất kỳ ai có đường liên kết đều xem được”. Nhiều tab thì mở đúng tab rồi copy link (có <code>gid=…</code>).
        </Step>
        <div className="mt-4 sm:pl-12">
          <SheetImportForm defaultUrl={SHEET_URL} />
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-petal-500 font-display font-bold text-white shadow-soft">{n}</span>
      <div>
        <h2 className="h-display text-lg">{title}</h2>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </div>
  );
}
