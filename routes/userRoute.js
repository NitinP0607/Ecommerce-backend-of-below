
import express from "express";

import {
  loginUser,
  registerUser,
  adminLogin,
  verifySignupOtp,
  resendSignupOtp,
  forgotPassword,
  resetPassword,
  getUserProfile,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/verify-signup-otp", verifySignupOtp);
userRouter.post("/resend-signup-otp", resendSignupOtp);

userRouter.get("/profile", getUserProfile);

userRouter.post("/login", loginUser);
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);

userRouter.post("/admin", adminLogin);

export default userRouter;
