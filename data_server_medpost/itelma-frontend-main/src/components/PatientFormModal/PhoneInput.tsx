import React from 'react';
import { Input } from 'antd';

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}

function formatRussianPhone(input: string): string {
  const digits = (input || '').replace(/\D/g, '').slice(0, 11);

  if (!digits) return '';

  let normalized = digits;
  if (normalized.startsWith('8')) normalized = '7' + normalized.slice(1);
  if (!normalized.startsWith('7')) normalized = '7' + normalized;

  const p1 = normalized.slice(1, 4);
  const p2 = normalized.slice(4, 7);
  const p3 = normalized.slice(7, 9);
  const p4 = normalized.slice(9, 11);

  let result = '+7';
  if (p1) result += ` (${p1}`;
  if (p1 && p1.length === 3) result += ')';
  if (p2) result += ` ${p2}`;
  if (p3) result += `-${p3}`;
  if (p4) result += `-${p4}`;

  return result;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, placeholder, allowClear }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatRussianPhone(raw);
    onChange?.(formatted);
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      allowClear={allowClear}
    />
  );
};

export default PhoneInput;


