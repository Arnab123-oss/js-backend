import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_API,
  api_secret: process.env.CLOUDINARY_CLIENT_SECRRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload file on cloudinary server
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    // console.log("file has been uploaded successfully", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload oparetion got failed
    return null;
  }
};

// Function to get duration of a video uploaded to Cloudinary
const getVideoDuration = async (publicId) => {
  try {
    // Fetch video information from Cloudinary
    const videoInfo = await cloudinary.api.resource(publicId, { video: true });
    
    // Extract duration from the video information
    const duration = videoInfo.duration;
    
    return duration;
  } catch (error) {
    console.error('Error fetching video duration from Cloudinary:', error);
    throw error;
  }
};

export { uploadOnCloudinary,getVideoDuration };
