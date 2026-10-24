import { Router } from "express";
import authRoutes from "./auth.routes.js";
import loanRoutes from "./loan.routes.js";

const rootRouter = Router();

// Health check endpoint
rootRouter.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Auth endpoints: /auth/request-otp, /auth/verify-otp
rootRouter.use("/auth", authRoutes);

// Loan endpoints: /loans
rootRouter.use("/loans", loanRoutes);

export default rootRouter;
