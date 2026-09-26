import mongoose, { Schema } from 'mongoose';
// import { mongooseAggregatePaginate } from "mongoose-aggregate-paginate-v2"
const videoSchema = new Schema(
    {
        videoFile: {
            type: String, //cloudinary url
            required: true,
        },
        thumbnail: {
            type: String, //cloudinary url
            required: true,
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        duration: {
            type: Number,
            required: true
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
        ,

        likesCount: {
            type: Number,
            default: 0
        }
    }
    , {
        timestamps: true
    }
)
// videoSchema.plugin(mongoosePaginate)
export const Video = mongoose.model("Video", videoSchema)