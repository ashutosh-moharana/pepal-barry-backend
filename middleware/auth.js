const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

module.exports = async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : null;
    const token = tokenFromHeader || req.cookies?.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    req.user.userId = user._id; // For backward compatibility
    next();
  } catch (error) {
    console.error("Auth middleware error", error);
    res.clearCookie("token");
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

