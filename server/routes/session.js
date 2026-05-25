const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const Session = require('../models/Session');
const AttendanceRecord = require('../models/AttendanceRecord');
const { authMiddleware, professorOnly } = require('../middleware/authMiddleware');
const { generateQrToken } = require('../utils/tokenUtils');

router.post('/create', authMiddleware, professorOnly, async (req, res) => {
  try {
    const { subjectCode, subjectName } = req.body;
    if (!subjectCode || !subjectName) {
      return res.status(400).json({ message: 'subjectCode and subjectName are required' });
    }

    const sessionId = uuidv4();
    const currentToken = generateQrToken(sessionId);

    const session = await Session.create({
      sessionId,
      professorId: req.user.userId,
      subjectCode,
      subjectName,
      currentToken,
      tokenGeneratedAt: new Date(),
    });

    res.status(201).json({ sessionId: session.sessionId, message: 'Session created' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create session', error: err.message });
  }
});

router.post('/refresh-token/:sessionId', authMiddleware, professorOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId, professorId: req.user.userId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.isActive) {
      return res.status(400).json({ message: 'Session has ended' });
    }

    const newToken = generateQrToken(sessionId);
    session.currentToken = newToken;
    session.tokenGeneratedAt = new Date();
    await session.save();

    res.json({ token: newToken });
  } catch (err) {
    res.status(500).json({ message: 'Failed to refresh token', error: err.message });
  }
});

router.get('/history', authMiddleware, professorOnly, async (req, res) => {
  try {
    const sessions = await Session.find({ professorId: req.user.userId }).sort({ createdAt: -1 });

    const sessionsWithCount = await Promise.all(
      sessions.map(async (session) => {
        const count = await AttendanceRecord.countDocuments({ sessionId: session._id });
        return {
          sessionId: session.sessionId,
          subjectCode: session.subjectCode,
          subjectName: session.subjectName,
          date: session.date,
          isActive: session.isActive,
          attendanceCount: count,
          createdAt: session.createdAt,
        };
      })
    );

    res.json(sessionsWithCount);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch session history', error: err.message });
  }
});

router.get('/:sessionId/attendance', authMiddleware, professorOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId, professorId: req.user.userId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const records = await AttendanceRecord.find({ sessionId: session._id }).sort({ markedAt: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
});

router.get('/:sessionId/export-csv', authMiddleware, professorOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId, professorId: req.user.userId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const records = await AttendanceRecord.find({ sessionId: session._id }).sort({ markedAt: 1 });

    const { Parser } = require('json2csv');
    const fields = [
      { label: 'Student Name', value: 'studentName' },
      { label: 'Email', value: 'studentEmail' },
      { label: 'Time Marked', value: 'markedAt' },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(records.map((r) => ({
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      markedAt: new Date(r.markedAt).toLocaleString(),
    })));

    const filename = `attendance_${session.subjectCode}_${new Date(session.date).toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export CSV', error: err.message });
  }
});

router.patch('/:sessionId/reactivate', authMiddleware, professorOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId, professorId: req.user.userId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const TWO_HOURS = 2 * 60 * 60 * 1000;
    if (Date.now() - new Date(session.createdAt).getTime() > TWO_HOURS) {
      return res.status(400).json({ message: 'Session can no longer be restarted (2-hour window has passed)' });
    }

    session.isActive = true;
    session.currentToken = generateQrToken(sessionId);
    session.tokenGeneratedAt = new Date();
    await session.save();

    res.json({ sessionId: session.sessionId, message: 'Session reactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reactivate session', error: err.message });
  }
});

router.patch('/:sessionId/end', authMiddleware, professorOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId, professorId: req.user.userId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.isActive = false;
    await session.save();
    res.json({ message: 'Session ended successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to end session', error: err.message });
  }
});

module.exports = router;
