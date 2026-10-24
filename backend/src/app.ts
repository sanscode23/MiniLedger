import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();

// Enable CORS for frontend clients
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

// Serve /uploads statically
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Application routes
app.use(routes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;
