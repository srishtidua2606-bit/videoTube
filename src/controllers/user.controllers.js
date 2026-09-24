import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshToken = asyncHandler(async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(400, "User already exists.")
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh Token");

    }

    return { accessToken, refreshToken }
})

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body

    console.log(req.body)
    // if(fullname?.trim() === "")
    if ([fullname, username, email, password].some((field) => field?.trim === "")) {
        throw new ApiError(400, "Credentials are required.")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");

    }
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImgLocalPath = req.files?.coverImage?.[0]?.path
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
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        // console.log("Uploaded avatar", avatar)
    } catch (error) {
        // console.log("Error uploading", error)
        throw new ApiError(400, "Avatar file upload failed.")

    }
    let coverImg;
    try {
        coverImg = await uploadOnCloudinary(coverImgLocalPath)
        // console.log("Uploaded cover image", coverImg)
    } catch (error) {
        // console.log("Error uploading", error)
        throw new ApiError(400, "coverImg file upload failed.")

    }
    try {
        const user = await User.create({
            fullname,
            username,
            email,
            password,
            avatar: avatar.url,
            coverImg: coverImg?.url || "",

        })
        const createdUser = await User.findById(user._id).select("-password -refreshToken")  // for no chance of error
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registring a user.")
        }
        return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"))
    } catch (error) {
        console.log("User creation failed")
        if (avatar) {
            await deleteFromCloudinary(avatar.public_id)
        }
        if (coverImg) {
            await deleteFromCloudinary(coverImg.public_id)
        }
        throw new ApiError(500, "Something went wrong while registering a user and images were deleted")
    }

})

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body
    if (!email) {
        throw new ApiError(400, "Email is required")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    //validate password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials")
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    if (!loggedInUser) {
        throw new ApiError(400, "Something went wrong while logging")
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("accessToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken, refreshToken
        }, "User logged in successfully"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken //if mobile app then it would be in req.body
    if (!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required."); 
    }
    try{
        const decodedToken = jwt.verify(
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
        )
       const user = await user.findById(decodedToken?._id) 
       if (!user) {
         throw new ApiError(401, "Invalid refresh token.")
       }
       if ( incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Invalid refresh Token")
       }

       const options = {
        httpOnly:true,
        secure : process.env.NODE_ENV === "production"
       }
       const {accessToken, refreshToken : newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)

       return res.status(200).cookie("accessToken", accessToken, options)
       .cookie("refreshToken", newRefreshToken, options).json(
         new ApiResponse(
            200,
             {accessToken, refreshToken : newRefreshToken}, 
             "Access Token refreshed successfully"))
    }catch(error){
        throw new ApiError(500, "Something went wrong while refreshing the access Token");

    }
})

const logoutUser = asyncHandler( async (req, res) => {
   
    
})


export {
    registerUser,
    loginUser,
    refreshAccessToken
}