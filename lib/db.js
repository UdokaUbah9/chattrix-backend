const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });
const DB = process.env.MONGO_URL.replace(
  "<PASSWORD>",
  process.env.MONGO_PASSWORD,
);

const connectDB = async function () {
  try {
    await mongoose.connect(DB);

    console.log("DB successfully connected");
  } catch (err) {
    console.log("failed connecting to DB", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
