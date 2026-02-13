import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description, isPrivate = true } = req.body;
  const userId = req.user?._id;

  if (!name || !description)
    throw new ApiError(400, "Name and description is required");

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: userId,
    isPrivate,
  });

  await playlist.populate([
    {
      path: "owner",
      select: "username fullName avatar",
    },
    {
      path: "videos",
      select: "title duration thumbnail",
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;
  if (!userId || !isValidObjectId(userId))
    throw new ApiError(400, "Inavalid user ID");

  const conditions = {
    owner: userId,
  };

  const canAccess = currentUserId.equals(userId);

  if (!canAccess) conditions.isPrivate = false;

  const playlists = await Playlist.find(conditions)
    .populate([
      {
        path: "owner",
        select: "username fullName avatar",
      },
      {
        path: "videos",
        select: "title duration thumbnail",
      },
    ])
    .sort({ createdAt: -1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlist fetched successfuly"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user._id;
  if (!playlistId || !isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlist ID");

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(404, "Playlist not found");

  if (playlist.isPrivate && !userId.equals(playlist.owner))
    throw new ApiError(403, "Unauthorized request");

  await playlist.populate([
    {
      path: "owner",
      select: "username fullName avatar",
    },
    {
      path: "videos",
      select: "title duration thumbnail",
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (
    !playlistId ||
    !videoId ||
    !isValidObjectId(playlistId) ||
    !isValidObjectId(videoId)
  )
    throw new ApiError(400, "Invalid playlist/video ID");

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(404, "Playlist not found");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (!playlist.owner.equals(userId) || !video.owner.equals(userId))
    throw new ApiError(403, "Unauthorized request");

  if (playlist.videos.some((video) => video._id.equals(videoId)))
    throw new ApiError(400, "Video already in playlist");

  playlist.videos.push(videoId);
  await playlist.save();
  await playlist.populate([
    {
      path: "owner",
      select: "username fullName avatar",
    },
    {
      path: "videos",
      select: "title duration thumbnail",
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to the playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (
    !playlistId ||
    !videoId ||
    !isValidObjectId(playlistId) ||
    !isValidObjectId(videoId)
  )
    throw new ApiError(400, "Invalid playlist/video ID");

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(404, "Playlist not found");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (!playlist.owner.equals(userId) || !video.owner.equals(userId))
    throw new ApiError(403, "Unauthorized request");

  const index = playlist.videos.findIndex((v) => v.equals(videoId));

  if (index === -1) throw new ApiError(400, "Video not in playlist");

  playlist.videos.splice(index, 1);
  await playlist.save();
  await playlist.populate([
    {
      path: "owner",
      select: "username fullName avatar",
    },
    {
      path: "videos",
      select: "title duration thumbnail",
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist,
        "Video removed from the playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user?._id;

  if (!playlistId || !isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlist ID");

  const deletedPlaylist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: userId,
  });

  if (!deletedPlaylist)
    throw new ApiError(404, "Playlist not found or Unauthorized");

  const result = {
    deleted: true,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const userId = req.user?._id;

  if (!playlistId || !isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlist ID");

  if (!name || !description)
    throw new ApiError(400, "Name and description are required");

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: userId,
    },
    {
      name: name?.trim(),
      description: description?.trim(),
    },
    {
      new: true,
      runValidators: true,
    }
  ).populate([
    {
      path: "owner",
      select: "username fullName avatar",
    },
    {
      path: "videos",
      select: "title duration thumbnail",
    },
  ]);

  if (!updatedPlaylist)
    throw new ApiError(404, "Playlist not found or unauthorized");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
