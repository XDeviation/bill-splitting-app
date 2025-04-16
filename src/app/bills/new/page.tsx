'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Form, 
  Input, 
  InputNumber, 
  Button, 
  Card, 
  Select, 
  DatePicker, 
  Divider, 
  Tag, 
  Space, 
  Radio, 
  App 
} from 'antd';
import { 
  FileTextOutlined, 
  DeleteOutlined, 
  PlusOutlined,
  UserOutlined,
  CalendarOutlined 
} from '@ant-design/icons';
import { getUsers, addBill } from '../../../services/dataService';
import { User, CurrencyType, BillStatus, BillShare } from '../../../types';

export default function NewBill() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { message } = App.useApp();

  // 加载用户数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const usersData = getUsers();
      setUsers(usersData);
    }
  }, []);

  // 处理用户选择变化
  const handleUserSelectChange = (selectedUserIds: string[]) => {
    setSelectedUsers(selectedUserIds);
    
    // 更新分账表单项
    const prevShares = form.getFieldValue('shares') || [];
    const newShares = selectedUserIds.map(userId => {
      const existingShare = prevShares.find((share: any) => share.userId === userId);
      return existingShare || { userId, amount: 0, paid: false };
    });
    
    form.setFieldsValue({ shares: newShares });
  };

  // 处理均分金额
  const handleSplitEvenly = () => {
    const totalAmount = form.getFieldValue('totalAmount') || 0;
    const createdBy = form.getFieldValue('createdBy');
    
    if (totalAmount <= 0) {
      message.warning('请先输入总金额');
      return;
    }
    
    if (selectedUsers.length === 0) {
      message.warning('请先选择参与用户');
      return;
    }
    
    // 计算每人应付金额（精确到两位小数）
    const amountPerPerson = parseFloat((totalAmount / selectedUsers.length).toFixed(2));
    
    // 计算向下取整后的总金额
    let baseAllocatedAmount = parseFloat((amountPerPerson * selectedUsers.length).toFixed(2));
    
    // 计算剩余的差额
    let difference = parseFloat((totalAmount - baseAllocatedAmount).toFixed(2));
    
    // 需要增加的小数部分
    let adjustment = 0;
    if (difference > 0) {
      // 将difference转换为分，四舍五入
      adjustment = Math.round(difference * 100);
    }
    
    // 创建分账
    const shares = selectedUsers.map((userId, index) => {
      let amount = amountPerPerson;
      
      // 前adjustment个用户多付0.01元
      if (index < adjustment) {
        amount = parseFloat((amount + 0.01).toFixed(2));
      }
      
      return {
        userId,
        amount,
        paid: userId === createdBy // 如果是创建者，自动标记为已付款
      };
    });
    
    // 更新表单
    form.setFieldsValue({ shares });
  };

  // 提交表单
  const handleSubmit = (values: any) => {
    const createdBy = values.createdBy;
    
    // 确保分账金额总和等于总金额
    const totalAmount = values.totalAmount;
    const sharesTotal = values.shares.reduce((sum: number, share: BillShare) => sum + share.amount, 0);
    
    if (Math.abs(totalAmount - sharesTotal) > 0.01) {
      message.error('分账金额总和必须等于总金额');
      return;
    }
    
    // 创建账单对象
    const bill = {
      title: values.title,
      description: values.description,
      totalAmount: values.totalAmount,
      createdBy: values.createdBy,
      status: BillStatus.PENDING,
      shares: values.shares,
      currency: values.currency,
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
              />
            </Form.Item>
            
            <Form.Item
              name="currency"
              label="货币"
              rules={[{ required: true, message: '请选择货币' }]}
              style={{ width: 150 }}
            >
              <Radio.Group>
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
            <Select
              placeholder="选择创建人"
              options={users.map(user => ({ label: user.name, value: user.id }))}
            />
          </Form.Item>
          
          <Divider orientation="left">分账设置</Divider>
          
          <Form.Item
            label="参与用户"
            required
          >
            <Select
              mode="multiple"
              placeholder="选择参与用户"
              style={{ width: '100%' }}
              onChange={handleUserSelectChange}
              options={users.map(user => ({ label: user.name, value: user.id }))}
            />
          </Form.Item>
          
          <Button 
            type="dashed" 
            onClick={handleSplitEvenly} 
            style={{ marginBottom: 16 }}
            icon={<PlusOutlined />}
            block
          >
            均分金额
          </Button>
          
          <Form.List name="shares">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => {
                  const userId = form.getFieldValue(['shares', name, 'userId']);
                  return (
                    <div key={key} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 150, marginRight: 16 }}>
                        <Tag icon={<UserOutlined />} color="blue">
                          {getUserName(userId)}
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