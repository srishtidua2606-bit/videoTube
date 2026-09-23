import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";


const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body

    console.log(req.body)
    // if(fullname?.trim() === "")
    if ([fullname, username, email, password].some((field) => field?.trim === "")) {
        throw new ApiError(400, "fullName is required.")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");

    }
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImgLocalPath = req.files?.coverImage?.[0]?.path
    console.log(avatarLocalPath, "\n", coverImgLocalPath)
    if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing.")

}
    // const avatar = await uploadOnCloudinary(avatarLocalPath)
    // let coverImg = ""
    // if (coverImgLocalPath){
    //      coverImg = await uploadOnCloudinary(coverImgLocalPath)
    // }

    //refractoring code
    let avatar;
    try{
        avatar  = await uploadOnCloudinary(avatarLocalPath)
        // console.log("Uploaded avatar", avatar)
    }catch(error){
        // console.log("Error uploading", error)
        throw new ApiError(400, "Avatar file upload failed.")

    }
    let coverImg;
    try{
        coverImg  = await uploadOnCloudinary(coverImgLocalPath)
        // console.log("Uploaded cover image", coverImg)
    }catch(error){
        // console.log("Error uploading", error)
        throw new ApiError(400, "coverImg file upload failed.")

    }
    try {
        const user = await User.create({
        fullname,
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
    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"))
    } catch (error) {
        console.log("User creation failed")
        if ( avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if ( coverImg){
            await deleteFromCloudinary(coverImg.public_id)
        }
        throw new ApiError(500, "Something went wrong while registering a user and images were deleted")
    }

})


export {
    registerUser
}