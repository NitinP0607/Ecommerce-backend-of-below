
import userModel from "../models/userModel.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt, createHash } from "crypto";
import { transporter } from "../configue/nodemailer.js";

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const generateOtp = () =>
  randomInt(100000, 1000000).toString();

const hashOtp = (otp) =>
  createHash("sha256").update(otp).digest("hex");

const otpExpiry = () =>
  new Date(Date.now() + 10 * 60 * 1000);

const sendOtpEmail = async (email, otp, purpose) => {
  const isSignup = purpose === "signup";

  return transporter.sendMail({
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: isSignup
      ? "Verify your NITRA account"
      : "NITRA password reset OTP",
    text: `Your NITRA ${isSignup ? "verification" : "password reset"
      } OTP is ${otp}. It expires in 10 minutes. Do not share this code.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px">
        <h2>NITRA</h2>
        <h3>${isSignup ? "Verify your email" : "Reset your password"}</h3>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing:8px">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};

// REGISTER — create an unverified account and email OTP
const registerUser = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    let user = await userModel.findOne({ email });

    if (user && user.isAccountVerified !== false) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const otp = generateOtp();

    if (user) {
      // Allow a pending, unverified account to request a fresh OTP.
      user.name = name;
      user.password = await bcrypt.hash(password, 10);
      user.verifyOtpHash = hashOtp(otp);
      user.verifyOtpExpiresAt = otpExpiry();
    } else {
      user = new userModel({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        isAccountVerified: false,
        verifyOtpHash: hashOtp(otp),
        verifyOtpExpiresAt: otpExpiry(),
      });
    }

    await user.save();

    try {
      console.log("REGISTER: sending OTP email");

      const info = await sendOtpEmail(email, otp, "signup");

      console.log("REGISTER: email accepted by SMTP", {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });
    } catch (mailError) {
      console.error("Signup email error:", {
        message: mailError.message,
        code: mailError.code,
        command: mailError.command,
        responseCode: mailError.responseCode,
        response: mailError.response,
      });

      return res.status(503).json({
        success: false,
        message:
          "Account is pending verification, but the email could not be sent. Please try resending the OTP.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email. Verify to activate your account.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to register right now",
    });
  }
};

// VERIFY SIGNUP OTP — activate account and issue JWT
const verifySignupOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await userModel.findOne({ email });

    if (!user || user.isAccountVerified !== false) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification request",
      });
    }

    if (
      !user.verifyOtpHash ||
      !user.verifyOtpExpiresAt ||
      user.verifyOtpExpiresAt.getTime() < Date.now() ||
      hashOtp(otp) !== user.verifyOtpHash
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    user.isAccountVerified = true;
    user.verifyOtpHash = "";
    user.verifyOtpExpiresAt = null;
    await user.save();

    return res.json({
      success: true,
      message: "Email verified and account activated",
      token: createToken(user._id),
    });
  } catch (error) {
    console.error("Verify signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP",
    });
  }
};

// RESEND SIGNUP OTP
const resendSignupOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await userModel.findOne({ email });

    if (!user || user.isAccountVerified !== false) {
      return res.json({
        success: true,
        message:
          "If your account needs verification, an OTP will be sent.",
      });
    }

    const otp = generateOtp();
    user.verifyOtpHash = hashOtp(otp);
    user.verifyOtpExpiresAt = otpExpiry();
    await user.save();

    await sendOtpEmail(email, otp, "signup");

    return res.json({
      success: true,
      message: "A new OTP has been sent",
    });
  } catch (error) {
    console.error("Resend signup OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send OTP right now",
    });
  }
};

// LOGIN
const loginUser = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await userModel.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Existing accounts without this field remain compatible.
    if (user.isAccountVerified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    return res.json({
      success: true,
      message: "Logged in successfully",
      token: createToken(user._id),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to log in right now",
    });
  }
};

// FORGOT PASSWORD — email a reset OTP
const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    const genericMessage =
      "If an eligible account exists, a password reset OTP will be sent.";

    const user = await userModel.findOne({ email });

    if (!user || user.isAccountVerified === false) {
      return res.json({
        success: true,
        message: genericMessage,
      });
    }

    const otp = generateOtp();

    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpiresAt = otpExpiry();
    await user.save();

    await sendOtpEmail(email, otp, "reset");

    return res.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process your request right now",
    });
  }
};

// RESET PASSWORD — validate OTP and save new password
const resetPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const user = await userModel.findOne({ email });

    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpiresAt ||
      user.resetOtpExpiresAt.getTime() < Date.now() ||
      hashOtp(otp) !== user.resetOtpHash
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtpHash = "";
    user.resetOtpExpiresAt = null;
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to reset your password right now",
    });
  }
};


const getUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in to view your profile",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel
      .findById(decoded.id)
      .select("-password -verifyOtpHash -resetOtpHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified ?? true,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired login session",
    });
  }
};


// ADMIN LOGIN — preserved
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        email + password,
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({ success: true, token });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
};

export {
  loginUser,
  registerUser,
  adminLogin,
  verifySignupOtp,
  resendSignupOtp,
  forgotPassword,
  resetPassword,
  getUserProfile
};
