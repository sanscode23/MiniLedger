import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";
import { requestOtpSchema, verifyOtpSchema } from "../validators/auth.validator.js";
import { AppError } from "../middleware/error.middleware.js";

const OTP_EXPIRY_MINUTES = 5;

export const requestOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone } = requestOtpSchema.parse(req.body);

    // Generate secure 6-digit numeric OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP record to database
    await prisma.otp.create({
      data: {
        phone,
        code: otp,
        expiresAt,
        used: false,
      },
    });

    // Clear console output for mock OTP delivery
    console.log("\n=======================================================");
    console.log("                [MOCK OTP SERVICE]                     ");
    console.log(`  Recipient Phone : ${phone}`);
    console.log(`  Generated OTP   : ${otp}`);
    console.log(`  Expires At      : ${expiresAt.toISOString()} (${OTP_EXPIRY_MINUTES} mins)`);
    console.log("=======================================================\n");

    res.status(200).json({
      message: "OTP sent successfully. Check the server console for the mock OTP code.",
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);

    // Find the latest unused matching OTP for this phone
    const otpRecord = await prisma.otp.findFirst({
      where: {
        phone,
        code: otp,
        used: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new AppError("Invalid OTP or code has already been used", 400);
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new AppError("OTP has expired. Please request a new code", 400);
    }

    // Mark OTP as used to prevent replay attacks (single-use)
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { phone },
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError("JWT_SECRET is not configured on the server", 500);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
      },
      secret,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
