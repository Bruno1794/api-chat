const AuthService = require('../services/AuthService');
const asyncHandler = require('../middlewares/asyncHandler');

class AuthController {
  login = asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body);

    return res.json(result);
  });

  logout = asyncHandler(async (req, res) => {
    const result = await AuthService.logout(req.user.id);

    return res.json(result);
  });

  me = asyncHandler(async (req, res) => {
    const user = await AuthService.me(req.user.id);

    return res.json(user);
  });

  changePassword = asyncHandler(async (req, res) => {
    const result = await AuthService.changePassword(req.user.id, req.body);

    return res.json(result);
  });

  refresh = asyncHandler(async (req, res) => {
    const result = await AuthService.refresh(req.body.refreshToken);

    return res.json(result);
  });
}

module.exports = new AuthController();
