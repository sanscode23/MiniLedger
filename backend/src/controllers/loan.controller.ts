import { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import { createLoanSchema, loanIdParamSchema } from "../validators/loan.validator.js";
import * as loanService from "../services/loan.service.js";
import { AppError } from "../middleware/error.middleware.js";

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createLoanSchema.parse(req.body);
    const loan = await loanService.createLoan(req.user!.id, data);
    res.status(201).json(loan);
  } catch (error) {
    next(error);
  }
};

export const list = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loans = await loanService.getUserLoans(req.user!.id);
    res.status(200).json(loans);
  } catch (error) {
    next(error);
  }
};

export const repay = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = loanIdParamSchema.parse(req.params);
    const loan = await loanService.repayLoan(req.user!.id, id);
    res.status(200).json(loan);
  } catch (error) {
    next(error);
  }
};

export const uploadLoanReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = loanIdParamSchema.parse(req.params);

    if (!req.file) {
      throw new AppError("Receipt file is required (field 'receipt')", 400);
    }

    const receiptUrl = `/uploads/${req.file.filename}`;
    const loan = await loanService.attachReceipt(req.user!.id, id, receiptUrl);
    res.status(200).json(loan);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore cleanup error
      }
    }
    next(error);
  }
};

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await loanService.getLoansSummary(req.user!.id);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};
