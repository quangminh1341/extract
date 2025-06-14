const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/extract", (req, res) => {
  const text = req.body.text || "";

  // Tìm số trong dạng <@123>
  const idMatch = text.match(/<@(\d+)>/);
  const id = idMatch ? idMatch[1] : "";

  // Lấy số đầu tiên có khoảng trắng đứng trước làm money
  const moneyMatch = text.match(/\s(\d+)/);
  const money = moneyMatch ? moneyMatch[1] : "";

  res.json({ id, money });
});

app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});