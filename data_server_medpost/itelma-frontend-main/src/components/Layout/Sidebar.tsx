import React, { useState, useEffect } from 'react';
import { Menu } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  FolderOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.scss';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>(['patients']);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      // TODO
    }
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  const menuItems = [
    {
      key: 'patients',
      icon: <UserOutlined />,
      label: 'Пациенты',
      children: [
        {
          key: '/patients/active',
          icon: <FolderOpenOutlined />,
          label: 'Активные',
        },
        {
          key: '/patients/archive',
          icon: <FolderOutlined />,
          label: 'Архив',
        },
      ],
    },
    {
      key: 'personnel',
      icon: <TeamOutlined />,
      label: 'Персонал',
      children: [
        {
          key: '/personal/doctors',
          icon: <MedicineBoxOutlined />,
          label: 'Лечащие врачи',
        },
      ],
    },
  ];

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        onClick={handleMenuClick}
        items={menuItems}
        className={styles.menu}
      />
    </div>
  );
};

export default Sidebar;
