const cloudinary = require("../utils/cloudinary");
const Message = require("../models/messageModel");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");

exports.getAllMessages = catchAsync(async function (req, res, next) {
  // console.log("User from protect middleware:", req.user);
  const userId = req.user._id;

  // console.log(userId);

  const messages = await Message.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
  }).sort({ createdAt: -1 });

  if (!messages || messages.length === 0) {
    return res.status(200).json({
      status: "success",
      results: 0,
      data: { data: [] },
    });
  }

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: {
      data: messages,
    },
  });
});

// GET MESSAGES
exports.getMessage = catchAsync(async function (req, res, next) {
  const senderId = req.user._id;
  const { receiverId } = req.params;
  const messages = await Message.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId },
    ],
  }).sort({ createdAt: 1 });

  const friend = await User.findById(receiverId).select("-password");

  res.status(200).json({
    status: "success",
    data: {
      messages,
      friend,
    },
  });
});

// SEND MESSAGES
exports.sendMessage = catchAsync(async function (req, res, next) {
  let { text, image } = req.body;
  const senderId = req.user._id;
  const { receiverId } = req.params;

  if (!text && !image) {
    next(new AppError("please type a message or upload an image", 400));
  }

  let imageUrl = "";
  if (image) {
    const result = await cloudinary.uploader.upload(image, {
      folder: "smile_chat", // Optional: keeps your Cloudinary clean!
    });
    imageUrl = result.secure_url;
  }

  const newMessage = await Message.create({
    senderId,
    receiverId,
    text,
    image: imageUrl,
  });

  const io = req.app.get("socketio");
  const userSocketMap = req.app.get("userSocketMap"); // Grab the map we defined in server.js
  const receiverSocketId = userSocketMap[receiverId];

  if (receiverSocketId) {
    // Send only to the specific person
    io.to(receiverSocketId).emit("receive-message", newMessage);
  }

  res.status(200).json({
    status: "success",
    data: {
      data: newMessage,
    },
  });
});

// DELETE MESSAGE
exports.deleteMessage = catchAsync(async function (req, res, next) {
  const senderId = req.user._id;
  const { messageId } = req.params;

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    {
      text: "This message was deleted",
      image: "",
      isDeleted: true,
    },
    { new: true },
  );

  if (!updatedMessage) {
    return next(
      new AppError(
        "No message found with that ID or you are not authorized to delete it",
        404,
      ),
    );
  }

  res.status(200).json({
    result: "success",
    message: "Message deleted successfully",
  });
});
