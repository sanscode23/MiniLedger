import { z } from "zod";

export const createLoanSchema = z.object({
  friend_name: z
    .string({ required_error: "friend_name is required" })
    .trim()
    .min(1, "friend_name cannot be empty"),
  amount: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z
      .number({
        required_error: "amount is required",
        invalid_type_error: "amount must be a valid number",
      })
      .positive("amount must be greater than 0")
  ),
  due_date: z
    .string({ required_error: "due_date is required" })
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "due_date must be a valid date string",
    }),
});

export const loanIdParamSchema = z.object({
  id: z.string().trim().min(1, "Loan ID is required"),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
