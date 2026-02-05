const express = require('express');
const router = express.Router();
const { subscribe } = require('../controllers/newsletter.controller');

router.post('/', subscribe);

module.exports = router;
