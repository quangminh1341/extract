const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const url = 'https://www.thegioididong.com/game-app/tong-hop-500-cau-hoi-trong-nhanh-nhu-chop-thu-vi-xoan-nao-1362477';

axios.get(url).then(response => {
  const $ = cheerio.load(response.data);
  const newRiddles = [];

  const ems = $('em').toArray();

  for (let i = 0; i < ems.length - 1; i++) {
    const questionText = $(ems[i]).text().trim();
    const answerText = $(ems[i + 1]).text().trim();

    if (
      questionText &&
      answerText.toLowerCase().startsWith('đáp án')
    ) {
      const question = questionText.replace(/^Câu đố[:：]?\s*/i, '');
      const answer = answerText.replace(/^Đáp án[:：]?\s*/i, '');

      newRiddles.push({ question, answer });
      i++; // bỏ qua câu trả lời vừa xử lý
    }
  }

  // Bổ sung vào riddles.json nếu có
  const filePath = 'riddles.json';
  let existing = [];

  try {
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.warn('⚠️ Không thể đọc riddles.json:', e.message);
  }

  // Gộp và loại trùng (theo `question`)
  const combined = [...existing, ...newRiddles];
  const unique = Array.from(new Map(combined.map(r => [r.question, r])).values());

  // Ghi lại
  fs.writeFileSync(filePath, JSON.stringify(unique, null, 2), 'utf8');
  console.log(`✅ Đã thêm ${newRiddles.length} câu, tổng cộng ${unique.length} câu đố`);
}).catch(err => {
  console.error('❌ Lỗi khi crawl:', err.message);
});