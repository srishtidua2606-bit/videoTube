import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body

    // if(fullName?.trim() === "")
    if ([fullName, username, email, password].some((field) => field?.trim === "")) {
        throw new ApiError(400, "fullName is required.")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");

    }
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImgLocalPath = req.files?.coverImage[0]?.path
    
    if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing.")

}
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    let coverImg = ""
    if (coverImgLocalPath){
         coverImg = await uploadOnCloudinary(coverImgLocalPath)
    }
    const user = await User.create({
        fullName,
        username,
        email,
        password,
        avatar :avatar.url,
        coverImg :coverImg?.url || "",
        
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")  // for no chance of error
    if (!createdUser){
        throw new ApiError(500, "Something went wrong while registring a user.")
    }
    return res.status(201).json(new ApiError(201, createdUser, "User created"))

})


export {
    registerUser
}