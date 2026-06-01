const ApiError = require('../utils/ApiError');

function permit(...roles) {
  return function permissionHandler(req, res, next) {
    if (!req.user) {
      return next(new ApiError('User not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError('You don\'t have permission to access this resource', 403));
    }

    return next();
  };
}

module.exports = permit;