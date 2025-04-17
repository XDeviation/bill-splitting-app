"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Typography,
  Card,
  Button,
  Tag,
  Space,
  Divider,
  List,
  Avatar,
  Descriptions,
  Popconfirm,
  App,
} from "antd";
import {
  UserOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  getBills,
  getUsers,
  deleteBill,
  markBillAsPending,
  markBillAsCompleted,
  markShareAsPaid,
  getUserName,
  fenToYuan,
} from "../../../services/dataService";
import { Bill, BillStatus, User } from "../../../types";

const { Title, Text } = Typography;

export default function BillDetailPage() {
  const params = useParams();
  const billId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";
  const router = useRouter();
  const { message: messageApi } = App.useApp();

  const [bill, setBill] = useState<Bill | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorName, setCreatorName] = useState<string>("加载中...");

  // 获取账单数据
  useEffect(() => {
    async function fetchData() {
      if (typeof window !== "undefined") {
        const allBills = await getBills();
        const foundBill = allBills.find((b) => b.id === billId);
        if (foundBill) {
          setBill(foundBill);
          setCreatorName(await getUserName(foundBill.createdBy));
        }

        setUsers(await getUsers());
        setLoading(false);
      }
    }

    fetchData();
  }, [billId]);

  // 获取状态标签
  const getStatusTag = (status: BillStatus) => {
    const statusConfig = {
      [BillStatus.UNPAID]: {
        color: "warning",
        text: "未出账",
        icon: <ExclamationCircleOutlined />,
      },
      [BillStatus.PENDING]: {
        color: "processing",
        text: "待付款",
        icon: <ExclamationCircleOutlined />,
      },
      [BillStatus.COMPLETED]: {
        color: "success",
        text: "已完成",
        icon: <CheckCircleOutlined />,
      },
      [BillStatus.MERGED]: {
        color: "default",
        text: "已合账",
        icon: <CheckCircleOutlined />,
      },
    };

    const config = statusConfig[status];
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 删除账单
  const handleDelete = async () => {
    if (bill) {
      const success = await deleteBill(bill.id);
      if (success) {
        messageApi.success("账单已删除");
        router.push("/bills");
      } else {
        messageApi.error("删除失败");
      }
    }
  };

  // 标记为待付款
  const handleMarkAsPending = async () => {
    if (bill) {
      const updatedBill = await markBillAsPending(bill.id);
      if (updatedBill) {
        setBill(updatedBill);
        messageApi.success("账单已标记为待付款");
      }
    }
  };

  // 标记为已完成
  const handleMarkAsCompleted = async () => {
    if (bill) {
      const updatedBill = await markBillAsCompleted(bill.id);
      if (updatedBill) {
        setBill(updatedBill);
        messageApi.success("账单已标记为已完成");
      }
    }
  };

  // 标记分账已支付
  const handleMarkShareAsPaid = async (userId: string) => {
    if (bill) {
      const updatedBill = await markShareAsPaid(bill.id, userId);
      if (updatedBill) {
        setBill(updatedBill);
        messageApi.success(`${await getUserName(userId)}的付款已确认`);
      }
    }
  };

  // 返回账单列表
  const handleBack = () => {
    router.push("/bills");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      />
    );
  }

  if (!bill) {
    return (
      <Card
        style={{
          maxWidth: "800px",
          margin: "20px auto",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <Title level={4}>账单不存在</Title>
        <Button type="primary" icon={<RollbackOutlined />} onClick={handleBack}>
          返回账单列表
        </Button>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", padding: "0 16px" }}>
      <Card
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                {bill.title}
              </Title>
              {getStatusTag(bill.status as BillStatus)}
            </Space>
            <Space>
              <Button icon={<RollbackOutlined />} onClick={handleBack}>
                返回
              </Button>
            </Space>
          </div>
        }
        extra={
          <Space>
            {bill.status !== BillStatus.MERGED && (
              <>
                <Popconfirm
                  title="确定要删除此账单吗？"
                  onConfirm={handleDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
                {bill.status === BillStatus.UNPAID && (
                  <Button type="primary" onClick={handleMarkAsPending}>
                    标记为待付款
                  </Button>
                )}
                {bill.status === BillStatus.PENDING && (
                  <Button type="primary" onClick={handleMarkAsCompleted}>
                    标记为已完成
                  </Button>
                )}
              </>
            )}
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="金额">
            {`${fenToYuan(bill.totalAmount)} ${bill.currency}`}
          </Descriptions.Item>
          <Descriptions.Item label="创建者">
            <div style={{ display: "flex", alignItems: "center" }}>
              <Avatar
                size="small"
                icon={<UserOutlined />}
                style={{ marginRight: 8 }}
              />
              {creatorName}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(bill.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {getStatusTag(bill.status as BillStatus)}
          </Descriptions.Item>
          {bill.description && (
            <Descriptions.Item label="描述" span={2}>
              {bill.description}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientation="left">分账明细</Divider>

        <List
          itemLayout="horizontal"
          dataSource={bill.shares}
          renderItem={(share) => {
            const user = users.find((u) => u.id === share.userId);
            return (
              <List.Item
                actions={[
                  share.paid ? (
                    <Tag color="success">已支付</Tag>
                  ) : bill.status === BillStatus.PENDING ? (
                    <Button
                      type="link"
                      onClick={() => handleMarkShareAsPaid(share.userId)}
                    >
                      确认支付
                    </Button>
                  ) : null,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={user ? user.name : "未知用户"}
                  description={
                    <Space>
                      <Text>
                        应付: {`${fenToYuan(share.amount)} ${bill.currency}`}
                      </Text>
                      {share.paid && <Tag color="success">已支付</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}
