import Newsletter from "../models/Newsletter.js";

// Subscribe to newsletter
export const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ email });

    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return res.json({
          success: false,
          message: "This email is already subscribed to our newsletter",
        });
      } else {
        // Reactivate subscription
        existingSubscriber.isActive = true;
        existingSubscriber.subscribedAt = new Date();
        await existingSubscriber.save();
        return res.json({
          success: true,
          message: "Successfully resubscribed to our newsletter!",
        });
      }
    }

    // Create new subscription
    const newSubscriber = new Newsletter({
      email,
    });

    await newSubscriber.save();

    res.json({
      success: true,
      message: "Successfully subscribed to our newsletter!",
    });
  } catch (error) {
    console.error("subscribeNewsletter error", error);
    res.json({
      success: false,
      message: error.message || "Failed to subscribe. Please try again.",
    });
  }
};

