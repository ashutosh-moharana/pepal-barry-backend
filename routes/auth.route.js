const express = require('express');
const router = express.Router();
const {register,login, googleLogin, logoutUser} = require('../controllers/auth.controller')
const auth = require('../middleware/auth');

router.post('/register',register);
router.post('/login',login);
router.post('/google-login',googleLogin);
router.post('/logout', logoutUser);
router.get('/me', auth, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = router;