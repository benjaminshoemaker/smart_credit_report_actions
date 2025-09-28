const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { analyzeBuffer } = require('./analyze');

const app = express();
const PORT = 8787;

// CORS: allow UI origin
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
    ],
  })
);

// Multer setup: memory storage for quick parse
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Missing file upload (field name "file").' });
    }
    const result = await analyzeBuffer(req.file.buffer);
    return res.json(result);
  } catch (err) {
    const message = err && err.message ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});
