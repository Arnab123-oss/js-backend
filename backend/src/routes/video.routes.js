import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllVideos, getVideoById, publishAVideo, updateVideo } from "../controllers/video.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();
router.use(verifyJWT)  // Apply verifyJWT middleware to all routes in this file


router.route("/").get(getAllVideos)

router.route("/postvideo").post(
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),publishAVideo
)

router.route("/:videoId")
.get(getVideoById)
.patch(upload.single("thumbnail"),updateVideo)

export default router;
