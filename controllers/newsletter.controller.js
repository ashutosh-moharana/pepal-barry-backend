const Newsletter = require('../models/newsletter.model');

const subscribe = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // Check if email already exists
        const existingSubscriber = await Newsletter.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({ success: false, message: "Email already subscribed" });
        }

        const newSubscriber = new Newsletter({ email });
        await newSubscriber.save();

        res.status(201).json({ success: true, message: "Successfully subscribed to newsletter" });
    } catch (error) {
        console.error("Newsletter subscription error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = { subscribe };
