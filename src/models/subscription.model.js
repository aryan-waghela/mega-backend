import { channel } from "diagnostics_channel";
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId, // one who is subscribing
      ref: "User",
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId, // channel owner
      ref: "User",
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ channel: 1 });
subscriptionSchema.index({ subscriber: 1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
