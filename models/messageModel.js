const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.ObjectId, ref: "User" },
  receiverId: { type: mongoose.Schema.ObjectId, ref: "User" },
  text: String,
  image: String,
  status: {
    type: String,
    enum: ["sending", "sent", "delivered", "read"],
    default: "sending",
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
