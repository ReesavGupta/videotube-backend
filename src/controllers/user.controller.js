import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import uploadOnCloudinary, { deleteOldAvatarFromCloudinary } from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({ validateBeforeSave: false })

        // while running user.save() all the required fields in user.models.js will kick start on their own. Here, we don't need to validate the user again so, we use an option validateBeforeSave to be false.

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "something went wrong while generating the refresh and access token" + "\n" + error)
    }
}

const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinar - avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, email, username, password } = req.body;

    // can also be written without the explicit return if([...].some((..)=>elem?.trim() === ""))

    // The .some() method is used to check if at least one element in the array satisfies the condition specified in the callback function.

    // elem? : It checks if elem is not null or undefined before attempting to call the trim() method on it. If elem is null or undefined, the entire expression evaluates to undefined, and the condition (elem?.trim() === "") is considered false. This helps prevent errors that might occur if you try to call trim() on an undefined or null value.

    // .trim() method removes the whitespaces or tabspaces from the elem

    if (
        [fullName, email, username, password].some((elem) => {
            return elem?.trim() === ""
        })
    ) {
        throw new ApiError(400, "Fill all the fields")
    }
    // you can add more validations hai reesav

    // now, unique username or email
    // $or is a logical operator

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist");
    }

    // the "res" object by default doesn't have the ".files" property but since we used multer as the middleware in user.routes file.

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required local")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // creating an entry in the db 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        // coverImage is optional so. code fatey na isiliye
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // checking whether the user is created or not 
    // after checking by id, we remove the password and the refresh token from the response, the syntax is kinda weird but yeah.

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "something went wrong while regestering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user created sucessfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {

    // extract data -> req.body -> data
    // username or email validation
    // find the user
    // password check
    // access and refresh token
    // send secure cookie
    // send res

    const { email, username, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const isPassword = await user.isPasswordCorrect(password);

    if (!isPassword) {
        throw new ApiError(401, "Invalid user credentials");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user?._id);

    // removing password and refreshToken from the response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpsOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "user logged in sucessfulyy"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    // to logout a user you just need to clear the accesstoken and refreshtoken from both the db and the cookies.
    // but you dont have the reference of the user(in this method) who is trying to logout.
    // so for that we injected a middleware called auth.middleware.js which authenticates the user(verifies the token from the res.cookie object) and if it is verified that the user is authorised then, from that middleware we add a new field in the response object called the "user".
    // that is how we are able to use "req.user._id"
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpsOnly: true,
        secure: true
    }

    res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out sucessfully"))
})

// refresh and access token's only purpose is to validate a user.(so thata user does'nt have to login again and again.)
// access token is usually short lived. Hence, user has to re login once the access token has expired. 
// if the token has expired, what the frontend can do is: hit a specific endpoint from where you can refresh your access token.
// now in that enpoint's request you are gonna send the user's refresh token and compare the token with that token which is stored in the db. if they match you can start their session again.
// you then send a new access token and also update the existing refresh token with a new one.  

const refreshAccesstoken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used")
        }

        const options = {
            httpsOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .coookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { newPassword, oldPassword } = req.body

    const user = User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid old password")
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password changed succesfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "user fetched successfully"))
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { email, username } = req.body

    if (!email || !username) {
        throw new ApiError(400, "all the fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: {
                username,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    res
        .status(200)
        .json(new ApiResponse(200, user, "fields changed succesfully"))
})


const updateAvatarImage = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    const oldAvatar = req.user?.avatar;

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(500, "error whiile uploading to cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            avatar: avatar.url
        },
        { new: true }
    ).select("-password")

    await deleteOldAvatarFromCloudinary(oldAvatar);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "avatar image sucessfuly updated"
        ))
})


const updateCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(500, "error whiile uploading to cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            coverImage: coverImage.url
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "coverImage image sucessfuly updated"
        ))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(400, "channel does not exist")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched succssfully"));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesstoken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatarImage,
    updateCoverImage
}

