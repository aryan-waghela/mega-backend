import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { log } from "console";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!channelId || !isValidObjectId(channelId))
    throw new ApiError(400, "Invalid channel ID");

  const channel = await User.findById(channelId);
  if (!channel) throw new ApiError(404, "Channel not found");

  if (userId.equals(channelId))
    throw new ApiError(400, "Cannot subscribe own channel");

  const subscription = await Subscription.findOneAndDelete({
    subscriber: userId,
    channel: channelId,
  });

  const result = {};

  if (subscription) {
    result.subscribed = false;

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Channel unsubscribed successfully"));
  }

  await Subscription.create({
    subscriber: userId,
    channel: channelId,
  });

  result.subscribed = true;

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Channel subscribed successfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId || !isValidObjectId(channelId))
    throw new ApiError(400, "Invalid channel ID");

  const channelExists = await User.exists({ _id: channelId });
  if (!channelExists) throw new ApiError(404, "channel not found");

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribers",
    },
    {
      $project: {
        _id: 0,
        subscriberId: "$subscribers._id",
        fullName: "$subscribers.fullName",
        username: "$subscribers.username",
        avatar: "$subscribers.avatar",
      },
    },
  ]);

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  const result = {
    subscribersCount: totalSubscribers,
    subscribers,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Fetched subscribers successfully"));
});

export { toggleSubscription, getUserChannelSubscribers };
