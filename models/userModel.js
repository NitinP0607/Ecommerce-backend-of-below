
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    cartData: {
      type: Object,
      default: {},
    },

    // Email verification
    isAccountVerified: {
      type: Boolean,
      default: false,
    },
    verifyOtpHash: {
      type: String,
      default: "",
    },
    verifyOtpExpiresAt: {
      type: Date,
      default: null,
    },

    // Password reset
    resetOtpHash: {
      type: String,
      default: "",
    },
    resetOtpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { minimize: false }
);

const userModel =
  mongoose.models.user ||
  mongoose.model("user", userSchema);

export default userModel;
