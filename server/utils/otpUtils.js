const crypto = require('crypto');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp, salt) {
  const hmac = crypto.createHmac('sha256', process.env.OTP_HASH_SECRET);
  hmac.update(salt + otp);
  return hmac.digest('hex');
}

function createHashedOtp(otp) {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = hashOtp(otp, salt);
  return `${salt}:${hash}`;
}

function verifyOtp(otp, storedHash) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computedHash = hashOtp(otp, salt);
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

module.exports = { generateOtp, createHashedOtp, verifyOtp };
