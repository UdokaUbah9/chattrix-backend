const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const cloudinary = require("../utils/cloudinary");
const Message = require("../models/messageModel");

// Get all users
// Get all users with Backend Shuffling & Search
exports.getUsers = catchAsync(async function (req, res, next) {
  const searchTerm = req.query.search;
  let pipeline = [];

  // 1. Exclude main user
  pipeline.push({ $match: { _id: { $ne: req.user._id } } });

  if (searchTerm) {
    // 2. Search Mode: Matches across the ENTIRE database
    pipeline.push({
      $match: {
        $or: [
          { username: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
        ],
      },
    });
    // Alphabetical sort prevents flickering while typing
    pipeline.push({ $sort: { username: 1 } });
  } else {
    // 3. Discovery Mode: Shuffle ALL users without a hard limit
    pipeline.push(
      { $addFields: { randomKey: { $rand: {} } } },
      { $sort: { randomKey: 1 } },
    );
  }

  // 4. Security Project
  pipeline.push({
    $project: { password: 0, __v: 0, randomKey: 0 },
  });

  const users = await User.aggregate(pipeline);
  res.status(200).json({
    status: "success",
    results: users.length,
    data: { users },
  });
});
// Get a user
exports.getUser = catchAsync(async function (req, res, next) {
  const { id } = req.params;
  const user = await User.findById(id).select("-password");

  //Sending the response
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

///////////////////////// GET CHAT USERS //////////////////////
exports.getChatUsers = catchAsync(async function (req, res, next) {
  const userId = req.user._id;

  // Get all messages involving this user
  const messages = await Message.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
  }).sort({ createdAt: 1 });

  // Get unique user IDs from conversations
  const chattedUserIds = new Set();
  const lastMessageMap = {};

  for (const msg of messages) {
    const otherId =
      String(msg.senderId) === String(userId)
        ? String(msg.receiverId)
        : String(msg.senderId);

    chattedUserIds.add(otherId);
    lastMessageMap[otherId] = msg; // last write = newest since sorted asc
  }

  if (chattedUserIds.size === 0) {
    return res.status(200).json({
      status: "success",
      data: { users: [] },
    });
  }

  // Fetch only those users
  const users = await User.find({
    _id: { $in: [...chattedUserIds] },
  }).select("-password -__v");

  // Sort users by last message time
  const sorted = users.sort((a, b) => {
    const lastA = lastMessageMap[String(a._id)];
    const lastB = lastMessageMap[String(b._id)];
    const timeA = lastA ? new Date(lastA.createdAt).getTime() : 0;
    const timeB = lastB ? new Date(lastB.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  res.status(200).json({
    status: "success",
    data: { users: sorted },
  });
});
/////////////////////////////////////////////////////////////

// Update current user profile
exports.updateMe = catchAsync(async function (req, res, next) {
  req.params.id = req.user.id;

  // Upload image to cloudinary
  if (req.body.avatar) {
    const result = await cloudinary.uploader.upload(req.body.avatar, {
      folder: "smile_avatars",
    });
    req.body.avatar = result.secure_url;
  }

  // Filter the updated field
  const filterObj = function (obj, ...allowed) {
    let newObj = {};
    allowed.forEach((el) => {
      if (Object.keys(obj).includes(el)) newObj[el] = obj[el];
    });
    return newObj;
  };

  //Updating the user
  const user = await User.findByIdAndUpdate(
    req.params.id,
    filterObj(req.body, "username", "avatar"),
    {
      new: true,
      runValidators: true,
    },
  );

  //Sending the response
  res.status(200).json({
    status: "success",
    user,
  });
});
