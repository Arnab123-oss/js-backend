import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  if (userId && !isValidObjectId(userId)) {
    return next(new ErrorHandler(400, "Invaild User ID"));
  }

  const allVideos = await Video.aggregate([
    {
      $match: {
        isPublished: true,
      },
    },
    {},
  ]);
});
