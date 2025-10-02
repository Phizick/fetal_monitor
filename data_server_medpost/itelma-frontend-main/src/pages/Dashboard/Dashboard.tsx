import React from 'react';
import { Typography, Row, Col, Card, Statistic } from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  ExclamationCircleOutlined,
  MedicineBoxOutlined 
} from '@ant-design/icons';
import styles from './Dashboard.module.scss';

const { Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>Пациенты</Title>
        <Paragraph className={styles.subtitle}>
          Добавляйте пациентов и следите за их состоянием
        </Paragraph>
      </div>
      
      <div className={styles.stats}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Всего"
                value={500}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
                suffix={
                  <span className={styles.changePositive}>
                    +10
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Подключены"
                value={50}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#3f8600' }}
                suffix={
                  <span className={styles.changePositive}>
                    +10
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Подозрительные"
                value={50}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#cf1322' }}
                suffix={
                  <span>
                    % <span className={styles.changeNegative}>+10</span>
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Патологии"
                value={85}
                prefix={<MedicineBoxOutlined />}
                valueStyle={{ color: '#cf1322' }}
                suffix={
                  <span className={styles.changeNegative}>
                    +10
                  </span>
                }
              />
            </Card>
          </Col>
        </Row>
      </div>
      
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <Title level={3}>Главная страница</Title>
          <Paragraph>
            Здесь будет основная информация и статистика
          </Paragraph>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;