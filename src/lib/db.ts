import mongoose from "mongoose";

// 确保只在服务器端运行
const isServer = typeof window === "undefined";

if (!isServer) {
  throw new Error("数据库连接应当只在服务器端运行");
}

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/bill-splitting-app";

if (!MONGODB_URI) {
  throw new Error("请在.env.local文件中定义MONGODB_URI");
}

// 缓存连接的接口定义
interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

// 为global声明mongoose属性
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// 确保cached有一个初始值
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

// 如果不存在，则初始化
if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
