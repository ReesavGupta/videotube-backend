import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.models.js"
import { Subscription } from "../models/subscription.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    const { channelId } = req.params
    const userId = req.user._id
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "provide a valid chanel id")
    }

    const channel = await User.findOne({ _id: channelId })
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    if (channelId.toString() === userId.toString()) {
        throw new ApiError(400, "Bro you cannot subscribe your own channel")
    }

    const subscription = await Subscription.findOne({
        channel: channelId,
        subscriber: userId,
    })
    console.log(subscription)

    if (!subscription) {
        await Subscription.create({
            channel: channelId,
            subscriber: userId,
        })
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "subscribed suucessfully"))
    }
    // console.log(subscription._id)
    const unsubscribed = await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: userId,
    })
    return res
        .status(200)
        .json(new ApiResponse(200, unsubscribed, "unsubscribed sucessfully"))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "provide a vlaid channel ID")
    }

    const channel = await User.findById(subscriberId)

    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberList",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            email: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                subscriberList: {
                    $first: "$subscriberList",
                },
            },
        },
    ])
    console.log(subscriptions)
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                subscriberList: subscriptions[0]?.subscriberList || [],
            },
            "subscriber fetched sucessfully"
        )
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "provide a valid subscriber id")
    }
    const subscriber = await User.findById(channelId)

    if (!subscriber) {
        throw new error(400, "user not found.")
    }
    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "channelSubscribedToList",
                pipeline: [
                    {
                        $project: {
                            
                            name: 1,
                            email: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                channelSubscribedToList: {
                    $first: "$channelSubscribedToList",
                },
            },
        },
    ])
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscriptions[0]?.channelSubscribedToList || []
            )
        )
})

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels }
