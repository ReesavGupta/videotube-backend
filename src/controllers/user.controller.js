import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";

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

    const avatarLocalPath = res.files?.avatar[0]?.path;
    const coverImageLocalPath = res.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPathLocalPath);

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

    if(!createdUser){
        throw new ApiError(500, "something went wrong while regestering the user")
    }

    return res.status(201).res.json(
        new ApiResponse(200, createdUser, "user created sucessfully")
    )

})

export default registerUser
