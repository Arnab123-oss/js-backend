import { asyncHandler } from "../utils/asyncHandler.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
