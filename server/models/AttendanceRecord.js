const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  studentEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  studentName: {
    type: String,
    trim: true,
  },
  markedAt: {
    type: Date,
    default: Date.now,
  },
  tokenUsed: {
    type: String,
  },
});

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
