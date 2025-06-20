const natural = require('natural');
const SentenceTokenizer = new natural.SentenceTokenizer();
const WordTokenizer = new natural.WordTokenizer();

// Một danh sách stop words cơ bản (cho tiếng Việt bạn sẽ cần danh sách riêng)
const stopwords = new Set([
    'là', 'và', 'của', 'trong', 'trên', 'với', 'một', 'những', 'các', 'đã', 'sẽ', 'không', 'có', 'được', 'từ', 'cho', 'về', 'khi', 'mà', 'này', 'ấy', 'nếu', 'như', 'tôi', 'anh', 'chị', 'em', 'chúng', 'họ', 'rằng', 'thì', 'ở', 'để', 'cũng', 'vậy', 'đi', 'lại', 'rồi', 'nhưng', 'còn', 'hay', 'ra', 'vào', 'bởi', 'do', 'đó', 'nữa', 'ai', 'gì', 'đâu', 'nào', 'chứ', 'đây', 'kia', 'sao', 'mà', 'tới', 'đến', 'theo', 'phải', 'trước', 'sau', 'trên', 'dưới', 'trong', 'ngoài', 'giữa', 'bên', 'cạnh', 'trên', 'đầu', 'cuối', 'giữa'
]);

function preprocessText(text) {
    // Chuyển về chữ thường
    text = text.toLowerCase();
    // Loại bỏ ký tự không phải chữ cái và khoảng trắng (giữ lại dấu câu để tách câu)
    // Để đơn giản, ta chỉ loại bỏ số và một số ký tự đặc biệt không mong muốn
    text = text.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s.,?!]/g, '');
    return text;
}

function tokenizeAndFilterWords(sentence) {
    // Tách từ và loại bỏ stop words
    return WordTokenizer.tokenize(sentence).filter(word => !stopwords.has(word));
}

function calculateWordFrequency(sentences) {
    const wordFreq = {};
    for (const sentence of sentences) {
        const words = tokenizeAndFilterWords(sentence);
        for (const word of words) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    }
    return wordFreq;
}

function calculateSentenceScores(sentences, wordFreq) {
    const sentenceScores = {};
    for (const sentence of sentences) {
        let score = 0;
        const words = tokenizeAndFilterWords(sentence);
        for (const word of words) {
            score += (wordFreq[word] || 0); // Cộng tần suất của từ vào điểm của câu
        }
        sentenceScores[sentence] = score;
    }
    return sentenceScores;
}

function summarizeText(text, sentencesCount = 3) {
    // 1. Tiền xử lý văn bản gốc
    const cleanedText = preprocessText(text);

    // 2. Tách văn bản thành các câu
    const sentences = SentenceTokenizer.tokenize(cleanedText);

    if (sentences.length <= sentencesCount) {
        return text; // Nếu số câu yêu cầu lớn hơn hoặc bằng tổng số câu, trả về nguyên bản
    }

    // 3. Tính tần suất từ trong toàn bộ văn bản (sau khi tiền xử lý)
    const wordFrequency = calculateWordFrequency(sentences);

    // 4. Tính điểm cho mỗi câu dựa trên tần suất từ
    const sentenceScores = calculateSentenceScores(sentences, wordFrequency);

    // 5. Sắp xếp các câu theo điểm giảm dần và chọn ra số lượng câu mong muốn
    const sortedSentences = Object.keys(sentenceScores).sort((a, b) => {
        return sentenceScores[b] - sentenceScores[a];
    });

    // 6. Lấy N câu có điểm cao nhất
    const topSentences = sortedSentences.slice(0, sentencesCount);

    // 7. Sắp xếp lại các câu đã chọn theo thứ tự xuất hiện trong văn bản gốc
    // Điều này quan trọng để bản tóm tắt có tính mạch lạc
    const finalSummarySentences = [];
    for (const originalSentence of sentences) {
        if (topSentences.includes(originalSentence)) {
            finalSummarySentences.push(originalSentence);
        }
    }

    return finalSummarySentences.join(' ');
}

module.exports = summarizeText;