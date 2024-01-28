import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import uploadOnCloudinary from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const pipeLine = []
    if (query) {
        pipeLine.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"],
                },
            },
        })
    }
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Provide a valid userID")
        }
    }
    pipeLine.push({
        $match: {
            owner: new mongoose.Types.ObjectId(userId),
        },
    })
    pipeLine.push({
        $match: {
            isPublished: true,
        },
    })
    if (sortBy && sortType) {
        pipeLine.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1,
            },
        })
    } else {
        pipeLine.push({ $sort: { createdAt: -1 } })
    }
    pipeLine.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner-details",
                pipeLine: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner-details",
        }
    )
    const videoAggregate = await Video.aggregate(pipeLine)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }
    const videos = await Video.aggregatePaginate(options, videoAggregate)
    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched sucessfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const { title, description } = req.body

    if (!title || !description) {
        throw new ApiError(402, "all the fields are required")
    }

    const videoLocalPath = req.files?.video[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "all the files to upload are required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (videoFile === null || thumbnail === null) {
        throw new ApiError(
            500,
            "there was an error while uploading the video or thumbnail to the server"
        )
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: video.videoDuration,
        owner: req.user?._id,
    })
    return res
        .status(200)
        .json(new ApiResponse(200, video, "video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Provide a valid object Id")
    }
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner-details",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers",
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user._id,
                                            "$subscribers.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ],
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
                isLiked: {
                    $cond: {
                        if: { $in: [req.user._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
            },
        },
    ])
    if (!video) {
        throw new ApiError(400, "Failed to fetch video")
    }
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        },
    })
    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: {
            watchHistory: videoId,
        },
    })
    return res.status(200).json(200, video, "Sucessfully fetched the video")
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params
    const { title, description } = req.body

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "provide a valid video id")
    }

    const thumbnailLocalPath = req.file?.path
    let thumbnail
    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail || !thumbnail.url) {
            throw new ApiError(
                500,
                "couldnt update the thumbnail to the cloudinary serveer"
            )
        }
    }
    const existedVideo = await Video.findById(videoId)
    if (!existedVideo) {
        throw new ApiError(404, "video not found")
    }
    const updatedFields = {
        title: title !== "" ? title : existedVideo.title,
        description:
            description !== "" ? description : existedVideo.description,
        thumbnail: thumbnail?.url || existedVideo.thumbnail,
    }
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updatedFields,
        },
        {
            new: true,
        }
    )
    return res
        .status(200)
        .json(new ApiResponse(200, video, "update successfull"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "provide a valid video Id")
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId)

    if (!deletedVideo) {
        throw new ApiError(500, "there was an error while delteing the video")
    }
    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                deletedVideo,
                "the video was deleted successfully"
            )
        )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "provide a valid videoId")
    }
    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "no video found")
    }

    video.isPublished = !video.isPublished

    await video.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Publish status toggled successfully")
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
}
