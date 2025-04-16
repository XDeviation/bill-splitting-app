'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Menu, Button } from 'antd';
import { 
  HomeOutlined, 
  FileTextOutlined, 
  UserOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Header } = Layout;

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeKey, setActiveKey] = useState('home');
  
  // 当路径变化时，更新激活的菜单项
  useEffect(() => {
    if (pathname === '/') {
      setActiveKey('home');
    } else if (pathname.startsWith('/bills')) {
      setActiveKey('bills');
    } else if (pathname.startsWith('/users')) {
      setActiveKey('users');
    }
  }, [pathname]);
  
  // 菜单项点击处理
  const handleMenuClick = (key: string) => {
    switch (key) {
      case 'home':
        router.push('/');
        break;
      case 'bills':
        router.push('/bills');
        break;
      case 'users':
        router.push('/users');
        break;
    }
  };
  
  // 新建账单点击处理
  const handleCreateBill = () => {
    router.push('/bills/new');
  };

  return (
    <Header
      style={{
        background: 'linear-gradient(90deg, #1677ff 0%, #4096ff 100%)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        height: '56px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: '20px',
          marginRight: '24px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        分账应用
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[activeKey]}
        onClick={({ key }) => handleMenuClick(key)}
        style={{
          background: 'transparent',
          color: 'white',
          flex: 1,
          minWidth: 0,
          borderBottom: 'none',
        }}
        theme="dark"
        items={[
          {
            key: 'home',
            icon: <HomeOutlined />,
            label: '首页',
          },
          {
            key: 'bills',
            icon: <FileTextOutlined />,
            label: '账单',
          },
          {
            key: 'users',
            icon: <UserOutlined />,
            label: '用户',
          },
        ]}
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleCreateBill}
        style={{
          backgroundColor: '#ff7a45',
          borderColor: '#ff7a45',
          boxShadow: '0 2px 0 rgba(0, 0, 0, 0.045)',
        }}
        className="create-bill-btn"
      >
        新建账单
      </Button>
      <style jsx global>{`
        /* 清除所有菜单项底部的横线 */
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item::after,
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item-selected::after,
        .ant-menu-dark.ant-menu-horizontal::after {
          display: none !important;
          content: none !important;
          border-bottom: none !important;
        }
        
        .ant-menu-dark.ant-menu-horizontal {
          border-bottom: none !important;
        }
        
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item-selected {
          background-color: rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px;
          font-weight: 600;
          position: relative;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
        }
        
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item-selected::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 40%;
          height: 3px;
          background-color: white;
          border-radius: 3px 3px 0 0;
        }
        
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item {
          margin: 0 4px;
          padding: 0 16px;
          transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
          height: 56px;
          line-height: 56px;
          border-bottom: none !important;
        }
        
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px;
          color: #fff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item-selected .ant-menu-title-content,
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item-selected .anticon {
          transform: scale(1.05);
          transition: transform 0.3s ease;
        }
        
        .create-bill-btn {
          transition: all 0.3s ease;
        }
        
        .create-bill-btn:hover {
          background-color: #ff4d4f !important;
          border-color: #ff4d4f !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 122, 69, 0.4) !important;
        }
      `}</style>
    </Header>
  );
} 