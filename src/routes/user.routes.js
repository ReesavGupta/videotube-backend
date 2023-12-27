import { Router } from "express";

import {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getUserWatchHistory,
    loginUser,
    logoutUser,
    refreshAccesstoken,
    registerUser,
    updateAccountDetails,
    updateAvatarImage,
    updateCoverImage
} from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
//when a user hits the register route, the registerUser function is executed but before the execution of the method we trigger a middlewaare called upload which grants us the ability to upload files.
router.route("/register").post(

    //.fields returns a middleware that processes multiple files associated with the given form fields.
    //.fields accepts an array

    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),

    registerUser
);

router
    .route("/login")
    .post(loginUser)
router
    .route("/refresh-token")
    .post(refreshAccesstoken)

// secured routes
router
    .route("/logout")
    .post(
        verifyJWT,
        logoutUser
    )
router
    .route("/change-password")
    .post(
        verifyJWT,
        changeCurrentPassword
    )
router
    .route("/current-user")
    .get(
        verifyJWT,
        getCurrentUser
    )
router
    .route("/update-account")
    .patch(
        verifyJWT,
        updateAccountDetails
    )
router
    .route("/avatar")
    .patch(
        verifyJWT,
        upload
            .single("avatar"),
        updateAvatarImage
    )
router
    .route("/cover-image")
    .patch(
        verifyJWT,
        upload
            .single("coverImage"),
        updateCoverImage
    )

router
    .route("/c/:username")
    .get(
        verifyJWT,
        getUserChannelProfile
    )
router
    .route("/watch-history")
    .get(
        verifyJWT,
        getUserWatchHistory
    )

export default router