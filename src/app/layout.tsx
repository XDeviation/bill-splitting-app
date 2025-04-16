'use client';
import React from 'react';
import { Inter } from 'next/font/google';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Navigation from '../components/Navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: '#1677ff',
            },
          }}
        >
          <App>
            <Navigation />
            <main>{children}</main>
          </App>
        </ConfigProvider>
      </body>
    </html>
  );
} 