import mongoose from "mongoose";
import { Bill, BillStatus, CurrencyType, BillShare } from "../types";

const billShareSchema = new mongoose.Schema<BillShare>(
  {
    userId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paid: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema<Bill>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(BillStatus),
    default: BillStatus.UNPAID,
  },
  shares: [billShareSchema],
  currency: {
    type: String,
    enum: Object.values(CurrencyType),
    default: CurrencyType.CNY,
  },
});

// 当模型不存在时创建，否则使用已存在的模型
export default mongoose.models.Bill || mongoose.model<Bill>("Bill", billSchema);
