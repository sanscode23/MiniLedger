import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { AppError } from "./error.middleware.js";

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png"];

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError("Only JPG and PNG image files are allowed", 400));
  }
};

export const uploadReceipt = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
}).single("receipt");
