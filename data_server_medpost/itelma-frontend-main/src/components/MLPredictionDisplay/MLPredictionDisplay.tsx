import React from 'react';
import { Typography, Tag, Card, Row, Col, Statistic } from 'antd';

const { Text } = Typography;

const forecastTranslations: Record<string, string> = {
  'any_pathology': 'Любая патология',
  'low_variability': 'Низкая вариабельность',
  'fetal_bradycardia': 'Брадикардия плода',
  'fetal_tachycardia': 'Тахикардия плода',
  'uterine_tachysystole': 'Тахисистолия матки'
};

interface MLPredictionData {
  prediction: 'Normal' | 'Suspect' | 'Pathological';
  confidence: number;
  forecasts: {
    '10min': {
      fetal_bradycardia: number;
      fetal_tachycardia: number;
      low_variability: number;
      uterine_tachysystole: number;
      any_pathology: number;
    };
    '30min': {
      fetal_bradycardia: number;
      fetal_tachycardia: number;
      low_variability: number;
      uterine_tachysystole: number;
      any_pathology: number;
    };
    '60min': {
      fetal_bradycardia: number;
      fetal_tachycardia: number;
      low_variability: number;
      uterine_tachysystole: number;
      any_pathology: number;
    };
  };
}

interface MLPredictionDisplayProps {
  data: MLPredictionData | null;
}

const MLPredictionDisplay: React.FC<MLPredictionDisplayProps> = ({ data }) => {
  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Text type="secondary">Нет данных о прогнозах</Text>
      </div>
    );
  }

  const { prediction, confidence, forecasts } = data;
  const confidencePercent = Math.round(confidence * 100);

  let statusText = '';
  let statusColor = '';

  switch (prediction) {
    case 'Normal':
      statusText = 'Норма';
      statusColor = '#52c41a';
      break;
    case 'Suspect':
      statusText = 'Подозрительно';
      statusColor = '#faad14';
      break;
    case 'Pathological':
      statusText = 'Патология';
      statusColor = '#ff4d4f';
      break;
    default:
      statusText = 'Неизвестно';
      statusColor = '#d9d9d9';
  }

  const renderForecast = (period: string, forecastData: Record<string, number>) => (
    <Card key={period} size="small" style={{ marginBottom: 16 }}>
      <Text strong style={{ fontSize: '16px', marginBottom: 12, display: 'block' }}>
        {period === '10min' ? '10 минут' : period === '30min' ? '30 минут' : '60 минут'}
      </Text>
      <Row gutter={[16, 8]}>
        {Object.entries(forecastData).map(([key, value]) => (
          <Col key={key} xs={24} sm={12} md={8}>
            <Statistic
              title={forecastTranslations[key] || key}
              value={Math.round(value * 100)}
              suffix="%"
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
        ))}
      </Row>
    </Card>
  );

  return (
    <div style={{ padding: '20px' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card>
            <Text strong style={{ fontSize: '18px', marginBottom: 16, display: 'block' }}>
              Текущий прогноз
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 16 }}>
              <Tag color={statusColor} style={{ fontSize: '16px', padding: '8px 16px' }}>
                {statusText}
              </Tag>
              <Text style={{ fontSize: '16px' }}>
                Процент вероятности: <Text strong>{confidencePercent}%</Text>
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <Text strong style={{ fontSize: '18px', marginBottom: 16, display: 'block' }}>
          Ближайшие прогнозы
        </Text>
        {renderForecast('10min', forecasts['10min'])}
        {renderForecast('30min', forecasts['30min'])}
        {renderForecast('60min', forecasts['60min'])}
      </div>
    </div>
  );
};

export default MLPredictionDisplay;
