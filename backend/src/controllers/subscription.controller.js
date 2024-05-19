import { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.models.js";

export const toggleSubscription = asyncHandler(async (req, res, next) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!isValidObjectId(channelId)) {
    return next(new ErrorHandler(400, "Invalid channel Id"));
  }

  const isSubscribed = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (isSubscribed) {
    // Unsubscribe user to the channel
    await Subscription.findByIdAndDelete(isSubscribed._id);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isSubscribed: false },
          "Unsubscribed successfully"
        )
      );
  }

  const subscribing = await Subscription.create({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (!subscribing) {
    return next(new ErrorHandler(500, "Server error while subscribing"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { isSubscribed: true }, "Subscribed successfully")
    );
});


// controller to return subscriber list of a channel
export const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params

    if (!isValidObjectId(subscriberId)) {
        return next(new ErrorHandler(400, "Invalid channel Id"));
    }
    const channel = await User.findById(subscriberId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const subscribers = await Subscription.aggregate([
      { $match: { channel: mongoose.Types.ObjectId(subscriberId) } }, // Match the documents with the specified channelId
      {
        $lookup: {
          from: 'users', // Join with the 'users' collection
          localField: 'subscriber', // Field from 'subscriptions' collection
          foreignField: '_id', // Field from 'users' collection
          as: 'subscriber' // Name of the new array field to add
        }
      },
      { $unwind: '$subscriber' }, // Deconstruct the 'user' array field into individual documents
      {
        $group: {
          _id: null, // Group all documents into a single group
          subscribers: { $push: '$subscriber' } // Push all subscriber data into an array
        }
      },
      {
        $project: {
          _id: 0, // Exclude the '_id' field
          subscribers: 1, // Include the subscribers array
          count: { $size: '$subscribers' } // Calculate the total count of subscribers
        }
      }
    ]);
    
    
return res.status(200).json(new ApiResponse(200,subscribers,));

})


// controller to return channel list to which user has subscribed

export const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Validate the provided channel ID
  if (!isValidObjectId(channelId)) {
    throw new ErrorHandler(400, "Invalid channel Id");
  }

  // Aggregate query to fetch subscribed channels
  const subscribedChannels = await Subscription.aggregate([
    {
      // Match subscriptions for the provided channel ID
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      // Perform a lookup to get additional data about the subscribed channels
      $lookup: {
        from: "users", // Lookup from the 'users' collection
        localField: "channel", // Field from 'subscriptions' collection
        foreignField: "_id", // Field from 'users' collection
        as: "subscribedChannel", // Name of the new array field to add
        pipeline: [
          {
            // Nested lookup to get the latest video of the channel owner
            $lookup: {
              from: "videos", // Lookup from the 'videos' collection
              localField: "_id", // Field from 'users' collection
              foreignField: "owner", // Field from 'videos' collection
              as: "videos", // Name of the new array field to add
            },
          },
          {
            // Add a new field 'latestVideo' containing the latest video of the channel owner
            $addFields: {
              latestVideo: {
                $last: "$videos", // Get the last video in the 'videos' array
              },
            },
          },
        ],
      },
    },
    { $unwind: "$subscribedChannel" }, // Deconstruct the 'subscribedChannel' array field into individual documents
    {
      // Project to shape the output response
      $project: {
        _id: 0, // Exclude the '_id' field from the output
        subscribedChannel: {
          // Include specific fields of the subscribed channel and the latest video
          _id: 1,
          username: 1,
          fullName: 1,
          "avatar.url": 1,
          latestVideo: {
            _id: 1,
            "videoFile.url": 1,
            "thumbnail.url": 1,
            owner: 1,
            title: 1,
            description: 1,
            duration: 1,
            createdAt: 1,
            views: 1,
          },
        },
      },
    },
  ]);

  // Check if subscribed channels are found
  if (subscribedChannels.length === 0) {
    throw new error(500, "No subscribed channels found");
  }

  // Return the fetched subscribed channels in the response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
      )
    );
});


