const asyncHandler = require('../middlewares/asyncHandler');
const PushService = require('../services/PushService');

class PushController {
  config = asyncHandler(async (req, res) => {
    return res.json(PushService.getPublicConfig());
  });

  subscribe = asyncHandler(async (req, res) => {
    const result = await PushService.subscribe(req.body, req.headers['user-agent'] || null);

    return res.status(201).json(result);
  });

  subscribeAdmin = asyncHandler(async (req, res) => {
    const result = await PushService.subscribeAdmin(
      req.body,
      req.user,
      req.headers['user-agent'] || null
    );

    return res.status(201).json(result);
  });

  subscribePushAlert = asyncHandler(async (req, res) => {
    const result = await PushService.subscribePushAlert(req.body, req.headers['user-agent'] || null);

    return res.status(201).json(result);
  });

  subscribeAdminPushAlert = asyncHandler(async (req, res) => {
    const result = await PushService.subscribeAdminPushAlert(
      req.body,
      req.user,
      req.headers['user-agent'] || null
    );

    return res.status(201).json(result);
  });

  testAdmin = asyncHandler(async (req, res) => {
    const result = await PushService.testAdminPush(req.user);

    return res.json(result);
  });

  unsubscribe = asyncHandler(async (req, res) => {
    const result = await PushService.unsubscribe(req.body);

    return res.json(result);
  });
}

module.exports = new PushController();
