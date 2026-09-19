import mongoose , {Schema} from 'mongoose';

const videoSchema = new Schema(
    {
        videoFile :{
            
        }
    }
)

export const Video = mongoose.model("Video", videoSchema)