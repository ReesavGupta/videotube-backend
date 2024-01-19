import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Provide a valid video Id")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "No video found")
    }
    const likedAlready = await Like.findOne(
        { video: videoId },
        { likedBy: req.user._id }
    )
    if (likedAlready) {
        const removedLike = await Like.findByIdAndDelete(likedAlready?._id)
        if (!removedLike) {
            throw new ApiError(
                500,
                "There was an error while removing the like"
            )
        }
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Removed Like sucessfully"))
    }
    const newLike = await Like.create({
        video: videoId,
        likedBy: req.user._id,
    })
    if (!newLike) {
        throw new ApiError(500, "There was an error while liking the video")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Liked the video sucessfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Provide a valid video ID")
    }
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "No comment found")
    }
    const likedAlready = await Like.findOne(
        { comment: commentId },
        { likedBy: req.user._id }
    )
    if (likedAlready) {
        const removedLike = await Like.findByIdAndDelete(likedAlready._id)
        if (!removedLike) {
            throw new ApiError(500, "Couldn't remove like")
        }
        return res.status(200).json(new ApiError(200))
    }
    const newLike = await Like.create({
        comment: commentId,
        likedBy: req.user._id,
    })
    if (!newLike) {
        throw new ApiError(500, "Couldn't like the comment")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Toggled the comment like sucessfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Provide a valid tweet id")
    }
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "tweet not found")
    }
    const likedAlready = await Like.findOne(
        { tweet: tweetId },
        { likedBy: req.user._id }
    )
    if (likedAlready) {
        const removedLike = await Like.findByIdAndDelete(likedAlready._id)
        if (!removedLike) {
            throw new ApiError(
                500,
                "There was an error while removing the liek"
            )
        }
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "removed liked sucessfully"))
    }
    const newLike = await Like.create({
        tweet: tweetId,
        likedBy: req.user._id,
    })
    if (!newLike) {
        throw new ApiError(500, "Couldn't like the tweet")
    }
    return res.status(200).json(200, {}, "liked successfully")
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id
    const videoLikes = await Like.aggregate([
        {
            $match: new mongoose.Types.ObjectId(userId),
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideos",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ])
    if (!videoLikes) {
        throw new ApiError(500, "Couldn't fetch the liked videos")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videoLikes,
                "Liked videos fetched successfully"
            )
        )
})

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos }
