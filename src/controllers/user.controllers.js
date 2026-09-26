import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshToken = async (userId) => {

    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(400, "User does not already exists.")
    }
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body

    console.log(req.body)
    // if(fullname?.trim() === "")
    if ([fullname, username, email, password].some((field) => field?.trim() === "")) {
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
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken, refreshToken
        }, "User logged in successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken //if mobile app then it would be in req.body
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required.");
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token.")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh Token")
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id)

        return res.status(200).cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options).json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token refreshed successfully"))
    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing the access Token");

    }
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        })
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "development"
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully."))
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordValid) {
        throw new ApiError(401, "Old password is correct.");
    }
    user.password = newPassword
    user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully."))

})
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user details."))

})
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body
    if (!fullname || !email) {
        throw new ApiError(400, "Please provide fullname or email");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname,
                email
            }
        }, {
        new: true
    }
    ).select("-password -refreshToken")

    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated succesfully"))

})
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "File is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(500, "Something went wrong while uploading avatar");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }

    ).select("-password -refreshToken")
    return res.status(200)
        .json(new ApiResponse(200, user, "Avatar image updated succesfully"))

})
const updateUserCoverImg = asyncHandler(async (req, res) => {
    const coverImgLocalPath = req.file?.path
    if (!coverImgLocalPath) {
        throw new ApiError(400, "File is required");
    }
    const coverImg = await uploadOnCloudinary(coverImgLocalPath)
    if (!coverImg.url) {
        throw new ApiError(500, "Something went wrong while uploading coverImage");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImg.url
            }
        },
        {
            new: true
        }

    ).select("-password -refreshToken")
    return res.status(200)
        .json(new ApiResponse(200, user, "Cover image updated succesfully"))

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "Username is required.")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        }, {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }

        }, {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "SubscribedTo"
            }
        }, {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$SubscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"],
                            then: true,
                            else: false
                        }
                    }
                }
            }
        },
        {
            //projecting necessary data
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                subscribersCount: 1,
                channelsSubscriberToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])
    // console.log(channel)
    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }
    return res.status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
})
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]

                        }
                    },
                    {
                        $addFields: {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        },

    ])

    return res.status(200)
        .json(new ApiResponse(200, user[0]?.watchHistory, "watch history fetched successfully"))
})


export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImg,
    getUserChannelProfile,
    getWatchHistory
}