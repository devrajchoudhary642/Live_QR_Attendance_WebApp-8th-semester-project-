require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const { globalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const attendanceRoutes = require('./routes/attendance');
const userRoutes = require('./routes/user');

const app = express();

console.log('[SERVER] Starting application...');
console.log('[SERVER] Environment:', process.env.NODE_ENV || 'development');

connectDB();

app.use(cors({
  origin: true,
  credentials: true,
}));
console.log('[SERVER] CORS enabled');

app.use(express.json());
console.log('[SERVER] JSON parser middleware loaded');

app.use(globalLimiter);
console.log('[SERVER] Rate limiter middleware loaded');

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.use('/auth', authRoutes);
app.use('/session', sessionRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/user', userRoutes);
console.log('[SERVER] All routes registered');

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error('[ERROR] Stack:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] ✓ Server running on http://0.0.0.0:${PORT}`);
});
