'use client';
import React, { useState, useEffect } from 'react';
import { getUsers, getBills, calculateSettlements } from '../services/dataService';
import { User, Bill, Settlement, CurrencyType } from '../types';
import { Card, Statistic, Row, Col, List, Avatar, Tag, Empty, Spin } from 'antd';
import { 
  UserOutlined, 
  FileTextOutlined, 
  TransactionOutlined, 
  DollarOutlined 
} from '@ant-design/icons';

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载数据
    const loadData = () => {
      if (typeof window !== 'undefined') {
        const usersData = getUsers();
        const billsData = getBills();
        const settlementsData = calculateSettlements();
        
        setUsers(usersData);
        setBills(billsData);
        setSettlements(settlementsData);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 获取用户名称
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : '未知用户';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 100px)' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* 汇总统计 */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="用户数量"
              value={users.length}
              prefix={<UserOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="账单总数"
              value={bills.length}
              prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="待结算交易"
              value={settlements.length}
              prefix={<TransactionOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="流通金额 (人民币)"
              value={bills.filter(b => b.currency === CurrencyType.CNY).reduce((sum, bill) => sum + bill.totalAmount, 0)}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#ff4d4f' }} />}
              suffix="CNY"
            />
          </Card>
        </Col>
      </Row>

      {/* 待结算列表 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TransactionOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            <span style={{ fontWeight: 'bold', color: '#1677ff' }}>待结算交易</span>
          </div>
        }
        style={{ marginBottom: '20px' }}
      >
        {settlements.length > 0 ? (
          <List
            dataSource={settlements}
            renderItem={(settlement) => (
              <List.Item>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff', marginRight: 8 }} />
                    {getUserName(settlement.fromUser)}
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <Tag color="blue">
                      {`${settlement.amount.toFixed(settlement.currency === CurrencyType.JPY ? 0 : 2)} ${settlement.currency}`}
                    </Tag>
                    <TransactionOutlined style={{ margin: '0 8px' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {getUserName(settlement.toUser)}
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#52c41a', marginLeft: 8 }} />
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无待结算交易" />
        )}
      </Card>

      {/* 用户列表 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            <span style={{ fontWeight: 'bold', color: '#1677ff' }}>用户列表</span>
          </div>
        }
      >
        {users.length > 0 ? (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={users}
            renderItem={(user) => (
              <List.Item>
                <Card hoverable>
                  <Card.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={user.name}
                    description={`用户ID: ${user.id}`}
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无用户" />
        )}
      </Card>
    </div>
  );
} 