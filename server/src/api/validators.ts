import { z } from 'zod';

export const emailQuerySchema = z.object({ emailid: z.string().email() });

export const createRequestSchema = z.object({
  employeeid: z.string().min(1),
  emailid: z.string().email(),
  item_category: z.string().min(1),
  amount: z.number().positive(),
  justification: z.string().min(1)
});

export const approveRejectSchema = z.object({
  approver_email: z.string().email(),
  notes: z.string().optional()
});