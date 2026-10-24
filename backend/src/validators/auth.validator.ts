import { z } from "zod";

// E.164 format: starts with +, country code (1-9), followed by digits up to 15 digits total
export const e164PhoneRegex = /^\+[1-9]\d{1,14}$/;

export const requestOtpSchema = z.object({
  phone: z
    .string({
      required_error: "Phone number is required",
    })
    .trim()
    .regex(
      e164PhoneRegex,
      "Invalid phone number format. Must follow E.164 format (e.g. +14155552671 or +919876543210)"
    ),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string({
      required_error: "Phone number is required",
    })
    .trim()
    .regex(
      e164PhoneRegex,
      "Invalid phone number format. Must follow E.164 format (e.g. +14155552671 or +919876543210)"
    ),
  otp: z
    .string({
      required_error: "OTP code is required",
    })
    .trim()
    .regex(/^\d{6}$/, "OTP must be a 6-digit number"),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
