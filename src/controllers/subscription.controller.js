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
    let { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriberId")
    }

    subscriberId = new mongoose.Types.ObjectId(subscriberId)

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: subscriberId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber",
                        },
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            subscriberId,
                                            "$subscribedToSubscriber.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscriber",
        },
        {
            $project: {
                _id: 0,
                subscriber: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    subscribedToSubscriber: 1,
                    subscribersCount: 1,
                },
            },
        },
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribers,
                "subscribers fetched successfully"
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
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$videos",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscribedChannel",
        },
        {
            $project: {
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    latestVideo: {
                        _id: 1,
                        videoFile: 1,
                        thumbnail: 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                    },
                },
            },
        },
    ])
    console.log(subscriptions)
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscriptions,
                "Sucessfully fetched the subscribed channels"
            )
        )
})

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels }
