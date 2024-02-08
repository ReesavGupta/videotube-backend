import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { User } from "../models/user.models.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    const owner = req.user
    if (!name || !description) {
        throw new ApiError(400, "Provide all the credentials")
    }
    const playlist = await Playlist.create({
        name,
        description,
        owner,
    })
    if (!playlist) {
        throw new ApiError(500, "There was an error while creating the error")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "sucessfully created!"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "provide a valid user Id")
    }
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $sort: { createdAt: -1 },
                    },
                    {
                        $project: {
                            thumbnail: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                playlistThumbnail: {
                    $cond: {
                        if: { isArray: "$videos" },
                        then: { $first: "$videos.thumbnail" },
                        else: null,
                    },
                },
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                playlistThumbnail: 1,
            },
        },
    ])
    if (!playlists) {
        throw new ApiError(
            500,
            "There was an error while processing playlist data"
        )
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { playlists },
                "User Playlists fetched successfully"
            )
        )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "provide a valid plylist ID")
    }
    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
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
            $addFields: {
                owner: {
                    $first: "$owner",
                },
            },
        },
    ])
    if (!playlist) {
        throw new ApiError(500, "Problem while finding the playlist")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, { playlist }, "Playlist fetched successfully")
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Provide valid ID's")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Coultn't find playlist")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "no video found")
    }
    if (playlist.videos.includes(videoId)) {
        throw new ApiError(400, "video already exist")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        $push: { videos: videoId },
    })
    if (!updatePlaylist) {
        throw new ApiError(500, "Couln't update the playlist")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Sucessfully added the video to the playlist"
            )
        )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Provide valid Id's")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(300, "Couldn't find playlist")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Couldn't find video")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId },
        },
        { new: true }
    )
    if (!updatedPlaylist) {
        throw new ApiError(500, "There was an error while updating the results")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "video removed from the playlist sucessfully"
            )
        )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Provide a valid Playlist Id")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "No playlist found")
    }
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)
    if (!deletedPlaylist) {
        throw new ApiError(
            500,
            "There was an error while deleting the playlist"
        )
    }
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted sucessfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Provide a valid playlist Id")
    }
    if (!name || !description) {
        throw new ApiError(400, "All the feilds are required")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "No playlist found")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            },
        },
        {
            new: true,
        }
    )
    if (!updatedPlaylist) {
        throw new ApiError(
            500,
            "there was an error while updaeing the PLaylist"
        )
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated sucessfully"
            )
        )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
}
