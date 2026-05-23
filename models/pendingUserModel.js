const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const pendingUserSchema = mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

pendingUserSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

pendingUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Hash the password before saving to the "waiting room"
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

pendingUserSchema.methods.compareOtp = function (inputedOtp, storedOtp) {
  return inputedOtp === storedOtp;
};
module.exports = mongoose.model("PendingUser", pendingUserSchema);
