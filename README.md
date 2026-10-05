# 🎀 Vocab

Website học từ vựng tiếng Anh theo chủ đề — Next.js 16 + Prisma 7 (SQLite), tone hồng.

## Chạy dự án

```bash
npm install            # tự chạy prisma generate
npx prisma migrate dev # tạo database prisma/dev.db
npm run db:seed        # nạp dữ liệu từ Google Sheet + chủ đề mẫu
npm run dev            # http://localhost:3001
```

`npm run db:reset` xoá và nạp lại toàn bộ dữ liệu.

## Tính năng

| Trang | Tương ứng trong sheet | Mô tả |
| --- | --- | --- |
| `/` Tổng quan | Bảng tổng | Số từ đã học, TB/ngày, chuỗi ngày học, ⭐, 3 mục tiêu ngày, lịch tháng, mốc ôn 1-2-4-7 ngày |
| `/topics` Chủ đề | — | Tạo/xoá chủ đề, % đã thuộc, vào flashcard/test theo chủ đề |
| `/words` Từ vựng | Bảng tổng | Thêm/sửa/xoá từ, tìm kiếm, lọc theo chủ đề & khoảng ngày |
| `/review` Ôn tập | Ôn tập | Flashcard lật thẻ, phát âm, lặp lại ngắt quãng (Nhớ → 2, 4, 7, 15, 30 ngày; Quên → ngày mai) |
| `/test` Kiểm tra | Test | Đề ngẫu nhiên: nghĩa → từ hoặc ngược lại, tự gõ hoặc trắc nghiệm, Restart, làm lại câu sai |
| `/import` Nhập Sheet | — | Đồng bộ từ link Google Sheets (cột Word, Meaning, Topic, Time, Type, Definition, Example, Note) |

Phím tắt flashcard: `Space` lật thẻ, `1` chưa nhớ, `2` nhớ rồi.

## Cấu trúc

- `prisma/schema.prisma` — `Topic`, `Word` (kèm trạng thái ôn tập), `QuizAttempt` (lịch sử ôn/test để tính streak & mục tiêu)
- `src/app/actions.ts` — server actions (CRUD, ghi kết quả ôn/test, nhập sheet)
- `src/lib/stats.ts` — số liệu dashboard; `src/lib/sheet.ts` — đọc CSV Google Sheets
