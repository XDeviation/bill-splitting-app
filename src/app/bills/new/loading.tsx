"use client";

import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />}
        tip="加载中..."
      />
    </div>
  );
}
