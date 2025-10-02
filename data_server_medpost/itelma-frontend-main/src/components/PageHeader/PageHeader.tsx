import React from 'react';
import { Typography, Button, Grid } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './PageHeader.module.scss';

const { Title, Paragraph } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  titlePostfix?: React.ReactNode;
  actionsVertical?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, showBack = false, onBack, actions, titlePostfix, actionsVertical = false }) => {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const handleBack = () => {
    if (onBack) return onBack();
    navigate(-1);
  };

  return (
    <div className={styles.header}>
      {showBack && (
        <div className={styles.backRow}>
          <Button size="small" type="link" icon={<LeftOutlined />} onClick={handleBack}>
            Назад
          </Button>
          {!isMobile && actions && (
            <div
              className={styles.actions}
              style={actionsVertical ? { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } : undefined}
            >
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={styles.titleRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title level={2} style={{ margin: 0 }}>{title}</Title>
          {titlePostfix}
        </div>
      </div>
      {subtitle && (
        <Paragraph className={styles.subtitle}>{subtitle}</Paragraph>
      )}
      {isMobile && actions && (
        <div className={styles.actionsMobile}>{actions}</div>
      )}
    </div>
  );
};

export default PageHeader;


