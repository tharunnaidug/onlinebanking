import express from "express";
import { transferFunds } from "../controllers/transferController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/transfer", protect, transferFunds);

export default router;
