import { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user?._id;

  if (!content || !content.trim())
    throw new ApiError(400, "Content is required");

  const tweet = await Tweet.create({
    content: content.trim(),
    owner: userId,
  });

  await tweet.populate("owner", "username fullName avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId || !isValidObjectId(userId))
    throw new ApiError(400, "Invalid user ID");

  const userExists = await User.exists({ _id: userId });

  if (!userExists) throw new ApiError(404, "User not found");

  const tweets = await Tweet.find({
    owner: userId,
  })
    .sort({ createdAt: -1 })
    .populate("owner", "username fullName avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Fetched tweets successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { tweetId } = req.params;
  if (!tweetId || !isValidObjectId(tweetId))
    throw new ApiError(400, "Invalid tweet ID");

  const { content } = req.body;
  if (!content || !content.trim())
    throw new ApiError(400, "content is required");

  const tweet = await Tweet.findOneAndUpdate(
    {
      _id: tweetId,
      owner: userId,
    },
    {
      content: content.trim(),
    },
    { new: true }
  ).populate("owner", "username fullName avatar");

  if (!tweet) throw new ApiError(404, "Tweet not found or unauthorized");

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { tweetId } = req.params;
  if (!tweetId || !isValidObjectId(tweetId))
    throw new ApiError(400, "Invalid tweet ID");

  const deletedTweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: userId,
  });

  if (!deletedTweet)
    throw new ApiError(404, "Tweet not found or already deleted");

  const result = {
    deleted: true,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
