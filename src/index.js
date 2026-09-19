import dotenv from "dotenv";
import connectDB from "./databases/index.js";

import {app} from "./app.js";

dotenv.config({
    path: "./.env"
})

const PORT = process.env.PORT || 8001
connectDB()
.then(()=> {
    app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})

})
.catch((err) => {
    console.log("Mongodb connection error", err)
})
