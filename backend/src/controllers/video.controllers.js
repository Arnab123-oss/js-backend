import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";

export const getAllVideos = asyncHandler(async (req, res,next) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  const sortTypeNum = Number(sortType) || -1;
  const limitNum = Number(limit);
  const pageNumber = Number(page);

  await Video.createIndexes({ title: "text", description: "text" });
  if (userId && !isValidObjectId(userId)) {
    return next(new ErrorHandler(400, "Invaild User ID"));
  }

  const getAllVideos = await Video.aggregate([
    {
      $match: {
        isPublished: true,
        $text:{$search:query}
      },
    },
    {
      $addFields: {
        sortField: {
          $toString: "$" + (sortBy || createdAt),
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
            $Lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner_details",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    usernmae: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields:{
              owner:{
                $first:"owner_details"
              }
            }
          }
        ],
        CountNumberOfVideo: [{$count:"videos"}]
      },
    },
 
  ]);
  
  if(!getAllVideos[0].videos?.length){
    return next(new ErrorHandler(402, "You should try lower page number"));
  }
 return res
 .status(200)
 .json(
    new ApiResponse(200, getAllVideos[0], "All videos fetched successfully")
  );
});

export const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description} = req.body
  // TODO: get video, upload to cloudinary, create video
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new APIError(400, "All fields are required");
  }
  
const videoLocalpath = req.files?.videoFile[0]?.path


})