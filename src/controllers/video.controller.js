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
    const video = await Video.findById(videoId)
    if (!video || !isValidObjectId(videoId)) {
        throw new ApiError(404, "video not found")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, video, "video fetched successfully"))
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
