import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, getVideoDuration } from "../utils/cloudinary.js";

export const getAllVideos = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  const sortTypeNum = Number(sortType) || -1;
  const limitNum = Number(limit);
  const pageNumber = Number(page);

  await Video.createIndexes({ title: "text", description: "text" });
  if (userId && !isValidObjectId(userId)) {
    return next(new ErrorHandler(400, "Invalid User ID"));
  }

  const allVideos = await Video.aggregate([
    {
      $match: {
        isPublished: true,
        $text: { $search: query },
      },
    },
    {
      $addFields: {
        sortField: {
          $toString: "$" + (sortBy || "createdAt"), // Added quotes around "createdAt"
        },
      },
    },
    {
      $facet: {
        videos: [
          {
            $sort: {
              sortField: sortTypeNum,
            },
          },
          {
            $skip: (pageNumber - 1) * limitNum,
          },
          {
            $limit: limitNum,
          },
          {
            $lookup: {
              // Changed $Lookup to $lookup
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner_details",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1, // Corrected typo in username
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner_details", // Added $ to owner_details
              },
            },
          },
        ],
        CountNumberOfVideo: [{ $count: "videos" }], // Changed $count to $count
      },
    },
  ]);

  if (!allVideos[0].videos?.length) {
    return next(new ErrorHandler(402, "You should try a lower page number"));
  }
  return res.status(200).json(
    new ApiResponse(200, allVideos[0], "All videos fetched successfully") // Changed getAllVideos to allVideos
  );
});

export const publishAVideo = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if ([title, description].some((field) => field?.trim() === "")) {
    return next(new ErrorHandler(400, "All fields are required"));
  }

  const videoLocalpath = req.files?.videoFile[0]?.path;
  const thumbnailLocalpath = req.files?.thumbnail[0]?.path;

  if (!videoLocalpath) {
    return next(new ErrorHandler(400, "videoLocalpath file is required"));
  }

  if (!thumbnailLocalpath) {
    return next(new ErrorHandler(400, "thumbnailLocalpath file is required"));
  }

  const videoFile = await uploadOnCloudinary(videoLocalpath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalpath);

  if (!videoFile) {
    return next(new ErrorHandler(400, "video file is required"));
  }

  if (!thumbnail) {
    return next(new ErrorHandler(400, "thumbnail file is required"));
  }

  const duration = await getVideoDuration(videoFile.public_id);

  const video = await Video.create({
    videoFile: videoFile?.url,
    thumbnail: thumbnail?.url,
    title,
    description,
    owner: req.user?._id,
    duration,
  });

  if (!video) {
    return next(
      new ErrorHandler(500, "Something went wrong while save video in database")
    );
  }

  return res
    .status(200)
    .json(ApiResponse(200, video, "Video uploaded successfully"));
});

export const getVideoById = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId) && !videoId?.trim()) {
    return next(new ErrorHandler(400, "Invalid videoId."));
  }
  const searchVideo = await Video.findById(videoId);

  if (searchVideo) {
    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $addToSet: { watchHistory: searchVideo._id },
      },
      { new: true }
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, searchVideo, "Video fetched successfully"));
});

export const updateVideo = asyncHandler(async (req, res,next) => {

  //TODO: update video details like title, description, thumbnail

  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId) && !videoId?.trim()) {
    return next(new ErrorHandler(400, "Invalid videoId."));
  }

  let thumbnailLocalpath 

  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalpath = req.files?.thumbnail[0]?.path;
  }


});
