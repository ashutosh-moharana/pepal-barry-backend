const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();
const app = express();

// Trust the first proxy (Render/Heroku/etc)
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Security Middleware
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resource loading from other origins (like avatars)
  })
);

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
connectDB();

app.get("/", (req, res) => {
  res.send("Server is Running ....");
});

app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/products", require("./routes/products.route"));
app.use("/api/orders", require("./routes/orders.route"));

const PORT = process.env.PORT || 5000;
const path = require("path");

// Serve static files from the React client
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client", "dist", "index.html"));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});