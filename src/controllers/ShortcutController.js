const asyncHandler = require('../middlewares/asyncHandler');
const ShortcutService = require('../services/ShortcutService');

class ShortcutController {
  list = asyncHandler(async (req, res) => {
    const shortcuts = await ShortcutService.list({
      user: req.user,
      query: req.query
    });

    return res.json(shortcuts);
  });

  suggestions = asyncHandler(async (req, res) => {
    const shortcuts = await ShortcutService.suggestions({
      user: req.user,
      query: req.query.q || req.query.search || ''
    });

    return res.json(shortcuts);
  });

  create = asyncHandler(async (req, res) => {
    const shortcut = await ShortcutService.create(req.body, req.user);

    return res.status(201).json(shortcut);
  });

  update = asyncHandler(async (req, res) => {
    const shortcut = await ShortcutService.update(req.params.id, req.body, req.user);

    return res.json(shortcut);
  });

  delete = asyncHandler(async (req, res) => {
    const result = await ShortcutService.delete(req.params.id, req.user);

    return res.json(result);
  });
}

module.exports = new ShortcutController();
