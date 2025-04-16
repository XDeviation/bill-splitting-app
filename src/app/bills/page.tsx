'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBills, getUsers, batchUpdateBills, getBillsByUser } from '../../services/dataService';
import { Bill, User, CurrencyType } from '../../types';
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
  Menu,
  Checkbox,
  Select,
  Segmented,
  Row,
  Col,
  message,
  App
} from 'antd';
import { 
  UserOutlined, 
  ArrowRightOutlined, 
  FileTextOutlined,
  DownOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'toPay' | 'toReceive'>('all');
  const [filterCurrency, setFilterCurrency] = useState<CurrencyType | ''>('');
  const { message: messageApi } = App.useApp();

  // 加载数据
  const loadData = () => {
    if (typeof window !== 'undefined') {
      const allUsers = getUsers();
      setUsers(allUsers);
      
      let filteredBills = [];
      if (filterUser) {
        filteredBills = getBillsByUser(filterUser, filterType);
      } else {
        filteredBills = getBills();
      }
      
      // 应用货币筛选
      if (filterCurrency) {
        filteredBills = filteredBills.filter(bill => bill.currency === filterCurrency);
      }
      
      setBills(filteredBills);
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterUser, filterType, filterCurrency]);

  // 获取用户名称
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : '未知用户';
  };

  // 批量操作
  const handleBatchAction = (action: 'markAsPending' | 'markAsCompleted') => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('请至少选择一个账单');
      return;
    }
    
    batchUpdateBills(selectedRowKeys, action, filterUser, filterType);
    
    const successMsg = action === 'markAsPending' 
      ? '已标记为待付款' 
      : filterUser && filterType === 'toPay'
        ? `已将${getUserName(filterUser)}的付款标记为已完成`
        : '已标记为已完成';
    
    messageApi.success(successMsg);
    loadData();
    setSelectedRowKeys([]);
  };

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as string[]);
    }
  };

  // 定义表格列
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: '20%',
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: '15%',
      render: (amount: number, record: Bill) => 
        `${amount.toFixed(record.currency === CurrencyType.JPY ? 0 : 2)} ${record.currency}`,
    },
    {
      title: '货币',
      dataIndex: 'currency',
      key: 'currency',
      width: '10%',
      render: (currency: CurrencyType) => (
        <Tag color={currency === CurrencyType.CNY ? 'blue' : 'volcano'}>
          {currency}
        </Tag>
      ),
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: '15%',
      render: (userId: string) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
          {getUserName(userId)}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      render: (createdAt: number) => new Date(createdAt).toLocaleDateString(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status: string) => {
        const statusConfig = {
          unpaid: { color: 'warning', text: '未出账', icon: <ExclamationCircleOutlined /> },
          pending: { color: 'processing', text: '出账', icon: <ClockCircleOutlined /> },
          completed: { color: 'success', text: '完成', icon: <CheckCircleOutlined /> },
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
      title: '操作',
      key: 'action',
      width: '10%',
      render: (_: any, record: Bill) => (
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
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }} />;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 16px' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FileTextOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            <span style={{ color: '#1677ff', fontWeight: 'bold' }}>账单管理</span>
          </div>
        }
        styles={{
          header: { borderBottom: '2px solid #f0f0f0' }
        }}
        style={{ borderRadius: '8px', marginBottom: 16 }}
        extra={
          <Space>
            <Dropdown 
              dropdownRender={() => (
                <Card 
                  size="small" 
                  style={{ width: 300 }} 
                  bodyStyle={{ padding: '12px' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <div style={{ marginBottom: 8, fontWeight: 'bold' }}>按用户筛选</div>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="选择用户"
                        allowClear
                        value={filterUser}
                        onChange={setFilterUser}
                        options={users.map(user => ({
                          label: (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
                              {user.name}
                            </div>
                          ),
                          value: user.id
                        }))}
                      />
                    </div>
                    
                    {filterUser && (
                      <div>
                        <div style={{ marginBottom: 8, fontWeight: 'bold' }}>账单类型</div>
                        <Segmented
                          block
                          value={filterType}
                          onChange={(value) => setFilterType(value as 'all' | 'toPay' | 'toReceive')}
                          options={[
                            { label: '全部', value: 'all' },
                            { label: '待付款', value: 'toPay' },
                            { label: '待收款', value: 'toReceive' }
                          ]}
                        />
                      </div>
                    )}
                    
                    <div>
                      <div style={{ marginBottom: 8, fontWeight: 'bold' }}>按货币筛选</div>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="选择货币"
                        allowClear
                        value={filterCurrency}
                        onChange={setFilterCurrency}
                        options={[
                          { label: '人民币 (CNY)', value: CurrencyType.CNY },
                          { label: '日元 (JPY)', value: CurrencyType.JPY }
                        ]}
                      />
                    </div>
                  </Space>
                </Card>
              )}
              trigger={['click']}
            >
              <Button icon={<FilterOutlined />}>
                筛选 <DownOutlined />
              </Button>
            </Dropdown>
            
            <Dropdown
              disabled={selectedRowKeys.length === 0}
              menu={{
                items: [
                  {
                    key: '1',
                    label: '标记为待付款',
                    icon: <ClockCircleOutlined />,
                    onClick: () => handleBatchAction('markAsPending')
                  },
                  {
                    key: '2',
                    label: '标记为已完成',
                    icon: <CheckCircleOutlined />,
                    onClick: () => handleBatchAction('markAsCompleted')
                  }
                ]
              }}
            >
              <Button type="primary" disabled={selectedRowKeys.length === 0}>
                批量操作 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        }
      >
        {(filterUser || filterCurrency) && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
            <Space size="middle">
              {filterUser && (
                <Tag color="blue" closable onClose={() => setFilterUser('')}>
                  用户: {getUserName(filterUser)}
                  {filterType !== 'all' && ` (${filterType === 'toPay' ? '待付款' : '待收款'})`}
                </Tag>
              )}
              
              {filterCurrency && (
                <Tag color="purple" closable onClose={() => setFilterCurrency('')}>
                  货币: {filterCurrency}
                </Tag>
              )}
            </Space>
            
            <Button 
              type="link" 
              onClick={() => {
                setFilterUser('');
                setFilterType('all');
                setFilterCurrency('');
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
          rowSelection={rowSelection}
          pagination={{ pageSize: 10 }}
          locale={{ 
            emptyText: <Empty description="暂无账单数据" /> 
          }}
        />
      </Card>
    </div>
  );
} 