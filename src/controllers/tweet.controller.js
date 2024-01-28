import { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.models.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Content is required")
    }
    const userId = req.user?._id
    const tweet = await Tweet.create({
        content,
        owner: userId,
    })
    if (!tweet) {
        throw new ApiError(500, "there was an error while creating the tweet")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet created sucessfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!userId) {
        throw new ApiError(400, "provide a user id")
    }
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "provide a valid user id")
    }

    const user = await User.findOne({ _id: userId })
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const tweets = await Tweet.find({ owner: userId })

    return res
        .status(200)
        .json(new ApiResponse(200, { tweets }, "Tweets fetched"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { newContent } = req.body
    const { tweetId } = req.params
    const userId = req.user._id
    if (!newContent) {
        throw new ApiError(400, "Content is required to update the tweet")
    }
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Provide a valid tweet id")
    }
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    if (tweet.owner.toString() !== userId) {
        throw new ApiError(400, "you are not allowed to update the tweet")
    }
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: newContent,
            },
        },
        {
            new: true,
        }
    )
    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Sucessfully updated"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "provide a valid tweet id")
    }
    const tweet = await Tweet.findOne({ _id: tweetId })
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    if (tweet.owner.toString() !== req.user._id) {
        throw new ApiError(405, "You are not allowed to delete this tweet")
    }
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)

    if (!deletedTweet) {
        throw new ApiError(500, "there was an error while deleting a tweet")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, deletedTweet, "Deleted sucessfully"))
})

export { createTweet, getUserTweets, updateTweet, deleteTweet }
