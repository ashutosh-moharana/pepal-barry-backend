const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  picture: { type: String, default: "" },
  provider: { type: String, default: null },
  googleId: { type: String, default: null },
  password: { type: String, default: null },
  role: { type: String, enum: ["user", "admin"], default: "user" },

  cart: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
      quantity: { type: Number }
    }
  ]
}, { timestamps: true })



module.exports = mongoose.model("user", userSchema);
