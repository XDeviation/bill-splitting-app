"use client";
import React, { useState, useEffect } from "react";
import {
  getUsers,
  getBills,
  calculateSettlements,
  markShareAsPaid,
} from "../services/dataService";
import { User, Bill, Settlement, CurrencyType, BillStatus } from "../types";
import {
  Card,
  Statistic,
  Row,
  Col,
  List,
  Avatar,
  Tag,
  Empty,
  Spin,
  Button,
  App,
} from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  TransactionOutlined,
  DollarOutlined,
  MoneyCollectOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Column } from "@ant-design/charts";

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const { message } = App.useApp();

  useEffect(() => {
    // 加载数据
    const loadData = () => {
      if (typeof window !== "undefined") {
        const usersData = getUsers();
        const billsData = getBills();
        const settlementsData = calculateSettlements();

        setUsers(usersData);
        setBills(billsData);
        setSettlements(settlementsData);

        // 处理图表数据
        const userBalances: Record<
          string,
          { userId: string; name: string; cny: number; jpy: number }
        > = {};

        // 初始化用户余额
        usersData.forEach((user) => {
          userBalances[user.id] = {
            userId: user.id,
            name: user.name,
            cny: 0,
            jpy: 0,
          };
        });

        // 计算每个用户在各个货币下的结算金额
        settlementsData.forEach((settlement) => {
          // 确保用户ID存在
          if (
            userBalances[settlement.fromUser] &&
            userBalances[settlement.toUser]
          ) {
            if (settlement.currency === CurrencyType.CNY) {
              userBalances[settlement.fromUser].cny -= settlement.amount;
              userBalances[settlement.toUser].cny += settlement.amount;
            } else if (settlement.currency === CurrencyType.JPY) {
              userBalances[settlement.fromUser].jpy -= settlement.amount;
              userBalances[settlement.toUser].jpy += settlement.amount;
            }
          }
        });

        // 计算未结算的账单
        billsData.forEach((bill) => {
          if (bill.status === BillStatus.PENDING) {
            bill.shares.forEach((share) => {
              // 确保用户ID存在
              if (
                !share.paid &&
                userBalances[share.userId] &&
                userBalances[bill.createdBy]
              ) {
                const amount = share.amount;
                if (bill.currency === CurrencyType.CNY) {
                  userBalances[share.userId].cny -= amount;
                  userBalances[bill.createdBy].cny += amount;
                } else if (bill.currency === CurrencyType.JPY) {
                  userBalances[share.userId].jpy -= amount;
                  userBalances[bill.createdBy].jpy += amount;
                }
              }
            });
          }
        });

        // 转换为图表数据格式
        const chartDataItems: any[] = [];
        Object.values(userBalances).forEach((balance) => {
          // 只添加有数据的用户
          if (balance.cny !== 0 || balance.jpy !== 0) {
            // 添加人民币数据
            const cnyValue = balance.cny / 100; // 转换回元显示
            chartDataItems.push({
              user: balance.name,
              value: cnyValue,
              type: "人民币 (CNY)",
              originalValue: cnyValue,
            });

            // 添加日元数据（除以20以便于展示比例，但显示原始值）
            const jpyValue = balance.jpy;
            chartDataItems.push({
              user: balance.name,
              value: jpyValue / 20, // 日元除以20进行高度展示
              type: "日元 (JPY)",
              originalValue: jpyValue,
            });
          }
        });

        setChartData(chartDataItems);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 获取用户名称
  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : "未知用户";
  };

  // 处理结算完成的功能
  const handleSettlementComplete = (settlement: Settlement) => {
    setSettlingId(`${settlement.fromUser}_${settlement.toUser}`);

    // 找到与这个结算相关的所有账单
    const relevantBills = bills.filter(
      (bill) =>
        bill.status === BillStatus.PENDING &&
        bill.currency === settlement.currency &&
        bill.createdBy === settlement.toUser &&
        bill.shares.some(
          (share) => share.userId === settlement.fromUser && !share.paid
        )
    );

    // 标记所有相关账单的分账为已支付
    const promises = relevantBills.map((bill) => {
      return markShareAsPaid(bill.id, settlement.fromUser);
    });

    Promise.all(promises)
      .then(() => {
        // 重新加载数据
        const usersData = getUsers();
        const billsData = getBills();
        const settlementsData = calculateSettlements();

        setUsers(usersData);
        setBills(billsData);
        setSettlements(settlementsData);

        message.success("结算已完成！");
      })
      .catch((error) => {
        console.error("结算失败", error);
        message.error("结算失败，请重试");
      })
      .finally(() => {
        setSettlingId(null);
      });
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "calc(100vh - 100px)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
      {/* 汇总统计 */}
      <Row gutter={16} style={{ marginBottom: "20px" }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="账单总数"
              value={bills.length}
              prefix={<FileTextOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="待结算交易"
              value={settlements.length}
              prefix={<TransactionOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="流通金额 (人民币)"
              value={
                bills
                  .filter(
                    (b) =>
                      b.currency === CurrencyType.CNY &&
                      b.status === BillStatus.PENDING
                  )
                  .reduce((sum, bill) => sum + bill.totalAmount, 0) / 100
              }
              precision={2}
              prefix={<DollarOutlined style={{ color: "#ff4d4f" }} />}
              suffix="CNY"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="流通金额 (日元)"
              value={bills
                .filter(
                  (b) =>
                    b.currency === CurrencyType.JPY &&
                    b.status === BillStatus.PENDING
                )
                .reduce((sum, bill) => sum + bill.totalAmount, 0)}
              precision={0}
              prefix={<MoneyCollectOutlined style={{ color: "#722ed1" }} />}
              suffix="JPY"
            />
          </Card>
        </Col>
      </Row>

      {/* 结算柱状图 */}
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <TransactionOutlined style={{ color: "#1677ff", marginRight: 8 }} />
            <span style={{ fontWeight: "bold", color: "#1677ff" }}>
              结算金额统计
            </span>
          </div>
        }
        style={{ marginBottom: "20px", padding: "12px" }}
      >
        {chartData.length > 0 ? (
          <div style={{ height: "200px", width: "100%" }}>
            <Column
              data={chartData}
              isGroup={true}
              xField="user"
              yField="value"
              seriesField="type"
              label={false}
              yAxis={false}
              columnWidthRatio={0.6}
              color={["#1677ff", "#722ed1"]}
              legend={{
                position: "top-right",
              }}
              tooltip={{
                customContent: (title: string, items: any[]) => {
                  if (!items || items.length === 0) return "";

                  return `<div style="padding: 8px;">
                    <div style="margin-bottom: 4px;"><b>${title}</b></div>
                    ${items
                      .map((item) => {
                        const { name, value, color } = item;
                        const formattedValue = name.includes("JPY")
                          ? `${parseFloat(value).toFixed(0)} JPY`
                          : `${parseFloat(value).toFixed(2)} CNY`;
                        return `<div style="display: flex; align-items: center; margin-bottom: 3px;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; margin-right: 6px;"></div>
                        <div>${name}: ${formattedValue}</div>
                      </div>`;
                      })
                      .join("")}
                  </div>`;
                },
              }}
              height={200}
              autoFit={true}
              padding="auto"
            />
          </div>
        ) : (
          <Empty description="暂无结算数据" />
        )}
      </Card>

      {/* 待结算列表 */}
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <TransactionOutlined style={{ color: "#1677ff", marginRight: 8 }} />
            <span style={{ fontWeight: "bold", color: "#1677ff" }}>
              待结算交易
            </span>
          </div>
        }
        style={{ marginBottom: "20px" }}
      >
        {settlements.length > 0 ? (
          <List
            dataSource={settlements}
            renderItem={(settlement) => {
              const settlementId = `${settlement.fromUser}_${settlement.toUser}`;
              const isSettling = settlingId === settlementId;

              return (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleSettlementComplete(settlement)}
                      loading={isSettling}
                    >
                      标记为已结算
                    </Button>,
                  ]}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{ flex: 1, display: "flex", alignItems: "center" }}
                    >
                      <Avatar
                        icon={<UserOutlined />}
                        style={{ backgroundColor: "#1677ff", marginRight: 8 }}
                      />
                      {getUserName(settlement.fromUser)}
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <Tag color="blue">
                        {`${settlement.amount.toFixed(
                          settlement.currency === CurrencyType.JPY ? 0 : 2
                        )} ${settlement.currency}`}
                      </Tag>
                      <TransactionOutlined style={{ margin: "0 8px" }} />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      {getUserName(settlement.toUser)}
                      <Avatar
                        icon={<UserOutlined />}
                        style={{ backgroundColor: "#52c41a", marginLeft: 8 }}
                      />
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty description="暂无待结算交易" />
        )}
      </Card>
    </div>
  );
}
