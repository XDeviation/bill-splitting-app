"use client";
import React, { useEffect, Suspense } from "react";
import { Inter } from "next/font/google";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import Navigation from "../components/Navigation";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 初始化数据库
  useEffect(() => {
    const initDb = async () => {
      try {
        await fetch("/api/init");
        console.log("数据库初始化请求已发送");
      } catch (error) {
        console.error("无法初始化数据库:", error);
      }
    };

    initDb();
  }, []);

  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: "#1677ff",
            },
          }}
        >
          <App>
            <Navigation />
            <main>
              <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            </main>
          </App>
        </ConfigProvider>
      </body>
    </html>
  );
}
