import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/init-db";

// 标记数据库是否已初始化
let isDbInitialized = false;

export async function GET() {
  try {
    // 仅在首次请求时初始化数据库
    if (!isDbInitialized) {
      await initDatabase();
      isDbInitialized = true;
    }

    return NextResponse.json({ success: true, message: "数据库已初始化" });
  } catch (error) {
    console.error("初始化API错误:", error);
    return NextResponse.json(
      { success: false, error: "数据库初始化失败" },
      { status: 500 }
    );
  }
}
