const asyncHandler = require('../middlewares/asyncHandler');
const ClienteService = require('../services/ClienteService');

class ClienteController {
  list = asyncHandler(async (req, res) => {
    const clientes = await ClienteService.list(req.query);

    return res.json(clientes);
  });

  show = asyncHandler(async (req, res) => {
    const cliente = await ClienteService.findById(req.params.id);

    return res.json(cliente);
  });

  search = asyncHandler(async (req, res) => {
    const clientes = await ClienteService.search(req.query.search || req.query.q);

    return res.json(clientes);
  });
}

module.exports = new ClienteController();
