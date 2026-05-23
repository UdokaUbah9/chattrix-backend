const User = require("./../models/userModel");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/AppError");
const createMailer = require("../utils/nodeMailer");
const PendingUser = require("./../models/pendingUserModel");
const crypto = require("crypto");

/////////////////////////////////////////////////////////////////////////////////////////////////
// LOGIN CONTROLLER
exports.login = catchAsync(async function (req, res, next) {
  console.log("📥 body:", req.body); // ← one line
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  console.log(user);
  if (!user || !(await user.checkPassword(password, user.password))) {
    return next(new AppError("Incorrect username or password", 401));
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.EXPIRES_IN,
  });

  user.password = undefined;
  res.status(200).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
});

/////////////////////////////////////////////////////////////////////////////////////////////
// PROTECCT CONTROLLER
exports.protect = catchAsync(async function (req, res, next) {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You're not logged in, please login", 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    return next(new AppError("You're not logged in, please login", 401));
  }
  req.user = user;
  next();
});

////////////////////////////////////////////////////////////////////////////////////////
// RESTRICTED TO CONTROLLER
exports.restrictedTo = function (...allowed) {
  return function (req, res, next) {
    if (!allowed.includes(req.user.role)) {
      return next(
        new AppError("You're not allowed to perform this action", 403),
      );
    }
    next();
  };
};

//////////////////////////////////////////////////////////////////////////////////////////
// CREATE AND SEND OTP CONTROLLER
exports.createAndSendOtp = catchAsync(async function (req, res, next) {
  const { email, username, password } = req.body;

  // Validation
  if (!email || !username || !password) {
    return next(new AppError("Missing signup information", 400));
  }

  // Check both at once to save a DB round-trip
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return next(new AppError("Email or Username already exists", 400));
  }

  // Generate OTP
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

  // FIX: Added 'await' here
  await PendingUser.create({
    email,
    username,
    password, // Ensure your model hashes this!
    otp: otpCode,
  });

  // 4️⃣ Send Email
  try {
    const nodeMailer = createMailer();
    await nodeMailer({
      email,
      subject: "Your Chattrix App Verification Code",
      text: `Your code is: ${otpCode}. It expires in 10 minutes.`,
    });
  } catch (err) {
    // If email fails, don't leave a ghost record in the DB
    await PendingUser.deleteOne({ email });
    return next(
      new AppError("Email could not be sent. Please try again.", 500),
    );
  }

  // 5️⃣ Final Response
  res.status(200).json({
    status: "success",
    message: "OTP sent to your email!",
  });
});

////////////////////////////////FORGET PASSWORD CREATE OTP FUNCTION////////////////////////////////
exports.createAndSendForgottenPasswordOtp = catchAsync(
  async function (req, res, next) {
    const { email } = req.body;

    // Validation
    if (!email) {
      return next(new AppError("Missing signup information", 400));
    }

    // Check if the email has an account with SMILE
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return next(new AppError("No user found with that email address", 404));
    }

    // Generate OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const hashedOtp = crypto.createHash("sha256").update(otpCode).digest("hex");

    // Manage "Waiting Room" (PendingUser)
    // Clean up any old attempts first
    await PendingUser.deleteOne({ email });

    existingUser.passwordResetToken = hashedOtp;
    existingUser.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minute expiry

    // We use validateBeforeSave: false because we aren't updating the password yet
    await existingUser.save({ validateBeforeSave: false });
    // 4️⃣ Send Email
    try {
      const nodeMailer = createMailer();
      await nodeMailer({
        email,
        subject: "Your Chattrix App Verification Code",
        text: `Your code is: ${otpCode}. It expires in 10 minutes.`,
      });
    } catch (err) {
      existingUser.passwordResetToken = undefined;
      existingUser.passwordResetExpires = undefined;
      await existingUser.save({ validateBeforeSave: false });
      return next(
        new AppError("Email could not be sent. Please try again.", 500),
      );
    }

    // 5️⃣ Final Response
    res.status(200).json({
      status: "success",
      message: "OTP sent to your email!",
    });
  },
);

/////////////////////VERIFY USER OTP////////////////////
exports.verifyResetOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Please provide email and OTP", 400));
  }

  // Hash the OTP provided by the user to compare it with the one in DB
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  //  Find user where email matches, hashed OTP matches, and it hasn't expired
  const user = await User.findOne({
    email,
    passwordResetToken: hashedOtp,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  //  generate the ACTUAL Reset Token for the next page
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash this new token and save it to the user record
  // This replaces the OTP hash in the database
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Keep the same expiry or extend it by another 10 minutes for the reset form
  await user.save({ validateBeforeSave: false });

  //Send the UNHASHED token to the frontend
  res.status(200).json({
    status: "success",
    token: resetToken, // This is what your frontend is waiting for!
  });
});

//////////////////////////////////////////////////////////////////////////////////////////////
// SIGNUP CONTROLLER
exports.signup = catchAsync(async function (req, res, next) {
  const { email, otp } = req.body;

  const pendingUser = await PendingUser.findOne({ email });

  if (!pendingUser) {
    return next(new AppError("Otp already expired, Please signup again.", 401));
  }

  // Check match
  if (!pendingUser.compareOtp(String(otp), String(pendingUser.otp))) {
    return next(new AppError("Invalid OTP", 400));
  }

  const user = await User.create({
    email: pendingUser.email,
    username: pendingUser.username,
    password: pendingUser.password,
    passwordConfirm: pendingUser.password, // Add this line!
  });

  // CLEAR THE PENDING USER
  await PendingUser.deleteOne({ email });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.EXPIRES_IN,
  });

  res.status(201).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////
// FORGOT PASSWORD CONTROLLER
exports.forgotPassword = catchAsync(async function (req, res, next) {
  const { email } = req.body;

  // Get the User
  const user = await User.findOne({ email });

  // Check if User exist
  if (!user) {
    return next(new AppError("Email not found", 404));
  }

  const resetToken = await user.createResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get(
    "host",
  )}/api/v1/smile/resetpassword/${resetToken}`;

  const nodeMailer = createMailer();

  await nodeMailer({
    email: user.email,
    subject: "Reset Your Smile App Password",
    text: `Hello,

You requested to reset your Smile App password.

Click the link below to set a new password:

${resetUrl}

This link will expire in 10 minutes.

If you did not request this, please ignore this email.

Thank you,  
The Smile App Team
`,
  });

  res.status(200).json({
    status: "success",
    message: "Password reset link sent to email",
  });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//RESET PASSWORD CONTROLLER
exports.resetPassword = catchAsync(async function (req, res, next) {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  const passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Find the user with this token and check expiration
  const user = await User.findOne({
    passwordResetToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Invalid or expired token", 400));
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;

  //  Clear reset token
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password successfully updated",
  });
});

exports.getMe = catchAsync(async function (req, res, next) {
  const user = req.user;
  const { email, username } = req.body;

  if (!user) {
    return next(new AppError("You're not logged in, Please log in", 400));
  }

  if (email !== user.email || username !== user.username)
    return next(new AppError("HACKER ALERT", 401));

  res.status(200).json({
    status: "success",
    data: {
      data: user,
    },
  });
});

///////////////////////// CHANGE PASSWORD CONTROLLER ////////////////////////////
exports.changePassword = catchAsync(async function (req, res, next) {
  const { password, newPassword, confirmPassword, id } = req.body;
  const user = await User.findById(id).select("+password");
  if (!user) {
    return next(new AppError("No user found", 404));
  }

  if (!(await user.checkPassword(password, user.password))) {
    return next(new AppError("Incorrect current password", 400));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError("Password do not match", 400));
  }

  user.password = newPassword;
  user.passwordConfirm = confirmPassword;
  await user.save();

  //Cleanup for response
  user.password = undefined;

  res.status(200).json({
    status: "success",
    message: "Password successully changed",
  });
});

////////////////////////////////////////////////////////////////////////////////////////////
exports.logout = (req, res) => {
  res.cookie("token", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000), // Expire almost immediately
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
    message: "User logged out successfully",
  });
};
