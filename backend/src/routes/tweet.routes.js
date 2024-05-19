import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, getUserTweets } from "../controllers/tweet.controllers.js";

const router = Router();


router.use(verifyJWT)

router.route("/createtweet").post(createTweet)

router.route("/tweet/:userId").get(getUserTweets)