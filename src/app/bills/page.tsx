'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getBills, 
  getUsers, 
  batchUpdateBills, 
  getBillsByUser,
  mergeBillsByCurrency,
  getUserName,
  fenToYuan,
  batchDeleteBills
} from '../../services/dataService';
import { Bill, User, CurrencyType, BillStatus } from '../../types';
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
  NodeIndexOutlined,
  DeleteOutlined
} from '@ant-design/icons';

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'toPay' | 'toReceive'>('all');
  const [filterCurrency, setFilterCurrency] = useState<CurrencyType | ''>('');
  const [merging, setMerging] = useState(false);
  const { message: messageApi, modal: modalApi } = App.useApp();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUser, filterType, filterCurrency]);

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

  // 批量删除账单
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('请至少选择一个账单');
      return;
    }
    
    modalApi.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个账单吗？此操作不可撤销！`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const success = batchDeleteBills(selectedRowKeys);
        if (success) {
          messageApi.success(`成功删除 ${selectedRowKeys.length} 个账单`);
          loadData();
          setSelectedRowKeys([]);
        } else {
          messageApi.error('删除失败');
        }
      }
    });
  };

  // 处理一键合账
  const handleMergeBills = async () => {
    // 设置合并中状态，禁用按钮
    setMerging(true);
    
    try {
      // 先检查是否有足够的待付款账单可以合并
      const allBills = getBills();
      // 只考虑待付款(PENDING)状态的账单，忽略待出账(UNPAID)状态的账单
      const pendingBills = allBills.filter(bill => bill.status === BillStatus.PENDING);
      
      // 按币种分组计数
      const billCountByCurrency: Record<CurrencyType, number> = {
        [CurrencyType.CNY]: 0,
        [CurrencyType.JPY]: 0,
      };
      
      pendingBills.forEach(bill => {
        billCountByCurrency[bill.currency]++;
      });
      
      // 检查每种币种是否有至少两个账单可以合并
      const hasMergeableBills = Object.values(billCountByCurrency).some(count => count >= 2);
      
      if (!hasMergeableBills) {
        messageApi.warning('没有可合并的账单，需要至少两个相同币种的待付款账单');
        setMerging(false);
        return;
      }
      
      // 进行合账操作，mergeBillsByCurrency函数内部会筛选待付款账单
      const result = await mergeBillsByCurrency();
      const currencies = Object.keys(result);
      
      // 检查是否有成功合并的账单
      if (currencies.length === 0 || currencies.every(currency => !result[currency as CurrencyType]?.length)) {
        messageApi.warning('合并失败，请检查待付款账单的状态');
        setMerging(false);
        return;
      }
      
      // 计算合并的账单数量
      let totalBillsMerged = 0;
      currencies.forEach(currency => {
        const currencyBills = result[currency as CurrencyType] || [];
        totalBillsMerged += currencyBills.length;
      });
      
      // 展示合并结果
      const successMsg = `成功创建 ${totalBillsMerged} 个合并账单`;
      
      messageApi.success(successMsg);
      
      // 重新加载数据以显示合并后的账单
      loadData();
    } catch (error) {
      console.error("合并账单失败:", error);
      messageApi.error('合并账单失败，请稍后重试');
    } finally {
      // 无论成功失败，都恢复按钮状态
      setMerging(false);
    }
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
        `${fenToYuan(amount)} ${record.currency}`,
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
      render: (userId: string) => {
        if (!userId) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', color: '#999' }}>
              <Avatar size="small" icon={<NodeIndexOutlined />} style={{ marginRight: 8, backgroundColor: '#d9d9d9' }} />
              系统合账
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
            {getUserName(userId)}
          </div>
        );
      },
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
          pending: { color: 'processing', text: '待付款', icon: <ClockCircleOutlined /> },
          completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
          merged: { color: 'default', text: '已合账', icon: <NodeIndexOutlined /> },
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
            
            <Button 
              type="default" 
              icon={<NodeIndexOutlined />} 
              onClick={handleMergeBills}
              loading={merging}
              disabled={merging}
            >
              一键合账
            </Button>
            
            <Button 
              type="primary"
              icon={<ClockCircleOutlined />}
              onClick={() => handleBatchAction('markAsPending')}
              disabled={selectedRowKeys.length === 0}
            >
              标记待付款
            </Button>
            
            <Button 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleBatchAction('markAsCompleted')}
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