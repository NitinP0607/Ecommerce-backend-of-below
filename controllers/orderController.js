import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// Razorpay instance
const razorPayInstances = new Razorpay({
  key_id: process.env.RP_API_KEY,
  key_secret: process.env.RP_SECRET_KEY,
});

// Place COD Order
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    if (
      !userId ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !address ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order details",
      });
    }

    const orderData = {
      userId,
      items,
      address,
      amount: Number(amount),
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    return res.json({
      success: true,
      message: "Order placed successfully",
    });
  } catch (error) {
    console.error("COD order error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to place order",
    });
  }
};

// Stripe placeholder
const placeorderStripe = async (req, res) => {
  return res.status(501).json({
    success: false,
    message: "Stripe payment is not implemented yet",
  });
};

// Place Razorpay Order
const placeRazorpay = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    if (
      !userId ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !address ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order details",
      });
    }

    if (!process.env.RP_API_KEY || !process.env.RP_SECRET_KEY) {
      console.error("Razorpay environment variables are missing");

      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured",
      });
    }

    const totalAmount = Math.round(Number(amount) * 100);

    // Create Razorpay order first
    const razorpayOrder = await razorPayInstances.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    // Save order in MongoDB
    const newOrder = new orderModel({
      userId,
      items,
      address,
      amount: Number(amount),
      paymentMethod: "Razorpay",
      payment: false,
      date: Date.now(),
    });

    await newOrder.save();

    // Return both IDs for frontend integration
    return res.json({
      success: true,
      order: razorpayOrder,
      orderId: newOrder._id,
      key: process.env.RP_API_KEY,
      message: "Razorpay order created successfully",
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create Razorpay order",
    });
  }
};

// Verify Razorpay Payment
const verifyRazorpay = async (req, res) => {
  try {
    const {
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !userId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification details",
      });
    }

    // Verify signature using Razorpay secret
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RP_SECRET_KEY)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const signatureBuffer = Buffer.from(razorpay_signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Fetch payment details from Razorpay
    const payment = await razorPayInstances.payments.fetch(
      razorpay_payment_id
    );

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or does not match the order",
      });
    }

    // Find the existing database order using its Razorpay order ID.
    // Store razorpayOrderId in your order schema before using this lookup.
    const order = await orderModel.findOne({
      userId,
      razorpayOrderId: razorpay_order_id,
      paymentMethod: "Razorpay",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (Number(payment.amount) !== Math.round(Number(order.amount) * 100)) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match the order",
      });
    }

    order.payment = true;
    await order.save();

    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    return res.json({
      success: true,
      message: "Payment verified and order placed successfully",
    });
  } catch (error) {
    console.error("Razorpay verification error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};

// Get all orders (Admin)
const allOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Fetch all orders error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user orders
const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const orders = await orderModel.find({ userId });

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Fetch user orders error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update order status (Admin)
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "Order ID and status are required",
      });
    }

    const order = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  placeOrder,
  placeorderStripe,
  placeRazorpay,
  allOrders,
  userOrders,
  updateStatus,
  verifyRazorpay,
};
