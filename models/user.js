const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// User variables
const UserSchema = new Schema({
  FirstName: {
    type: String,
    required: true
  },
  LastName: {
    type: String,
    required: true
  },
  Email: {
    type: String,
    required: true,
    unique: true
  },
  Password: {
    type: String,
    required: true
  },
  // Verification code 
  VerificationCode: {
    type: String
  },
  IsVerified: {
    type: Boolean,
    default: false
  },
  LoginAttempts: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Users", UserSchema);