const express = require('express');
const router = express.Router();

const AttendanceRecord = require('../models/AttendanceRecord');
const Session = require('../models/Session');
const { authMiddleware, professorOnly } = require('../middleware/authMiddleware');

router.get('/session/:sessionId', authMiddleware, professorOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId, professorId: req.user.userId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const records = await AttendanceRecord.find({ sessionId: session._id }).sort({ markedAt: 1 });
    res.json({ count: records.length, records });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance records', error: err.message });
  }
});

module.exports = router;
