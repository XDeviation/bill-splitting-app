import dbConnect from "./db";

export async function initDatabase() {
  console.log("初始化数据库...");

  try {
    await dbConnect();
    console.log("数据库连接成功");
  } catch (error) {
    console.error("数据库初始化失败:", error);
  }
}
