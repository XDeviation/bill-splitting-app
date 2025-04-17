import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserModel from "@/models/User";
import { User } from "@/types";

// 获取所有用户
export async function GET() {
  try {
    await dbConnect();
    const users = await UserModel.find({}, "-_id").lean();
    return NextResponse.json(users);
  } catch (error: unknown) {
    console.error("获取用户错误:", error);
    return NextResponse.json({ error: "获取用户失败" }, { status: 500 });
  }
}

// 创建新用户
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.name) {
      return NextResponse.json({ error: "用户名是必填项" }, { status: 400 });
    }

    await dbConnect();

    // 生成唯一ID
    const newUser: User = {
      id: Date.now().toString(),
      name: data.name,
    };

    await UserModel.create(newUser);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    console.error("创建用户错误:", error);
    return NextResponse.json({ error: "创建用户失败" }, { status: 500 });
  }
}
