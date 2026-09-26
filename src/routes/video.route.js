import Router from "express";
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import {upload } from "../middlewares/multer.middlewares.js"
import {
    publishAVideo
} from "../controllers/video.contollers.js"
const router = Router()

router.route("/post-video").post(verifyJWT, upload.fields([
    {
     name : "videoFile",
     maxCount:1   
    },
    {
     name : "thumbnail",
     maxCount:1   
    }
]) ,publishAVideo)

export default router