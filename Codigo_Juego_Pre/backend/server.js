// 1) IMPORTS
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const cors     = require('cors');
const path     = require('path');

const Question = require('./models/question');
const User     = require('./models/user');

dotenv.config();  // Carga MONGO_URI

// 2) APP + HTTP + SOCKET.IO
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// 3) MIDDLEWARES GENERALES
app.use(cors());
app.use(express.json());

// 4) SERVIR ARCHIVOS ESTÁTICOS
// Servir index.html, css y js desde carpeta raíz
app.use(express.static(path.join(__dirname, '..')));

// 5) RUTAS API
// CRUD PREGUNTAS
app.post('/api/questions', async (req, res) => {
  const { problem, answers } = req.body;
  if (!problem || !Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ message: 'Problem and answers are required' });
  }
  if (!answers.every(a => typeof a.value === 'number' && typeof a.isCorrect === 'boolean')) {
    return res.status(400).json({ message: 'Answers malformed' });
  }
  try {
    const q = new Question({ problem, answers });
    await q.save();
    res.status(201).json(q);
  } catch (err) {
    res.status(500).json({ message: 'Error saving question', error: err });
  }
});
app.get('/api/questions', async (req, res) => {
  try {
    const qs = await Question.find();
    res.json(qs);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving questions', error: err });
  }
});
app.put('/api/questions/:id', async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json(q);
  } catch (err) {
    res.status(500).json({ message: 'Error updating question', error: err });
  }
});
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const q = await Question.findByIdAndDelete(req.params.id);
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted', question: q });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting question', error: err });
  }
});

// RUTAS USUARIOS & PUNTAJES
app.post('/api/register', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username required' });
  try {
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: 'Username exists' });
    }
    const u = new User({ username });
    await u.save();
    res.status(201).json(u);
  } catch (err) {
    res.status(500).json({ message: 'Error registering user', error: err });
  }
});
app.get('/api/users', async (req, res) => {
  try {
    const list = await User.find().sort({ score: -1, time: 1 }).limit(10);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err });
  }
});
app.put('/api/users/:username/score', async (req, res) => {
  const { score, time } = req.body;
  try {
    const u = await User.findOne({ username: req.params.username });
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (score > u.score || (score === u.score && time < u.time)) {
      u.score = score;
      u.time = time;
      await u.save();
    }
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: 'Error updating score', error: err });
  }
});

// 6) FALLBACK PARA SPA (excluyendo /api y /socket.io)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 7) SOCKET.IO EVENTS
io.on('connection', socket => {
  console.log('🔌 Client connected', socket.id);
  socket.on('flash', type => io.emit('flash', type));
  socket.on('resetGame', () => io.emit('resetGame'));
  socket.on('disconnect', () => console.log('❌ Client disconnected', socket.id));
});

// 8) INICIO DEL SERVIDOR
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
