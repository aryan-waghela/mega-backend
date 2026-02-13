import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const userId = req.user?._id;

  const [videoStats, subscriberStats, subscribedStats] = await Promise.all([
    Video.aggregate([
      {
        $match: {
          owner: userId,
          isPublished: true,
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likesDetails",
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likesDetails",
          },
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likesCount" },
        },
      },
    ]),
    Subscription.aggregate([
      {
        $match: {
          channel: userId,
        },
      },
      {
        $count: "totalSubscribers",
      },
    ]),
    Subscription.aggregate([
      {
        $match: {
          subscriber: userId,
        },
      },
      {
        $count: "totalChannelsSubscribed",
      },
    ]),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos: videoStats?.[0]?.totalVideos || 0,
        totalViews: videoStats?.[0]?.totalViews || 0,
        totalLikes: videoStats?.[0]?.totalLikes || 0,
        totalSubscribers: subscriberStats?.[0]?.totalSubscribers || 0,
        totalChannelsSubscribed:
          subscribedStats?.[0]?.totalChannelsSubscribed || 0,
      },
      "Fetched channel stats successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user?._id;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "desc",
    isPublished = 1,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const videos = await Video.find({
    owner: userId,
    isPublished: Boolean(parseInt(isPublished)),
  })
    .sort({ [sortBy]: order === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limitNum)
    .select("-__v");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videos,
        `Fetch all videos for the user: ${req.user?.fullName}`
      )
    );
});

export { getChannelStats, getChannelVideos };
