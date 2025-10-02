import React, { useState } from 'react';
import { Button, Avatar, Dropdown, Menu } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { useAuth } from '../../hooks/useAuth';
import ProfileModal from '../ProfileModal/ProfileModal';
import Logo from '../../assets/logo.png';
import styles from './Header.module.scss';

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />} onClick={handleProfileClick}>
        Профиль
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={logout}>
        Выйти
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          className={styles.menuButton}
        />
        <img
          src={Logo}
          alt="Logo"
          className={styles.logo}
          onClick={() => navigate('/')}
        />
      </div>

      <div className={styles.headerRight}>
        <span className={styles.userName}>{user?.name}</span>
        <Dropdown overlay={userMenu} placement="bottomRight" trigger={['click']}>
          <div className={styles.userInfo}>
            <Avatar
              icon={<UserOutlined />}
              className={styles.avatar}
            />
          </div>
        </Dropdown>
      </div>

      <ProfileModal
        open={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default Header;
