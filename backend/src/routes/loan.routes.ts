import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { uploadReceipt } from "../middleware/upload.middleware.js";
import { create, list, repay, uploadLoanReceipt, getSummary } from "../controllers/loan.controller.js";

const router = Router();

// Protect all loan routes with JWT authentication
router.use(authenticateToken);

router.post("/", create);
router.get("/", list);
router.get("/summary", getSummary);
router.patch("/:id/repay", repay);
router.post("/:id/receipt", uploadReceipt, uploadLoanReceipt);

export default router;
