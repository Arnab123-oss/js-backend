import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllVideos } from "../controllers/video.controllers.js";


const router = Router();
router.use(verifyJWT)  // Apply verifyJWT middleware to all routes in this file


router.route("/").get(getAllVideos)

router.route("/postvideo").post(
    
)

