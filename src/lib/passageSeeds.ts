export interface SeedPassage {
  title: string;
  content: string;
  translation: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  tags: string;
  topicName?: string;
}

export const STARTER_PASSAGES: SeedPassage[] = [
  {
    title: "Stay Hungry, Stay Foolish",
    level: "Intermediate",
    tags: "Speech, Inspiration, Life",
    topicName: "Emotions",
    content:
      "Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma, which is living with the results of other people's thinking. Don't let the noise of others' opinions drown out your own inner voice. And most important, have the courage to follow your heart and intuition. They somehow already know what you truly want to become.",
    translation:
      "Thời gian của bạn là có hạn, vì vậy đừng lãng phí nó để sống cuộc đời của người khác. Đừng mắc bẫy của những giáo điều, tức là sống theo kết quả suy nghĩ của người khác. Đừng để tiếng ồn từ quan điểm của người khác lấn át tiếng nói bên trong bạn. Và quan trọng nhất, hãy can đảm đi theo trái tim và trực giác của bạn. Bằng cách nào đó, chúng đã biết bạn thực sự muốn trở thành người như thế nào.",
  },
  {
    title: "Describing My Hometown",
    level: "Intermediate",
    tags: "IELTS, Speaking, Travel",
    topicName: "Travel",
    content:
      "I was born and raised in Da Nang, a vibrant coastal city nestled between turquoise waters and lush green mountains. What I cherish most about my hometown is the harmony between modern urban life and peaceful nature. People here are exceptionally warm and welcoming, always ready to greet you with a genuine smile. Whenever I return home, walking along the beach at sunrise brings me a profound sense of serenity.",
    translation:
      "Tôi sinh ra và lớn lên ở Đà Nẵng, một thành phố ven biển tràn đầy sức sống nép mình giữa làn nước ngọc bích và những dãy núi xanh tươi. Điều tôi trân quý nhất về quê hương mình chính là sự hòa hợp giữa nhịp sống đô thị hiện đại và thiên nhiên thanh bình. Con người nơi đây vô cùng nồng hậu và mến khách, luôn sẵn sàng chào đón bạn bằng nụ cười chân thành. Mỗi khi trở về nhà, đi dạo dọc bờ biển lúc bình minh luôn mang lại cho tôi cảm giác bình yên sâu sắc.",
  },
  {
    title: "The 1% Improvement Rule",
    level: "Intermediate",
    tags: "Habits, Productivity, Growth",
    topicName: "IT",
    content:
      "Habits are the compound interest of self-improvement. Getting one percent better each day counts for a lot in the long run. If you can get one percent better each day for one year, you will end up thirty-seven times better by the time you are done. Small changes often appear to make no difference until you cross a critical threshold.",
    translation:
      "Thói quen chính là lãi kép của sự tự hoàn thiện bản thân. Trở nên tốt hơn 1% mỗi ngày mang lại sự khác biệt to lớn về lâu dài. Nếu bạn có thể tốt hơn 1% mỗi ngày trong suốt một năm, bạn sẽ tiến bộ gấp ba mươi bảy lần khi kết thúc. Những thay đổi nhỏ thường có vẻ không tạo ra sự khác biệt nào cho đến khi bạn vượt qua một ngưỡng tới hạn.",
  },
  {
    title: "The Joy of Morning Rituals",
    level: "Beginner",
    tags: "Daily, Mindfulness, Routine",
    topicName: "Food & Drink",
    content:
      "Every morning begins the same way for me. I wake up before the city stirs, pour fresh water into the kettle, and brew a hot cup of tea. In those quiet moments before notifications start flooding in, I sit by the window and write down three things I am truly grateful for. This simple habit grounds my thoughts and sets a gentle, focused tone for the entire day ahead.",
    translation:
      "Mỗi buổi sáng đều bắt đầu theo cùng một cách đối với tôi. Tôi thức dậy trước khi thành phố rục rịch chuyển mình, rót nước sạch vào ấm và pha một tách trà nóng. Trong những giây phút tĩnh lặng ấy trước khi các thông báo ập tới, tôi ngồi bên cửa sổ và viết ra ba điều mình thực sự biết ơn. Thói quen giản dị này giúp tâm trí tôi lắng đọng và tạo nên một khởi đầu nhẹ nhàng, tập trung cho cả ngày dài phía trước.",
  },
  {
    title: "Protecting Our Green Planet",
    level: "Advanced",
    tags: "Environment, Academic, Society",
    topicName: "Travel",
    content:
      "Protecting the environment is no longer an optional endeavor; it is our shared responsibility for future generations. Simple conscious choices, such as reducing single-use plastic, conserving energy, and planting trees, can collectively create a tremendous impact. We do not need a handful of people doing zero waste perfectly. We need millions of people doing it imperfectly.",
    translation:
      "Bảo vệ môi trường không còn là một nỗ lực tùy chọn nữa; đó là trách nhiệm chung của chúng ta đối với các thế hệ tương lai. Những lựa chọn có ý thức đơn giản, chẳng hạn như giảm đồ nhựa dùng một lần, tiết kiệm năng lượng và trồng cây, khi kết hợp lại có thể tạo ra một tác động to lớn. Chúng ta không cần một số ít người thực hành lối sống không rác thải một cách hoàn hảo. Chúng ta cần hàng triệu người thực hiện điều đó dù còn chưa hoàn hảo.",
  },
  {
    title: "The Magic of Reading Books",
    level: "Beginner",
    tags: "Books, Wisdom, Mindset",
    topicName: "Emotions",
    content:
      "Reading is to the mind what exercise is to the body. When we open a book, we step into someone else's shoes, explore distant galaxies, and engage with the greatest thinkers across history. It cultivates empathy, sharpens analytical thinking, and offers a peaceful sanctuary away from the digital chaos of modern life.",
    translation:
      "Đọc sách đối với tâm trí cũng như việc tập thể dục đối với cơ thể. Khi chúng ta mở một cuốn sách, chúng ta bước vào thế giới của người khác, khám phá những thiên hà xa xôi và trò chuyện cùng những bộ óc vĩ đại nhất trong lịch sử. Đọc sách nuôi dưỡng sự thấu cảm, mài sắc tư duy phân tích và mang đến một nơi trú ẩn bình yên giữa sự hỗn độn kỹ thuật số của cuộc sống hiện đại.",
  },
];
