import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById({ userId })
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        // while running user.save() all the required fields in user.models.js will kick start on their own. Here, we don't need to validate the user again so, we use an option validateBeforeSave to be false.

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "something went wrong while generating the refresh and access token")
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

    const findingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!findingUser) {
        throw new ApiError(404, "user not found")
    }

    const isPassword = await findingUser.isPasswordCorrect(password);

    if (!isPassword) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(findingUser._id);

    // removing password and refreshToken from the response
    const loggedInUser = await findingUser.findById(findingUser._id).select("-password -refreshToken")

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
        .json(new ApiResponse(200, {}, "user logged ou sucessfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}

