const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  FirstName: { type: String, required: true, trim: true },
  LastName: { type: String, required: true, trim: true },
  Email: { type: String, required: true, unique: true, lowercase: true, match: /.+\@.+\..+/ },
  Password: { type: String, required: true, minlength: 6 },
  VerificationCode: { type: String },
  VerificationAttempts: { type: Number, default: 0 },
  IsVerified: { type: Boolean, default: false },
  LoginAttempts: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Users", UserSchema, "users");