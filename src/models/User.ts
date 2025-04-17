import mongoose from "mongoose";
import { User } from "../types";

const userSchema = new mongoose.Schema<User>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
});

// 当模型不存在时创建，否则使用已存在的模型
export default mongoose.models.User || mongoose.model<User>("User", userSchema);
