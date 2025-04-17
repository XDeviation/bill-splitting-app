'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Form, 
  Input, 
  InputNumber, 
  Button, 
  Card, 
  Divider, 
  Tag, 
  Space, 
  Radio, 
  App,
  Checkbox,
  Row,
  Col,
  Avatar 
} from 'antd';
import { 
  FileTextOutlined, 
  PlusOutlined,
  UserOutlined
} from '@ant-design/icons';
import { getUsers, addBill, yuanToFen, fenToYuan } from '../../../services/dataService';
import { User, CurrencyType, BillStatus, BillShare } from '../../../types';

export default function NewBill() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const { message } = App.useApp();

  // 加载用户数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const usersData = getUsers();
      setUsers(usersData);
    }
  }, []);

  // 处理创建人变更
  const handleCreatorChange = (userId: string) => {
    setCreatedBy(userId);
    form.setFieldValue('createdBy', userId);
    
    // 不再自动添加创建者到参与用户名单
    // 根据当前的用户选择自动均分金额（如果已有选择）
    if (selectedUsers.length > 0) {
      handleSplitEvenly(selectedUsers, userId);
    }
  };

  // 处理用户选择变化
  const handleUserSelectChange = (userId: string, checked: boolean) => {
    let newSelectedUsers: string[];
    
    if (checked) {
      // 添加用户
      newSelectedUsers = [...selectedUsers, userId];
    } else {
      // 移除用户（但创建者也可以被移除，与创建者角色无关）
      newSelectedUsers = selectedUsers.filter(id => id !== userId);
    }
    
    setSelectedUsers(newSelectedUsers);
    updateShares(newSelectedUsers, createdBy || '');
    
    // 自动均分（如果有选中的用户且已设置创建者）
    if (newSelectedUsers.length > 0 && createdBy) {
      handleSplitEvenly(newSelectedUsers, createdBy);
    }
  };
  
  // 更新分账项
  const updateShares = (userIds: string[], creator: string) => {
    const prevShares = form.getFieldValue('shares') || [];
    const newShares = userIds.map(userId => {
      const existingShare = prevShares.find((share: BillShare) => share.userId === userId);
      return existingShare || { 
        userId, 
        amount: 0, 
        paid: userId === creator // 如果是创建者，自动标记为已付款
      };
    });
    
    form.setFieldsValue({ shares: newShares });
  };

  // 处理均分金额
  const handleSplitEvenly = (userIds = selectedUsers, creator = createdBy) => {
    // 如果没有指定用户ID列表或创建者，使用当前状态的值
    userIds = userIds || selectedUsers;
    creator = creator || form.getFieldValue('createdBy');
    
    const totalAmount = form.getFieldValue('totalAmount') || 0;
    
    if (totalAmount <= 0) {
      message.warning('请先输入总金额');
      return;
    }
    
    if (userIds.length === 0) {
      message.warning('请先选择参与用户');
      return;
    }
    
    if (!creator) {
      message.warning('请先选择创建人');
      return;
    }
    
    // 先将金额转为整数（分）
    const totalAmountInFen = yuanToFen(totalAmount);
    
    // 创建者可以不是参与用户，不再检查创建者是否在参与用户列表中
    
    // 计算每人应付金额（整数分）
    const amountPerPersonInFen = Math.floor(totalAmountInFen / userIds.length);
    
    // 剩余的余额（用于处理不能整除的情况）
    let remainingFen = totalAmountInFen - (amountPerPersonInFen * userIds.length);
    
    // 创建分账
    const shares = userIds.map(userId => {
      // 计算该用户应付的金额
      let userAmountInFen = amountPerPersonInFen;
      
      // 如果有余额，按顺序分配给用户，每人多1分
      if (remainingFen > 0) {
        userAmountInFen += 1;
        remainingFen--;
      }
      
      // 将整数分转回显示用的元
      const displayAmount = parseFloat(fenToYuan(userAmountInFen));
      
      return {
        userId,
        amount: displayAmount,
        paid: userId === creator // 如果是创建者，自动标记为已付款
      };
    });
    
    // 更新表单
    form.setFieldsValue({ shares });
  };

  // 提交表单
  const handleSubmit = (values: Record<string, unknown>) => {
    // 确保分账金额总和等于总金额
    const totalAmount = values.totalAmount as number;
    const sharesTotal = (values.shares as BillShare[]).reduce((sum, share) => sum + share.amount, 0);
    
    // 允许有小误差（小于1分钱）
    if (Math.abs(totalAmount - sharesTotal) > 0.01) {
      message.error('分账金额总和必须等于总金额');
      return;
    }
    
    // 创建账单对象
    const bill = {
      title: values.title as string,
      description: values.description as string,
      totalAmount: totalAmount, // 这里传入的是显示金额（元），服务层会转为整数（分）
      createdBy: values.createdBy as string,
      status: BillStatus.UNPAID, // 默认为未出账状态
      shares: values.shares as BillShare[],
      currency: values.currency as CurrencyType,
    };
    
    // 添加账单
    addBill(bill);
    message.success('账单创建成功');
    router.push('/bills');
  };

  // 获取用户名称
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : '未知用户';
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FileTextOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            <span style={{ color: '#1677ff', fontWeight: 'bold' }}>创建新账单</span>
          </div>
        }
        style={{ borderRadius: '8px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            currency: CurrencyType.CNY,
            shares: [],
          }}
        >
          <Form.Item
            name="title"
            label="账单标题"
            rules={[{ required: true, message: '请输入账单标题' }]}
          >
            <Input placeholder="请输入账单标题，例如：聚餐、旅行" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="账单描述"
          >
            <Input.TextArea placeholder="请输入账单描述（选填）" rows={2} />
          </Form.Item>
          
          <Space style={{ display: 'flex', marginBottom: 24 }}>
            <Form.Item
              name="totalAmount"
              label="总金额"
              rules={[{ required: true, message: '请输入总金额' }]}
              style={{ width: 200 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                placeholder="输入金额"
                style={{ width: '100%' }}
                onChange={() => {
                  // 金额变化时自动均分
                  if (selectedUsers.length > 0 && createdBy) {
                    handleSplitEvenly();
                  }
                }}
              />
            </Form.Item>
            
            <Form.Item
              name="currency"
              label="货币"
              rules={[{ required: true, message: '请选择货币' }]}
              style={{ width: 150 }}
            >
              <Radio.Group onChange={() => {
                // 货币变化时自动均分
                if (selectedUsers.length > 0 && createdBy) {
                  handleSplitEvenly();
                }
              }}>
                <Radio.Button value={CurrencyType.CNY}>CNY</Radio.Button>
                <Radio.Button value={CurrencyType.JPY}>JPY</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Space>
          
          <Form.Item
            name="createdBy"
            label="创建人"
            rules={[{ required: true, message: '请选择创建人' }]}
          >
            <Radio.Group onChange={(e) => handleCreatorChange(e.target.value)}>
              <Row gutter={[16, 8]}>
                {users.map(user => (
                  <Col span={8} key={user.id}>
                    <Radio value={user.id}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        {user.name}
                      </Space>
                    </Radio>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>
          
          <Divider orientation="left">分账设置</Divider>
          
          <Form.Item
            label="参与用户"
            required
          >
            <Checkbox.Group value={selectedUsers}>
              <Row gutter={[16, 8]}>
                {users.map(user => (
                  <Col span={8} key={user.id}>
                    <Checkbox 
                      value={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => handleUserSelectChange(user.id, e.target.checked)}
                      disabled={false}
                    >
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        {user.name}
                      </Space>
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
          
          <Button 
            type="dashed" 
            onClick={() => handleSplitEvenly()} 
            style={{ marginBottom: 16 }}
            icon={<PlusOutlined />}
            block
          >
            均分金额
          </Button>
          
          <Form.List name="shares">
            {(fields) => (
              <>
                {fields.map(({ key, name, ...restField }) => {
                  const userId = form.getFieldValue(['shares', name, 'userId']);
                  return (
                    <div key={key} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 150, marginRight: 16 }}>
                        <Tag icon={<UserOutlined />} color={userId === createdBy ? "blue" : "default"}>
                          {getUserName(userId)} {userId === createdBy && "(创建者)"}
                        </Tag>
                      </div>
                      <Form.Item
                        {...restField}
                        name={[name, 'amount']}
                        rules={[{ required: true, message: '请输入金额' }]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <InputNumber
                          placeholder="金额"
                          min={0}
                          step={0.01}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'userId']}
                        style={{ display: 'none' }}
                      >
                        <Input type="hidden" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'paid']}
                        style={{ display: 'none' }}
                      >
                        <Input type="hidden" />
                      </Form.Item>
                    </div>
                  );
                })}
              </>
            )}
          </Form.List>
          
          <Divider />
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建账单
              </Button>
              <Button onClick={() => router.push('/bills')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 