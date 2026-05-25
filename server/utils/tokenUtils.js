const jwt = require('jsonwebtoken');

function generateQrToken(sessionId) {
  const ttl = parseInt(process.env.QR_TOKEN_TTL_SECONDS, 10) || 10;
  return jwt.sign({ sessionId }, process.env.JWT_SECRET, { expiresIn: ttl });
}

function validateQrToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, sessionId: decoded.sessionId };
  } catch (e) {
    return { valid: false };
  }
}

function generateUserJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyUserJwt(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function generateSessionEntryToken(sessionId) {
  const ttl = parseInt(process.env.SESSION_ENTRY_TOKEN_TTL_SECONDS, 10) || 300;
  return jwt.sign({ type: 'session_entry', sessionId }, process.env.JWT_SECRET, { expiresIn: ttl });
}

function resolveSessionFromToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'session_entry' && decoded.sessionId) {
      return { valid: true, sessionId: decoded.sessionId };
    }
    if (decoded.sessionId && !decoded.type) {
      return { valid: true, sessionId: decoded.sessionId };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

module.exports = { generateQrToken, validateQrToken, generateUserJwt, verifyUserJwt, generateSessionEntryToken, resolveSessionFromToken };
