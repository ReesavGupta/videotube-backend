import mongoose from "mongoose"
import { Video } from "../models/video.models.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userID = req.user._id
    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userID),
            },
            $group: {
                _id: null,
                subscriberCount: {
                    $sum: 1,
                },
            },
        },
    ])
    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userID),
            },
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "video",
                localField: "_id",
                as: "likes",
            },
        },
        {
            $project: {
                totalLikes: {
                    $size: "$likes",
                },
                totalViews: "$views",
                totalVideos: 1,
            },
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totalLikes",
                },
                totalViews: {
                    $sum: "$totalViews",
                },
                totalVideos: {
                    $sum: 1,
                },
            },
        },
    ])
    if (!subscribers || !video) {
        throw new ApiError(500, "Couldn't fetch the channel stats")
    }
    const channelStats = {
        totalSubscribers: subscribers[0]?.subscriberCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0,
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { channelStats },
                "fetched channel stats sucessfully"
            )
        )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = req.user._id
    const videos = await Video.aggregate([
        {
            $match: {
                owner: userId,
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes",
                },
            },
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                duration: 1,
                views: 1,
                owner: 1,
                likeCount: 1,
            },
        },
    ])
    if (!videos) {
        throw new ApiError(
            500,
            "There was an error while fetching the videos of the channel"
        )
    }
    return res
        .status(200)
        .json(200, { videos }, "fetched channel videos sucessfully")
})

export { getChannelStats, getChannelVideos }
