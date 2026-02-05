const crypto = require("crypto");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const razorpay = require("../config/razorpay");

const buildProductsPayload = (products = []) =>
  products.map((item) => ({
    productId: item.productId,
    quantity: Math.max(1, Number(item.quantity) || 1),
  }));

const createCODOrder = async (req, res) => {
  try {
    const { products, totalAmount, address } = req.body;
    if (!products?.length || !totalAmount || !address) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order payload" });
    }

    let order = await Order.create({
      user: req.user.userId,
      products: buildProductsPayload(products),
      totalAmount,
      shippingAddress: address,
      mode: "Cash On Delivery",
    });

    order = await order.populate("products.productId");



    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error("COD order creation failed", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const { products, totalAmount, address } = req.body;
    if (!products?.length || !totalAmount || !address) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order payload" });
    }

    const amountInPaise = Math.round(totalAmount * 100);
    const isDemoMode =
      !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrder = {
      id: `demo_${Date.now()}`,
      amount: amountInPaise,
      currency: "INR",
    };

    if (!isDemoMode) {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `pepalbarry_${Date.now()}`,
      });
    }

    const order = await Order.create({
      user: req.user.userId,
      products: buildProductsPayload(products),
      totalAmount,
      shippingAddress: address,
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: "pending",
      mode: "Razorpay",
    });



    res.status(201).json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_demoKey",
      demo: isDemoMode,
    });
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } =
      req.body;

    const isDemoMode =
      !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

    if (!isDemoMode) {
      const generatedSignature = crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET || "demoSecret"
        )
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid payment signature" });
      }
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, razorpayOrderId: razorpay_order_id },
      {
        paymentStatus: "paid",
        razorpayPaymentId: razorpay_payment_id,
      },
      { new: true }
    ).populate("products.productId");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Payment verification failed", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.userId,
      $or: [
        { mode: "Cash On Delivery" },
        { mode: "Razorpay", paymentStatus: "paid" },
      ],
    })
      .populate("products.productId")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Fetching orders failed", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { mode: "Cash On Delivery" },
        { mode: "Razorpay", paymentStatus: "paid" },
      ],
    })
      .populate("products.productId")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Fetching all orders failed", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const updateData = {};

    if (status) updateData.deliveryStatus = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Updating order status failed", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const handleRazorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "webhook_secret";
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing signature" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (generatedSignature !== signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const event = req.body;

    if (event.event === "payment.captured") {
      const { order_id, id: payment_id } = event.payload.payment.entity;

      const order = await Order.findOneAndUpdate(
        { razorpayOrderId: order_id },
        {
          paymentStatus: "paid",
          razorpayPaymentId: payment_id,
        },
        { new: true }
      );

      if (order) {
        console.log(`Order ${order._id} marked as paid via webhook`);
      } else {
        console.warn(`Order not found for Razorpay Order ID: ${order_id}`);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook processing failed", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createCODOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  handleRazorpayWebhook,
};
