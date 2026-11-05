const express = require('express');
const logistics = require('../services/documentLogisticsLookupService');
const router = express.Router();
// Mounted beneath the authenticated /api middleware. Company comes from that context.
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
const read = handler => async (req, res, next) => {
  try { res.json(await handler(req)); } catch (error) { next(error); }
};
router.get('/options', read(() => logistics.getOptions()));
router.get('/channels', read(req => logistics.findChannels({ query: req.query.query || req.query.search || '', top: req.query.top, skip: req.query.skip })));
router.get('/channels/:cardCode', read(req => logistics.getChannel(req.params.cardCode)));
module.exports = router;
