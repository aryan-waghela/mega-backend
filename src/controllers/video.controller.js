import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { randomUUID } from "crypto";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const matchConditions = {};

  if (query) {
    matchConditions.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (userId) {
    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");

    requestedUserId = new mongoose.Types.ObjectId(userId);

    matchConditions.owner = requestedUserId;

    if (!requestedUserId.equals(req.user._id)) {
      matchConditions.isPublished = true;
    }
  } else {
    matchConditions.isPublished = true;
  }

  const sortOptions = {};

  if (sortBy && sortType) {
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    sortOptions.createdAt = -1;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const videos = await Video.aggregate([
    {
      $match: matchConditions,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
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
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $unset: "ownerDetails",
    },
    {
      $sort: sortOptions,
    },
    {
      $skip: skip,
    },
    {
      $limit: limitNum,
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description)
    throw new ApiError(400, "title and description is required");

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath)
    throw new ApiError(400, "videoFile and Thumbnail is required");

  const videoFilePublicId = `video-${randomUUID()}`;
  const thumbnailPublicId = `thumbnail-${randomUUID()}`;

  const videoFile = await uploadOnCloudinary(
    videoFileLocalPath,
    videoFilePublicId
  );

  const thumbnail = await uploadOnCloudinary(
    thumbnailLocalPath,
    thumbnailPublicId
  );

  if (!videoFile || !thumbnail)
    throw new ApiError(
      400,
      "Something went wrong while uploading videoFile/thumbnail to cloudinary"
    );

  const createdVideo = await Video.create({
    videoFile: {
      url: videoFile?.url,
      public_id: videoFile?.public_id,
    },
    thumbnail: {
      url: thumbnail?.url,
      public_id: thumbnail?.public_id,
    },
    title,
    description,
    duration: videoFile?.duration,
    owner: req.user?._id,
  });

  if (!createdVideo)
    throw new ApiError(500, "Something went wrong while publishing the video");

  return res
    .status(200)
    .json(new ApiResponse(200, createdVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId).populate({
    path: "owner",
    select: "fullName username avatar",
  });
  if (!video) throw new ApiError(400, "Video does not exist");

  const isOwner = video.owner.equals(req.user._id);
  const canAccess = video.isPublished || isOwner;

  if (!canAccess) throw new ApiError(403, "Unauthorized request");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video does not exist");

  if (!video.owner.equals(req.user._id))
    throw new ApiError(403, "Unauthorized request");

  if (
    [title, description, thumbnailLocalPath].every(
      (field) => field.trim() === ""
    )
  )
    throw new ApiError(400, "Nothing to update");

  let thumbnail;

  if (thumbnailLocalPath) {
    thumbnail = await uploadOnCloudinary(
      thumbnailLocalPath,
      video.thumbnail?.publicId
    );
  }

  video.thumbnail.url = thumbnail?.url;
  video.title = title;
  video.description = description;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "Video does not exist");

  if (!video.owner.equals(req.user._id))
    throw new ApiError(403, "Unauthorized request");

  await Video.findByIdAndDelete(videoId);

  await deleteFromCloudinary(video.videoFile?.public_id, "video");
  await deleteFromCloudinary(video.thumbnail?.public_id, "image");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        result: "ok",
      },
      "Video deleted successfully"
    )
  );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid video ID");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video does not exist");

  if (!video.owner.equals(req.user._id))
    throw new ApiError(403, "Unauthorized request");

  video.isPublished = !video.isPublished;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, `Set isPublised to ${video?.isPublished}`)
    );
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
