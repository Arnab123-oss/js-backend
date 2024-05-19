import { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.models.js";

export const createTweet = asyncHandler(async (req, res, next) => {
  const { content } = req.body;

  if (!content || !content?.trim().length) {
    return next(new ErrorHandler(400, "Content is requered"));
  }

  Tweet.create({
    content,
    owner: req.user?._id,
  });

  return res.status(200).json(ApiResponse(200,"tweet submitted successfully"));
});

export const getUserTweets = asyncHandler(async (req, res, next) => {
    // TODO: get user tweets
    const {userId} =  req.params
    
    if(!isValidObjectId(userId)){
        return next(new ErrorHandler(400, "Invalid user Id"));
    }

  


})
