import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
)
//common middleware
app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({limit:"16kb", extended:true}));
app.use(express.static("public"));
app.use(cookieParser())
//IMPORT ROUTES
import healthCheckRouter from "./routes/healthCheck.routes.js"
import userRouter from "./routes/user.routes.js"
import { errroHandler } from "./middlewares/error.middlewares.js";
import videoRouter from "./routes/video.route.js"


// routes
app.use("/api/v1/healthcheck", healthCheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)



// app.use(errroHandler)
export { app };