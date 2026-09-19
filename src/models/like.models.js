import mongoose, { Schema } from 'mongoose';

const likeSchema = new Schema(
    {
    //  likes would be either for video, comment or tweet and others would be null
    video:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
    },
    comment : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Comment"
    },
    tweet:{
        type : mongoose.Schema.Types.ObjectId,  
        ref:"Tweet"
    },
    likedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",

    }
    }, {
    timestamps: true
}
)

export const Like = mongoose.model("Like", likeSchema)