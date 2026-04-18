const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

const isWorker = (req, res, next) => {
  if (req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Worker role required.'
    });
  }
  next();
};

const isEmployer = (req, res, next) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Employer role required.'
    });
  }
  next();
};

const isEmployerOrWorker = (req, res, next) => {
  if (req.user.role !== 'employer' && req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Employer or Worker role required.'
    });
  }
  next();
};

module.exports = { auth, isWorker, isEmployer, isEmployerOrWorker };
