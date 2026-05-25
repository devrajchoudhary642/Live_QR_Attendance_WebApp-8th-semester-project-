const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    console.log('[RATE-LIMITER] Global limit exceeded for IP:', req.ip);
    res.status(429).json({ message: 'Too many requests, please try again later.' });
  },
});

const otpSendLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 1,
  keyGenerator: (req) => req.body?.email?.toLowerCase() || req.ip,
  message: { message: 'Please wait 30 seconds before requesting another OTP.' },
  skipFailedRequests: false,
  handler: (req, res) => {
    const email = req.body?.email?.toLowerCase() || req.ip;
    console.log('[RATE-LIMITER] OTP request limit exceeded for:', email);
    res.status(429).json({ message: 'Please wait 30 seconds before requesting another OTP.' });
  },
});

console.log('[RATE-LIMITER] Rate limiters initialized');
module.exports = { globalLimiter, otpSendLimiter };
