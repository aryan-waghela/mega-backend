import { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "Video does not exist");

  const deleted = await Like.findOneAndDelete({
    likedBy: userId,
    video: videoId,
  });

  if (deleted) {
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Video unliked"));
  }

  await Like.create({
    likedBy: userId,
    video: videoId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Video liked"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!commentId || !isValidObjectId(commentId))
    throw new ApiError(400, "Invalid comment ID");

  const comment = await Comment.findById(commentId);

  if (!comment) throw new ApiError(404, "Comment does not exist");

  const deleted = await Like.findOneAndDelete({
    likedBy: userId,
    comment: commentId,
  });

  if (deleted) {
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Comment unliked"));
  }

  await Like.create({
    likedBy: userId,
    comment: commentId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Comment liked"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!tweetId || !isValidObjectId(tweetId))
    throw new ApiError(400, "Invalid tweet ID");

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) throw new ApiError(404, "Tweet does not exist");

  const deleted = await Like.findOneAndDelete({
    likedBy: userId,
    tweet: tweetId,
  });

  if (deleted) {
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Tweet unliked"));
  }

  await Like.create({
    likedBy: userId,
    tweet: tweetId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Tweet liked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: userId,
        video: {
          $ne: null,
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
      },
    },
    {
      $unwind: "$likedVideos",
    },
    {
      $project: {
        likedVideos: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideos,
        `Fetched all the liked videos by ${req.user.fullName}`
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
