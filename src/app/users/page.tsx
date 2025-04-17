"use client";
import React, { useState, useEffect } from "react";
import { getUsers, addUser, updateUser } from "../../services/dataService";
import { User } from "../../types";
import {
  Card,
  List,
  Avatar,
  Button,
  Input,
  Form,
  Modal,
  Empty,
  Tooltip,
  App,
} from "antd";
import { UserOutlined, PlusOutlined, EditOutlined } from "@ant-design/icons";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();

  // 加载用户数据
  const loadUsers = async () => {
    if (typeof window !== "undefined") {
      const usersData = await getUsers();
      setUsers(usersData);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 处理添加用户的模态框打开
  const handleAddUser = () => {
    setIsEditing(false);
    setCurrentUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // 处理编辑用户
  const handleEditUser = (user: User) => {
    setIsEditing(true);
    setCurrentUser(user);
    form.setFieldsValue({
      name: user.name,
    });
    setIsModalOpen(true);
  };

  // 处理表单提交
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEditing && currentUser) {
        // 更新用户
        const updatedUser = {
          ...currentUser,
          name: values.name,
        };
        await updateUser(updatedUser);
        messageApi.success("用户更新成功");
      } else {
        // 添加新用户
        await addUser(values.name);
        messageApi.success("用户添加成功");
      }
      setIsModalOpen(false);
      loadUsers(); // 重新加载用户列表
    } catch (error) {
      console.error("表单验证失败:", error);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <UserOutlined style={{ marginRight: 8, color: "#1677ff" }} />
            <span style={{ color: "#1677ff", fontWeight: "bold" }}>
              用户管理
            </span>
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddUser}
          >
            添加用户
          </Button>
        }
      >
        {users.length > 0 ? (
          <List
            grid={{ gutter: 16, column: 4, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={users}
            renderItem={(user) => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    <Tooltip title="编辑用户" key="edit">
                      <EditOutlined
                        key="edit"
                        onClick={() => handleEditUser(user)}
                      />
                    </Tooltip>,
                  ]}
                >
                  <Card.Meta
                    avatar={<Avatar icon={<UserOutlined />} size="large" />}
                    title={user.name}
                    description={`用户ID: ${user.id}`}
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无用户数据" />
        )}
      </Card>

      {/* 添加/编辑用户模态框 */}
      <Modal
        title={isEditing ? "编辑用户" : "添加用户"}
        open={isModalOpen}
        onOk={handleFormSubmit}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" name="userForm">
          <Form.Item
            name="name"
            label="用户名称"
            rules={[{ required: true, message: "请输入用户名称" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
