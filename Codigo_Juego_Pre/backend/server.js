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
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => {
  console.error('❌ Error conectando a MongoDB:', err);
  process.exit(1);
});


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

/* 7) SOCKET.IO EVENTS  ─────────────────────────────────────────────── */
io.on('connection', socket => {
  const role = socket.handshake.query.role || 'web';
  socket.data.role = role;             // guarda el rol en la sesión

  console.log(`[${role}] conectado →`, socket.id);

  /* ─────  A) EMPAREJAR ──────────────────────────────────────────── */
  if (role === 'controller') {
    // busca un navegador que aún no tenga mando
    const web = [...io.sockets.sockets.values()]
                .find(s => s.data.role === 'web' && !s.data.controllerId);

    if (web) {
      // relación bilateral
      web.data.controllerId     = socket.id;
      socket.data.webId         = web.id;
      web.emit('controllerStatus', 'connected');
      console.log('🎮 Mando asignado a', web.id);
    } else {
      console.log('🕹️  Mando conectado pero ningún navegador disponible');
    }
  }

  /* ─────  B) EVENTO DE ENTRADA ÚNICO ───────────────────────────── */
  socket.on('input', ({ id }) => {
    // Determina a qué navegador va este input:
    const targetWeb =
      socket.data.role === 'controller'
        ? io.sockets.sockets.get(socket.data.webId) // su pareja
        : socket;                                   // él mismo si es web

    if (!targetWeb) return;   // sin pareja aún

    // Aquí pones la lógica de tu juego:
    // Ejemplo: botón 0 = correcto
    if (id === 0) {
      io.to(targetWeb.id).emit('flash', 'success');   // feedback en pantalla
      socket.emit('buzzer', 'success');               // feedback solo al mando
    } else {
      io.to(targetWeb.id).emit('flash', 'error');
      socket.emit('buzzer', 'error');
    }
  });

  /* ─────  C) COMPATIBILIDAD CON CÓDIGO WEB EXISTENTE ───────────── */
  socket.on('flash',      t => io.emit('flash', t));
  socket.on('resetGame',  () => io.emit('resetGame'));

  /* ─────  D) DESCONEXIÓN/HOT-UNPLUG ────────────────────────────── */
  socket.on('disconnect', () => {
    console.log(`[${role}] desconectado →`, socket.id);

    if (role === 'controller' && socket.data.webId) {
      const web = io.sockets.sockets.get(socket.data.webId);
      if (web) {
        delete web.data.controllerId;
        web.emit('controllerStatus', 'disconnected');
      }
    }
  });
});

// 8) INICIO DEL SERVIDOR
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
