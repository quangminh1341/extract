const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser'); 
const axios = require('axios'); 
const fetch = require('node-fetch'); 
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const natural = require('natural');
const SentenceTokenizer = new natural.SentenceTokenizer();
const WordTokenizer = new natural.WordTokenizer();

const riddlesFile = path.join(__dirname, 'riddles.json');
const tarotFile = path.join(__dirname, 'tarot.json');
let tarotData = [];
function loadTarotData() {
    fs.readFile(tarotFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Lỗi đọc file tarot.json:', err);
            if (err.code === 'ENOENT') {
                console.warn('File tarot.json không tìm thấy. Tạo mảng trống cho dữ liệu tarot.');
                tarotData = [];
            }
            return;
        }
        try {
            tarotData = JSON.parse(data);
            console.log('Đã tải dữ liệu Tarot thành công.');
        } catch (parseErr) {
            console.error('Lỗi phân tích JSON tarot.json:', parseErr);
        }
    });
}
loadTarotData();
// API Ping
app.get('/ping', (req, res) => {
    res.send('pong');
});

// API Tóm tắt văn bản (Phần này là trọng tâm)
app.post('/summarize', async (req, res) => {
    const { text, reduction_percentage } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Văn bản cần tóm tắt là bắt buộc.' });
    }

    let actualReductionPercentage = 40; 
    if (reduction_percentage !== undefined && typeof reduction_percentage === 'number' && reduction_percentage >= 0 && reduction_percentage < 100) {
        actualReductionPercentage = reduction_percentage;
    } else if (reduction_percentage !== undefined) { 
        return res.status(400).json({ error: 'Tỷ lệ rút gọn (reduction_percentage) phải là một số từ 0 đến 99.' });
    }

    try {
        const summarized_text = summarizeText(text, actualReductionPercentage);
        res.json({
            original_text: text,
            summarized_text: summarized_text,
            reduction_percentage_applied: actualReductionPercentage,
        });
    } catch (error) {
        console.error("Lỗi khi tóm tắt văn bản từ API:", error);
        res.status(500).json({ error: 'Đã xảy ra lỗi trong quá trình tóm tắt.', details: error.message });
    }
});

// API Định dạng tiền tệ
app.get('/money', (req, res) => {
    const numberStr = req.query.number;
    if (!numberStr) {
        return res.status(400).json({ error: "Tham số 'number' bị thiếu. Vui lòng cung cấp một số." });
    }

    try {
        const number = parseInt(numberStr, 10);
        if (isNaN(number)) {
            return res.status(400).json({ error: "Định dạng 'number' không hợp lệ. Vui lòng cung cấp một số nguyên." });
        }
        const formattedNumber = number.toLocaleString('en-US'); // Định dạng tiền tệ theo chuẩn US
        res.json({ formatted_number: formattedNumber });
    } catch (error) {
        return res.status(500).json({ error: "Đã xảy ra lỗi không mong muốn." });
    }
});

// API lấy ngẫu nhiên 1 câu đố
app.get('/riddle', (req, res) => {
    fs.readFile(riddlesFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Lỗi đọc file riddles.json:', err);
            // Có thể tạo file rỗng nếu không tồn tại
            if (err.code === 'ENOENT') {
                console.warn('File riddles.json không tìm thấy. Trả về lỗi.');
                return res.status(500).json({ error: 'File dữ liệu câu đố không tìm thấy' });
            }
            return res.status(500).json({ error: 'Không thể đọc dữ liệu câu đố' });
        }
        try {
            const riddles = JSON.parse(data);
            if (!Array.isArray(riddles) || riddles.length === 0) {
                return res.status(500).json({ error: 'Dữ liệu câu đố không hợp lệ hoặc trống' });
            }
            const randomIndex = Math.floor(Math.random() * riddles.length);
            const riddle = riddles[randomIndex];
            return res.json(riddle);
        } catch (parseErr) {
            console.error('Lỗi phân tích JSON:', parseErr);
            return res.status(500).json({ error: 'Dữ liệu JSON không hợp lệ' });
        }
    });
});

// API 1: Tách id và money
app.post("/extract", (req, res) => {
    const text = req.body.text || "";

    const idMatch = text.match(/<@(\d+)>/);
    const id = idMatch ? idMatch[1] : "";

    const moneyMatch = text.match(/\s(\d+)/);
    const money = moneyMatch ? moneyMatch[1] : "";

    let moneyRel = "";
    if (money) {
        try {
            const parsedMoney = parseInt(money, 10);
            if (!isNaN(parsedMoney)) {
                moneyRel = parsedMoney.toLocaleString('en-US');
            }
        } catch (error) {
            console.error("Lỗi khi định dạng tiền tệ:", error);
            moneyRel = "";
        }
    }
    res.json({ id, money, moneyRel });
});

// API 2: Tách từ thứ 2 từ văn bản có 2 từ
app.post("/extract-word", (req, res) => {
    const input = req.body.text || "";

    const words = input.trim().split(/\s+/);
    const secondWord = words.length >= 2 ? words[1] : "";

    res.json({ text: secondWord });
});

// API Tarot
app.get('/api/tarot', (req, res) => {
    if (tarotData.length === 0) {
        return res.status(500).json({ error: 'Dữ liệu Tarot chưa được tải hoặc trống.' });
    }
    const randomCard = tarotData[Math.floor(Math.random() * tarotData.length)];
    res.json(randomCard);
});

// API 3: Tìm cụm bắt đầu bằng từ khóa từ text cố định (không gửi từ client)
app.post("/match-words", (req, res) => {
  const word = req.body.word || "";
  let inputText = req.body.text;

  // 🔒 Văn bản cố định ở đây
const vietnameseStopwords = new Set([
    'là', 'và', 'của', 'một', 'có', 'không', 'được', 'với', 'trong', 'trên',
    'cho', 'khi', 'mà', 'từ', 'sẽ', 'đã', 'những', 'này', 'ấy', 'nào',
    'vậy', 'thì', 'ở', 'để', 'như', 'vì', 'cũng', 'lại', 'rất', 'hơn',
    'kém', 'quá', 'mỗi', 'từng', 'về', 'qua', 'bên', 'dưới', 'đến', 'ra',
    'vào', 'lên', 'xuống', 'trước', 'sau', 'ngoài', 'trong', 'hết', 'cả', 'chỉ',
    'do', 'nhằm', 'bằng', 'theo', 'như', 'với', 'qua', 'mà', 'tại', 'như'
]);
    // ✅ Nếu text rỗng hoặc không có, dùng mặc định
  function preprocessText(text) {
    text = text.toLowerCase();
    text = text.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s.,?!]/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

function tokenizeAndFilterWords(sentence) {
    return WordTokenizer.tokenize(sentence).filter(word => !vietnameseStopwords.has(word));
}
function calculateTfIdf(sentences) {
    const tfidf = new natural.TfIdf();
    sentences.forEach((sentence, index) => {
        tfidf.addDocument(tokenizeAndFilterWords(sentence).join(' ')); 
    });


    const wordScores = {}; 
    for (let i = 0; i < sentences.length; i++) {
        tfidf.listTerms(i).forEach(item => {
            wordScores[item.term] = (wordScores[item.term] || 0) + item.tfidf;
        });
    }
    return wordScores;
}

function calculateSentenceScores(sentences, wordTfIdfScores) {
    const sentenceScores = {};
    const totalSentences = sentences.length;

    sentences.forEach((sentence, index) => {
        let score = 0;
        const words = tokenizeAndFilterWords(sentence);
        for (const word of words) {
            score += (wordTfIdfScores[word] || 0);
        }
        let positionWeight = 1;
        if (index === 0) {
            positionWeight = 1.2;
        } else if (index === totalSentences - 1 && totalSentences > 1) {
            positionWeight = 1.1;
        } else {
        }
        
        sentenceScores[sentence] = score * positionWeight;
    });
    return sentenceScores;
}

/**
 * Tóm tắt văn bản dựa trên điểm câu, cân nhắc trọng số TF-IDF và vị trí.
 * Sẽ rút gọn khoảng 40% văn bản (giữ lại 60%).
 * @param {string} text Văn bản đầu vào.
 * @param {number} reductionPercentage Tỷ lệ phần trăm muốn rút gọn (ví dụ: 40 cho 40%).
 * @returns {string} Văn bản tóm tắt.
 */
function summarizeText(text, reductionPercentage = 40) {
    const cleanedText = preprocessText(text);
    const sentences = SentenceTokenizer.tokenize(cleanedText);
    const targetSentencesCount = Math.ceil(sentences.length * ((100 - reductionPercentage) / 100));

    if (sentences.length <= targetSentencesCount || sentences.length === 0) {
        return text;
    }

    const wordTfIdfScores = calculateTfIdf(sentences);
    const sentenceScores = calculateSentenceScores(sentences, wordTfIdfScores);

    const sortedSentencesByScore = Object.keys(sentenceScores).sort((a, b) => {
        return sentenceScores[b] - sentenceScores[a];
    });

    const topSentences = sortedSentencesByScore.slice(0, targetSentencesCount);

    const finalSummarySentences = [];
    for (const originalSentence of sentences) {
        if (topSentences.includes(originalSentence)) {
            finalSummarySentences.push(originalSentence);
        }
    }

    return finalSummarySentences.join(' ');
}

const sampleText = `
Chào mừng bạn đến với khóa học Trí tuệ Nhân tạo. Khóa học này giới thiệu các khái niệm cơ bản và kỹ thuật cốt lõi của AI. Chúng ta sẽ tìm hiểu về học máy, thị giác máy tính và xử lý ngôn ngữ tự nhiên. Học máy là một lĩnh vực con của AI, giúp máy tính học hỏi từ dữ liệu. Thị giác máy tính cho phép máy tính nhìn và hiểu thế giới. Xử lý ngôn ngữ tự nhiên giúp máy tính tương tác với ngôn ngữ con người. Mục tiêu của khóa học là trang bị cho bạn kiến thức và kỹ năng để xây dựng các hệ thống AI.
`;

const summary = summarizeText(sampleText, 40);
console.log("Văn bản gốc:\n", sampleText);
console.log("\n--- Tóm tắt (rút gọn 40%) ---\n", summary);

const summary20 = summarizeText(sampleText, 20);
console.log("\n--- Tóm tắt (rút gọn 20%) ---\n", summary20);

const shortText = "Đây là một câu rất ngắn. Nó không cần tóm tắt.";
const shortSummary = summarizeText(shortText, 40);
console.log("\n--- Tóm tắt văn bản ngắn ---\n", shortSummary);

// --- 5. Khởi động API Server (luôn ở cuối file) ---
app.listen(API_PORT, () => {
    console.log(`✅ Server API đang chạy trên cổng http://localhost:${API_PORT}`);
    console.log(`Bạn có thể gửi POST request tới /summarize với body JSON: {"text": "Văn bản của bạn...", "sentences_count": 5}`);
    console.log(`Hoặc truy cập các API khác như /ping, /money?number=12345, /riddle, /api/tarot`);
});
