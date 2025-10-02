import React, { useState, useEffect } from 'react';
import { Layout as AntLayout } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.scss';

const { Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={styles.layout}>
      <AntLayout className={styles.antLayout}>
        <Sidebar collapsed={collapsed} />
        {isMobile && !collapsed && (
          <div
            className={styles.overlay}
            onClick={toggleSidebar}
          />
        )}
        <AntLayout className={`${styles.siteLayout} ${collapsed ? styles.collapsed : ''}`}>
          <Header
            collapsed={collapsed}
            onToggle={toggleSidebar}
          />
          <Content className={styles.content}>
            {children}
          </Content>
        </AntLayout>
      </AntLayout>
    </div>
  );
};

export default Layout;
