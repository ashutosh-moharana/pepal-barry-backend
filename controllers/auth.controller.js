const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const jwt = require("jsonwebtoken");

const User = require("../models/user.model");

const register = async (req, res) => {
  const { name, email, password } = req.body;

  let user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({ success: false, message: "User already exists." });
  }

  bcrypt.genSalt(saltRounds, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      const createdUser = await User.create({
        name,
        email,
        password: hash,
        provider: "local",
        picture: `https://avatar.iran.liara.run/username?username=${name}`,
      });

      const token = jwt.sign(
        { userId: createdUser._id, email: createdUser.email },
        process.env.JWT_SECRET
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      res.status(200).json({ success: true, message: "User registered successfully", user: createdUser, token });
    });
  });

};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ success: false, message: "User is not registered!" });
  }


  bcrypt.compare(password, user.password, async function (err, result) {
    if (!result) {
      return res.status(400).json({ success: false, message: "Wrong Credentials" })
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({ success: true, message: "User logged in successfully", user, token });
  });


};

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const googleLogin = async (req, res) => {
  const { code } = req.body;
  console.log(code);
  try {
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, name, email, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        picture,
        googleId,
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // must be false for localhost (not https)
      sameSite: "lax", // controls cross-site behavior
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({ user, token });
  } catch (err) {
    console.log(err);
  }
};

module.exports = { register, login, googleLogin };
