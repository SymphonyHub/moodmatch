require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/mood-entries', require('./routes/moodEntries'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/friendships',  require('./routes/friendships'));
app.use('/api/activities',   require('./routes/activities'));
app.use('/api/cheers',       require('./routes/cheers'));
app.use('/api/messages',     require('./routes/messages'));
app.use('/api/mascota',      require('./routes/mascota'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/invite',           require('./routes/invite'));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Manejo de errores no capturados (Prisma u otros)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MoodMatch API corriendo en http://localhost:${PORT}`));
