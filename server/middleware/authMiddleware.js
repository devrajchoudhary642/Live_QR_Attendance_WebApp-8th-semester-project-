const { verifyUserJwt } = require('../utils/tokenUtils');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH-MIDDLEWARE] No token provided for:', req.path);
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyUserJwt(token);
    req.user = decoded;
    console.log('[AUTH-MIDDLEWARE] ✓ Token verified for user:', decoded.email);
    next();
  } catch (err) {
    console.log('[AUTH-MIDDLEWARE] ✗ Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function professorOnly(req, res, next) {
  if (req.user?.role !== 'professor') {
    console.log('[AUTH-MIDDLEWARE] ✗ Access denied - not a professor:', req.user?.email);
    return res.status(403).json({ message: 'Access restricted to professors' });
  }
  console.log('[AUTH-MIDDLEWARE] ✓ Professor access granted:', req.user?.email);
  next();
}

module.exports = { authMiddleware, professorOnly };
