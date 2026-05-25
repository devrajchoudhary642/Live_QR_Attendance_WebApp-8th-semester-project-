const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../models/User');
const OtpRecord = require('../models/OtpRecord');
const AttendanceRecord = require('../models/AttendanceRecord');
const Session = require('../models/Session');
const { generateOtp, createHashedOtp, verifyOtp } = require('../utils/otpUtils');
const { sendOtpEmail } = require('../utils/emailUtils');
const { validateQrToken, generateUserJwt, generateSessionEntryToken, resolveSessionFromToken } = require('../utils/tokenUtils');
const { authMiddleware } = require('../middleware/authMiddleware');
const { otpSendLimiter } = require('../middleware/rateLimiter');

router.post('/register', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.create({ email: email.toLowerCase(), name, role: 'student' });
    res.status(201).json({ message: 'Student registered successfully', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

router.post('/professor-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[AUTH] Professor login attempt for:', email);
    
    if (!email || !password) {
      console.log('[AUTH] Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'professor' });
    console.log('[AUTH] User found:', !!user);
    
    if (!user || !user.passwordHash) {
      console.log('[AUTH] User not found or no password hash');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log('[AUTH] Password match:', isMatch);
    
    if (!isMatch) {
      console.log('[AUTH] Password mismatch for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateUserJwt({ userId: user._id, email: user.email, role: user.role, name: user.name });
    console.log('[AUTH] ✓ Professor login successful:', email);
    res.json({ token, user: { email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    console.error('[AUTH] Stack:', err.stack);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

router.post('/exchange-scan-token', async (req, res) => {
  try {
    const { scanToken } = req.body;
    if (!scanToken) return res.status(400).json({ message: 'scanToken is required' });

    const { valid, sessionId } = validateQrToken(scanToken);
    if (!valid) return res.status(400).json({ message: 'QR code expired, please scan the current code' });

    const session = await Session.findOne({ sessionId, isActive: true });
    if (!session) return res.status(400).json({ message: 'Session not found or has ended' });

    res.json({ sessionEntryToken: generateSessionEntryToken(sessionId) });
  } catch (err) {
    res.status(500).json({ message: 'Token exchange failed', error: err.message });
  }
});

router.post('/send-otp', otpSendLimiter, async (req, res) => {
  try {
    const { email, name, sessionToken } = req.body;
    if (!email || !sessionToken) {
      return res.status(400).json({ message: 'Email and sessionToken are required' });
    }

    const { valid, sessionId } = resolveSessionFromToken(sessionToken);
    if (!valid) {
      return res.status(400).json({ message: 'QR code expired, please scan the current code' });
    }

    const session = await Session.findOne({ sessionId, isActive: true });
    if (!session) {
      return res.status(400).json({ message: 'Session not found or has ended' });
    }

    const alreadyMarked = await AttendanceRecord.findOne({
      sessionId: session._id,
      studentEmail: email.toLowerCase(),
    });
    if (alreadyMarked) {
      return res.status(409).json({ message: 'Attendance already marked for this session' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({ email: email.toLowerCase(), role: 'student', name: name || '' });
    } else if (name && !user.name) {
      user.name = name;
      await user.save();
    }

    const otp = generateOtp();
    const otpHash = createHashedOtp(otp);
    const ttlMinutes = parseInt(process.env.OTP_TTL_MINUTES, 10) || 3;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await OtpRecord.create({
      email: email.toLowerCase(),
      otpHash,
      sessionToken,
      expiresAt,
    });

    await sendOtpEmail(email, otp, session.subjectName);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ message: 'Please wait 30 seconds before requesting another OTP.' });
    }
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, sessionToken } = req.body;
    if (!email || !otp || !sessionToken) {
      return res.status(400).json({ message: 'Email, OTP, and sessionToken are required' });
    }

    const { valid, sessionId } = resolveSessionFromToken(sessionToken);
    if (!valid) {
      return res.status(400).json({ message: 'QR code expired, please scan the current code' });
    }

    const session = await Session.findOne({ sessionId, isActive: true });
    if (!session) {
      return res.status(400).json({ message: 'Session not found or has ended' });
    }

    const alreadyMarked = await AttendanceRecord.findOne({
      sessionId: session._id,
      studentEmail: email.toLowerCase(),
    });
    if (alreadyMarked) {
      return res.status(409).json({ message: 'Attendance already marked for this session' });
    }

    const otpRecord = await OtpRecord.findOne({
      email: email.toLowerCase(),
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    const isValid = verifyOtp(otp, otpRecord.otpHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    otpRecord.used = true;
    await otpRecord.save();

    const user = await User.findOne({ email: email.toLowerCase() });

    await AttendanceRecord.create({
      sessionId: session._id,
      studentEmail: email.toLowerCase(),
      studentName: user?.name || '',
      tokenUsed: sessionToken,
    });

    const jwtToken = generateUserJwt({
      userId: user._id,
      email: user.email,
      role: 'student',
      name: user.name || '',
    });

    res.json({
      message: 'Attendance marked successfully',
      token: jwtToken,
      user: { email: user.email, name: user.name, role: 'student' },
    });
  } catch (err) {
    res.status(500).json({ message: 'OTP verification failed', error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
});

module.exports = router;
