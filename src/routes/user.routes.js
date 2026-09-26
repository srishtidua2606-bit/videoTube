import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import {
    registerUser,
    logoutUser,
    loginUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImg,
    getWatchHistory
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        }, {
            name: "coverImage",
            maxCount: 1
        }
    ]), registerUser)
router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

//secured routes
router.route('/logout').post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").post(verifyJWT, getCurrentUser)

router.route("/c/:username").post(verifyJWT, getUserChannelProfile)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImg)

router.route("/history").get(verifyJWT, getWatchHistory)

export default router