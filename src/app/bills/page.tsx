"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getBills,
  getUsers,
  batchUpdateBills,
  getBillsByUser,
  getUserName,
  fenToYuan,
  batchDeleteBills,
} from "../../services/dataService";
import { Bill, User, CurrencyType } from "../../types";
import {
  Table,
  Card,
  Tag,
  Avatar,
  Button,
  Empty,
  Tooltip,
  Space,
  Dropdown,
  Select,
  Segmented,
  App,
} from "antd";
import {
  UserOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  DownOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  NodeIndexOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import React from "react";

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "toPay" | "toReceive">(
    "all"
  );
  const [filterCurrency, setFilterCurrency] = useState<CurrencyType | "">("");
  const [dataLoading, setDataLoading] = useState(false);
  const { message: messageApi, modal: modalApi } = App.useApp();
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // 单独加载用户数据
  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      if (typeof window !== "undefined") {
        try {
          const allUsers = await getUsers();
          if (isMounted) {
            setUsers(allUsers);
          }
        } catch (error) {
          console.error("获取用户数据失败:", error);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  // 加载账单数据
  const loadBills = async () => {
    if (typeof window !== "undefined" && !dataLoading) {
      try {
        setDataLoading(true);
        let filteredBills = [];
        if (filterUser) {
          filteredBills = await getBillsByUser(filterUser, filterType);
        } else {
          filteredBills = await getBills();
        }

        // 应用货币筛选
        if (filterCurrency) {
          filteredBills = filteredBills.filter(
            (bill) => bill.currency === filterCurrency
          );
        }

        setBills(filteredBills);
        setLoaded(true);
      } catch (error) {
        console.error("加载账单数据失败:", error);
        messageApi.error("加载账单数据失败");
      } finally {
        setDataLoading(false);
      }
    }
  };

  // 监听筛选条件变化，重新加载账单
  useEffect(() => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 设置新的定时器
    timerRef.current = setTimeout(() => {
      loadBills();
    }, 300);

    // 在组件卸载或依赖项变化时清除定时器
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUser, filterType, filterCurrency]);

  // 批量操作
  const handleBatchAction = async (
    action: "markAsPending" | "markAsCompleted"
  ) => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning("请至少选择一个账单");
      return;
    }

    await batchUpdateBills(selectedRowKeys, action, filterUser, filterType);

    const successMsg =
      action === "markAsPending"
        ? "已标记为待付款"
        : filterUser && filterType === "toPay"
        ? `已将${await getUserName(filterUser)}的付款标记为已完成`
        : "已标记为已完成";

    messageApi.success(successMsg);
    loadBills();
    setSelectedRowKeys([]);
  };

  // 批量删除账单
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning("请至少选择一个账单");
      return;
    }

    modalApi.confirm({
      title: "确认删除",
      content: `确定要删除选中的 ${selectedRowKeys.length} 个账单吗？此操作不可撤销！`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        const success = await batchDeleteBills(selectedRowKeys);
        if (success) {
          messageApi.success(`成功删除 ${selectedRowKeys.length} 个账单`);
          loadBills();
          setSelectedRowKeys([]);
        } else {
          messageApi.error("删除失败");
        }
      },
    });
  };

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as string[]);
    },
  };

  // 定义表格列
  const columns = [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      width: "20%",
    },
    {
      title: "金额",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: "15%",
      render: (amount: number, record: Bill) =>
        `${fenToYuan(amount)} ${record.currency}`,
    },
    {
      title: "货币",
      dataIndex: "currency",
      key: "currency",
      width: "10%",
      render: (currency: CurrencyType) => (
        <Tag color={currency === CurrencyType.CNY ? "blue" : "volcano"}>
          {currency}
        </Tag>
      ),
    },
    {
      title: "创建人",
      dataIndex: "createdBy",
      key: "createdBy",
      width: "15%",
      render: (userId: string) => {
        if (!userId) {
          return (
            <div
              style={{ display: "flex", alignItems: "center", color: "#999" }}
            >
              <Avatar
                size="small"
                icon={<NodeIndexOutlined />}
                style={{ marginRight: 8, backgroundColor: "#d9d9d9" }}
              />
              系统合账
            </div>
          );
        }
        return (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{ marginRight: 8 }}
            />
            {getUserName(userId)}
          </div>
        );
      },
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: "15%",
      render: (createdAt: number) => new Date(createdAt).toLocaleDateString(),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: "10%",
      render: (status: string) => {
        const statusConfig = {
          unpaid: {
            color: "warning",
            text: "未出账",
            icon: <ExclamationCircleOutlined />,
          },
          pending: {
            color: "processing",
            text: "待付款",
            icon: <ClockCircleOutlined />,
          },
          completed: {
            color: "success",
            text: "已完成",
            icon: <CheckCircleOutlined />,
          },
          merged: {
            color: "default",
            text: "已合账",
            icon: <NodeIndexOutlined />,
          },
        };
        const statusInfo = statusConfig[status as keyof typeof statusConfig];
        return (
          <Tag color={statusInfo.color} icon={statusInfo.icon}>
            {statusInfo.text}
          </Tag>
        );
      },
    },
    {
      title: "操作",
      key: "action",
      width: "10%",
      render: (_: unknown, record: Bill) => (
        <Tooltip title="查看详情">
          <Link href={`/bills/${record.id}`}>
            <Button type="link" size="small" icon={<ArrowRightOutlined />}>
              查看
            </Button>
          </Link>
        </Tooltip>
      ),
    },
  ];

  if (!loaded) {
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

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 16px 16px",
      }}
    >
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <FileTextOutlined style={{ marginRight: 8, color: "#1677ff" }} />
            <span style={{ color: "#1677ff", fontWeight: "bold" }}>
              账单管理
            </span>
          </div>
        }
        styles={{
          header: { borderBottom: "2px solid #f0f0f0" },
        }}
        style={{ borderRadius: "8px", marginBottom: 16 }}
        extra={
          <Space>
            <Dropdown
              dropdownRender={() => (
                <Card size="small" style={{ width: 300, padding: "12px" }}>
                  <Space
                    direction="vertical"
                    style={{ width: "100%" }}
                    size="middle"
                  >
                    <div>
                      <div style={{ marginBottom: 8, fontWeight: "bold" }}>
                        按用户筛选
                      </div>
                      <Select
                        style={{ width: "100%" }}
                        placeholder="选择用户"
                        allowClear
                        value={filterUser}
                        onChange={setFilterUser}
                        options={users.map((user) => ({
                          label: (
                            <div
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              <Avatar
                                size="small"
                                icon={<UserOutlined />}
                                style={{ marginRight: 8 }}
                              />
                              {user.name}
                            </div>
                          ),
                          value: user.id,
                        }))}
                      />
                    </div>

                    {filterUser && (
                      <div>
                        <div style={{ marginBottom: 8, fontWeight: "bold" }}>
                          账单类型
                        </div>
                        <Segmented
                          block
                          value={filterType}
                          onChange={(value) =>
                            setFilterType(
                              value as "all" | "toPay" | "toReceive"
                            )
                          }
                          options={[
                            { label: "全部", value: "all" },
                            { label: "待付款", value: "toPay" },
                            { label: "待收款", value: "toReceive" },
                          ]}
                        />
                      </div>
                    )}

                    <div>
                      <div style={{ marginBottom: 8, fontWeight: "bold" }}>
                        按货币筛选
                      </div>
                      <Select
                        style={{ width: "100%" }}
                        placeholder="选择货币"
                        allowClear
                        value={filterCurrency}
                        onChange={setFilterCurrency}
                        options={[
                          { label: "人民币 (CNY)", value: CurrencyType.CNY },
                          { label: "日元 (JPY)", value: CurrencyType.JPY },
                        ]}
                      />
                    </div>
                  </Space>
                </Card>
              )}
              trigger={["click"]}
            >
              <Button icon={<FilterOutlined />}>
                筛选 <DownOutlined />
              </Button>
            </Dropdown>

            <Button
              type="primary"
              icon={<ClockCircleOutlined />}
              onClick={() => handleBatchAction("markAsPending")}
              disabled={selectedRowKeys.length === 0}
            >
              标记待付款
            </Button>

            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleBatchAction("markAsCompleted")}
              disabled={selectedRowKeys.length === 0}
            >
              标记已完成
            </Button>

            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
              disabled={selectedRowKeys.length === 0}
            >
              批量删除
            </Button>
          </Space>
        }
      >
        {(filterUser || filterCurrency) && (
          <div
            style={{ marginBottom: 16, display: "flex", alignItems: "center" }}
          >
            <Space size="middle">
              {filterUser && (
                <Tag color="blue" closable onClose={() => setFilterUser("")}>
                  用户: {getUserName(filterUser)}
                  {filterType !== "all" &&
                    ` (${filterType === "toPay" ? "待付款" : "待收款"})`}
                </Tag>
              )}

              {filterCurrency && (
                <Tag
                  color="purple"
                  closable
                  onClose={() => setFilterCurrency("")}
                >
                  货币: {filterCurrency}
                </Tag>
              )}
            </Space>

            <Button
              type="link"
              onClick={() => {
                setFilterUser("");
                setFilterType("all");
                setFilterCurrency("");
              }}
            >
              清除所有筛选
            </Button>
          </div>
        )}

        <Table
          dataSource={bills}
          columns={columns}
          rowKey="id"
          rowSelection={{
            ...rowSelection,
            preserveSelectedRowKeys: true,
          }}
          pagination={{
            pageSize: 10,
            hideOnSinglePage: true,
          }}
          locale={{
            emptyText: <Empty description="暂无账单数据" />,
          }}
        />
      </Card>
    </div>
  );
}
