import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { extractWords, type SheetWord } from "../src/lib/sheet";

const TOPIC_EMOJI: Record<string, string> = {
  IT: "💻",
  "Food & Drink": "🍓",
  Travel: "✈️",
  Emotions: "💗",
  Fashion: "👗",
};

const w = (word: string, type: string, meaning: string, example: string): Omit<SheetWord, "topic"> => ({
  word,
  type,
  meaning,
  example,
});

const STARTER: Record<string, Omit<SheetWord, "topic">[]> = {
  "Food & Drink": [
    w("strawberry", "Noun", "quả dâu tây", "She put fresh strawberries on the cake."),
    w("dessert", "Noun", "món tráng miệng", "What would you like for dessert?"),
    w("recipe", "Noun", "công thức nấu ăn", "This recipe is from my grandmother."),
    w("ingredient", "Noun", "nguyên liệu", "Mix all the ingredients in a bowl."),
    w("delicious", "Adjective", "ngon", "The soup smells delicious."),
    w("bake", "Verb", "nướng (bánh)", "We baked cookies together last night."),
    w("beverage", "Noun", "đồ uống", "Hot beverages are served in the lobby."),
    w("spicy", "Adjective", "cay", "Thai food is often very spicy."),
  ],
  Travel: [
    w("passport", "Noun", "hộ chiếu", "Don't forget to bring your passport."),
    w("luggage", "Noun", "hành lý", "My luggage was lost at the airport."),
    w("destination", "Noun", "điểm đến", "Paris is a popular tourist destination."),
    w("itinerary", "Noun", "lịch trình", "Our itinerary includes three cities."),
    w("souvenir", "Noun", "quà lưu niệm", "I bought a souvenir for my sister."),
    w("book", "Verb", "đặt (vé, phòng)", "I booked a room by the sea."),
    w("departure", "Noun", "sự khởi hành", "The departure time is 7 a.m."),
    w("explore", "Verb", "khám phá", "We spent the day exploring the old town."),
  ],
  Emotions: [
    w("grateful", "Adjective", "biết ơn", "I'm so grateful for your help."),
    w("anxious", "Adjective", "lo lắng", "She felt anxious before the exam."),
    w("delighted", "Adjective", "vui mừng", "We were delighted to hear the news."),
    w("embarrassed", "Adjective", "xấu hổ", "He was embarrassed by his mistake."),
    w("confident", "Adjective", "tự tin", "Practice makes you more confident."),
    w("lonely", "Adjective", "cô đơn", "She felt lonely in the big city."),
    w("overwhelmed", "Adjective", "choáng ngợp", "I was overwhelmed by all the work."),
    w("cheerful", "Adjective", "vui vẻ", "He is always cheerful in the morning."),
  ],
};

async function main() {
  await prisma.quizAttempt.deleteMany();
  await prisma.word.deleteMany();
  await prisma.topic.deleteMany();

  const csv = readFileSync(join(__dirname, "seed-sheet.csv"), "utf8");
  const fromSheet = extractWords(csv);
  const starter = Object.entries(STARTER).flatMap(([topic, list]) => list.map((x) => ({ ...x, topic })));
  const all = [...fromSheet, ...starter];

  const topicIds = new Map<string, number>();
  for (const name of new Set(all.map((x) => x.topic))) {
    const t = await prisma.topic.create({ data: { name, emoji: TOPIC_EMOJI[name] ?? "🌸" } });
    topicIds.set(name, t.id);
  }

  for (const { topic, createdAt, ...rest } of all) {
    const created = createdAt ?? new Date();
    await prisma.word.create({
      data: {
        ...rest,
        topicId: topicIds.get(topic)!,
        createdAt: created,
        // Từ mới cần ôn lại sau 1 ngày; từ cũ trong sheet coi như đã đến hạn ôn
        nextReviewAt: createdAt ? created : new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
  }
  console.log(`🌸 Seeded ${all.length} words in ${topicIds.size} topics (${fromSheet.length} from your sheet).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
