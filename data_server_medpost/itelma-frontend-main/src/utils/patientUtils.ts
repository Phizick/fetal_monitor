export const calculatePregnancyWeeks = (pregnancyStartDate: string): number => {
  const startDate = new Date(pregnancyStartDate);
  const now = new Date();
  const weeks = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return weeks || 0;
};

export const formatMonitoringValue = (value: number, unit: string = ''): string => {
  return `${value}${unit}`;
};

export const isNormalValue = (type: 'fhr' | 'uc' | 'baseline' | 'variability', value: number): boolean => {
  switch (type) {
    case 'fhr':
      return value >= 110 && value <= 160;
    case 'uc':
      return value >= 0 && value <= 30;
    case 'baseline':
      return value >= 110 && value <= 160;
    case 'variability':
      return value >= 5 && value <= 25;
    default:
      return true;
  }
};
