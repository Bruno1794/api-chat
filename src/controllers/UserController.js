const asyncHandler = require('../middlewares/asyncHandler');
const UserService = require('../services/UserService');

class UserController {
  list = asyncHandler(async (req, res) => {
    const users = await UserService.list();

    return res.json(users);
  });

  create = asyncHandler(async (req, res) => {
    const user = await UserService.create(req.body);

    return res.status(201).json(user);
  });

  update = asyncHandler(async (req, res) => {
    const user = await UserService.update(req.params.id, req.body);

    return res.json(user);
  });

  delete = asyncHandler(async (req, res) => {
    const result = await UserService.delete(req.params.id);

    return res.json(result);
  });
}

module.exports = new UserController();
