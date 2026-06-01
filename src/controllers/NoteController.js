const asyncHandler = require('../middlewares/asyncHandler');
const NoteService = require('../services/NoteService');

class NoteController {
  list = asyncHandler(async (req, res) => {
    const notes = await NoteService.list(req.params.conversationId, req.user);

    return res.json(notes);
  });

  create = asyncHandler(async (req, res) => {
    const note = await NoteService.create(req.body, req.user);

    return res.status(201).json(note);
  });

  delete = asyncHandler(async (req, res) => {
    const result = await NoteService.delete(req.params.id, req.user);

    return res.json(result);
  });
}

module.exports = new NoteController();
