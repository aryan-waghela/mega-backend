import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid video ID");
  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "video does not exist");

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limit;

  const comments = await Comment.find({ video: videoId })
    .populate("owner", "fullName username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "All comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const userId = req.user?._id;

  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid Video ID");

  if (!content.trim()) throw new ApiError(400, "Content is required");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video does not exist");

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: userId,
  });

  if (!comment) throw new ApiError(500, "Error while adding the comment");

  const populatedComment = await Comment.findById(comment._id).populate(
    "owner",
    "username avatar fullName"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, populatedComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!content) throw new ApiError(400, "Content is required");
  if (!commentId || !isValidObjectId(commentId))
    throw new ApiError(400, "Invalid comment ID");

  const updatedComment = await Comment.findOneAndUpdate(
    { _id: commentId, owner: userId },
    { content },
    { new: true }
  );

  if (!updatedComment)
    throw new ApiError(404, "Comment not found or not authorized");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!commentId || !isValidObjectId(commentId))
    throw new ApiError(400, "Invalid comment ID");

  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: userId,
  });

  if (!deletedComment)
    throw new ApiError(404, "Comment not found or already deleted");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        result: "ok",
      },
      "Comment deleted successfully"
    )
  );
});

export { getVideoComments, addComment, updateComment, deleteComment };
