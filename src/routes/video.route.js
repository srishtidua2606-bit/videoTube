import Router from "express";
import {upload } from "../middlewares/multer.middlewares.js"
import {
    publishAVideo
} from "../controllers/video.contollers.js"
const router = Router()

router.route("/post-video").post(verifyJWT, publishAVideo)

export default router