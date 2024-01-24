import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video not found")
    }
    const allComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localfield: "owner",
                foreignfield: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localfield: "_id",
                foreignfield: "comment",
                as: "likes",
            },
        },
        {
            $addfields: {
                likes: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        $if: { $in: [req.user._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                content: 1,
                likes: 1,
                isLiked: 1,
                owner: {
                    username: 1,
                    avatar: 1,
                },
                createdAt: 1,
            },
        },
    ])
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const comments = await Comment.aggregatePaginate(allComments, options)

    return res
        .status(200)
        .json(200, comments, "Sucessfully fetched the video comments")
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { content } = req.body
    const { videoId } = req.params
    const userId = req.user._id
    if (!content) {
        throw new ApiError(400, "You need to provide the content")
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Provide a vlaid video Id")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "No video found ")
    }
    const comment = await Comment.create({
        content,
        video: videoId,
        owner: userId,
    })
    if (!comment) {
        throw new ApiError(500, "Couldn't comment on the video")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Successfully commented"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body
    if (!content) {
        throw new ApiError(400, "Content is required")
    }
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Provide a valid comment Id")
    }
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "What do you want me to update")
    }
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            400,
            "Only the owner of the comment can update the coment"
        )
    }
    const newComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
            },
        },
        {
            new: true,
        }
    )
    if (!newComment) {
        throw new ApiError(500, "Comment couldn't be updated")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { newComment },
                "Sucessfully updated the comment"
            )
        )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    if (!isValidObjectId()) {
        throw new ApiError(400, "Provide a valid comment ID")
    }
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            400,
            "Only the owner of the comment can delete the coment"
        )
    }
    const deltedComment = await Comment.findByIdAndDelete(commentId)
    if (!deltedComment) {
        throw new ApiError(500, "Couldn't delete comment")
    }
    return res.status(200).json(new ApiResponse(200, {}, "deleted sucessfully"))
})

export { getVideoComments, addComment, updateComment, deleteComment }
