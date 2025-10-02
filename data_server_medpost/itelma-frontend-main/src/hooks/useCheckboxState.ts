import { useState } from 'react';

const useCheckboxState = (storageKey: string, defaultValue: boolean = false) => {
  const [checked, setChecked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to parse checkbox state from localStorage:', error);
    }

    return defaultValue;
  });

  const toggleChecked = () => {
    setChecked(prev => {
      const newValue = !prev;

      try {
        localStorage.setItem(storageKey, JSON.stringify(newValue));
      } catch (error) {
        console.warn('Failed to save checkbox state to localStorage:', error);
      }

      return newValue;
    });
  };

  const setCheckedValue = (value: boolean) => {
    setChecked(value);

    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save checkbox state to localStorage:', error);
    }
  };

  return {
    checked,
    toggleChecked,
    setChecked: setCheckedValue
  };
};

export default useCheckboxState;
