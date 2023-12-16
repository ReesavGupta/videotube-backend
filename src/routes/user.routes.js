import { Router } from "express";
import {loginUser, logoutUser, registerUser} from "../controllers/user.controller.js";
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

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)

export default router