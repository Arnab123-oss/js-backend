import { asyncHandler } from "../utils/asyncHandler.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    return next(
      new ErrorHandler(
        500,
        "Something went wrong while generating refresh and access token"
      )
    );
  }
};

export const registerUser = asyncHandler(async (req, res, next) => {
  //get userdata from the frontend
  //validation - not empty
  //chech if user already exists:username or email
  //check for images and avatar images
  //upload them to cloudinary server, avatar image
  //create user object - create entry in db
  //remove password and refresh token from respone
  //check for user creation
  //return response

  const { fullname, email, username, password } = req.body;
  //   console.log(email, password);
  if (!username || !email || !fullname || !password) {
    return next(new ErrorHandler(400, "Please enter a all fields"));
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    return next(new ErrorHandler(409, "Username or email already exists"));
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    return next(new ErrorHandler(400, "Avatar file is required"));
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    return next(new ErrorHandler(400, "Avatar file is required"));
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    return next(
      new ErrorHandler(500, "Something went wrong while registing the user")
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "uesr registered successfully"));
});

export const loginUser = asyncHandler(async (req, res, next) => {
  //req.body -> data
  //username or email
  //find the user
  //password check
  //create refresh and access token
  //send cookie

  const { email, username, password } = req.body;

  if (!(username || email)) {
    return next(new ErrorHandler(400, "username or email is required"));
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    return next(new ErrorHandler(404, "User does not exist"));
  }

  const isPasswordVAlid = await user.isPasswordCorrrect(password);

  if (!isPasswordVAlid) {
    return next(new ErrorHandler(401, "Invalid User Credentials"));
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

export const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out Successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    return next(new ErrorHandler(401, "Unauthorized request"));
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      return next(new ErrorHandler(401, "Invalid refresh token"));
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      return next(new ErrorHandler(401, "Refresh token is used or expired"));
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    return next(
      new ErrorHandler(401, error?.message || "Invalid refresh token")
    );
  }
});

export const changeCurrentPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrrect(oldPassword);

  if (!isPasswordCorrect) {
    return next(new ErrorHandler(400, "Incorrect Old Password"));
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Cahnged Successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res, next) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fatched Successfully"));
});

export const updateAccountDetails = asyncHandler(async (req, res, next) => {
  const { email, fullname } = req.user;

  if (!(fullname || email)) {
    return next(new ErrorHandler(400, "fullname or email is required"));
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,

    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Account Update Successful"));
});

export const updateAvatarImage = asyncHandler(async (req, res, next) => {
  const avataerLocalFile = req.file?.path;

  if (!avataerLocalFile) {
    return next(new ErrorHandler(400, "Avatar file is missing"));
  }
  const avatar = await uploadOnCloudinary(avataerLocalFile);

  if (!avatar.url) {
    return next(new ErrorHandler(400, "Error while  uploading on Avatar file"));
  }
  const user = await User.findByIdAndUpdate(
    req.file?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Update Successful"));
});

export const updateCoverImage = asyncHandler(async (req, res, next) => {
  const coverImageLocalFile = req.file?.path;

  if (!coverImageLocalFile) {
    return next(new ErrorHandler(400, "coverImage file is missing"));
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalFile);

  if (!coverImage.url) {
    return next(new ErrorHandler(400, "Error while  uploading on Avatar file"));
  }
  const user = await User.findByIdAndUpdate(
    req.file?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage Update Successful"));
});

export const getUserChannelProfile = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  if (!username?.trim()) {
    return next(new ErrorHandler(400, "username is missing"));
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  // console.log(channel);

  if (!channel?.length) {
    return next(new ErrorHandler(404, "Channel does not exsits"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User  channel fached successfully")
    );
});

export const getWatcHistory = asyncHandler(async (req, res, next) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ],
      },
    },
  ]);

return res.status(200)
.json(new ApiResponse(200,user[0].watchHistory,"Watch history feteced successfully"))

});
