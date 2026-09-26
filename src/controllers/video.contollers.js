import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, duration } = req.body
    // TODO: get video, upload to cloudinary, create video
    const videoLocalPath = req.files?.videoFile?.[0].path
    const thumbnailLocalPath = req.files?.thumbnail?.[0].path
    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Files are missing");

    }
    let uploadedVideo;
    try {
        uploadedVideo = await uploadOnCloudinary(videoLocalPath)
    } catch (error) {
        throw new ApiError(400, "Video file upload failed");
    }
    let thumbnail;
    try {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    } catch (error) {
        throw new ApiError(400, "Thumbnail file upload failed");
    }
    let video;
    try {
        video = await Video.create({
        title,
        description,
        videoFile: uploadedVideo?.url,
        thumbnail: thumbnail?.url,
        owner: new mongoose.Types.ObjectId(req.user._id),
        duration
    })
    } catch (error) {
        if(uploadedVideo){
            await deleteFromCloudinary(uploadedVideo?.public_id)
        }
        if(thumbnail){
            await deleteFromCloudinary(thumbnail?.public_id)
        }
        throw new ApiError(400, "Something went wromg while creating a video");
        
    }
    
    return res.status(200)
        .json(new ApiResponse(200, video, "Video created succesfully"))

})
//get video by Id

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video = await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    }, { new: true })
    if (!video) {
        throw new ApiError(400, "Video does not exist.");
    }
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet : {watchHistory : videoId}
    } )

    return res.status(200)
        .json(new ApiResponse(200, video, "Video given succesfully"))

})
export {
    publishAVideo,
    getVideoById
}