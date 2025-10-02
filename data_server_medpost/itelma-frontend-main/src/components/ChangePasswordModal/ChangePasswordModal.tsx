import React, { useState } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { userService } from '../../services/api';
import { showSuccess } from '../../services/notificationService';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      await userService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      showSuccess('Пароль успешно изменен');
      form.resetFields();
      onClose();
    } catch (error: unknown) {
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Смена пароля"
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Отмена
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={loading}
          onClick={handleSave}
        >
          Сменить
        </Button>,
      ]}
      width={400}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="Текущий пароль"
          name="currentPassword"
          rules={[
            { required: true, message: 'Введите текущий пароль' },
            { min: 8, message: 'Пароль должен содержать не менее 8 символов' },
          ]}
        >
          <Input.Password placeholder="Введите текущий пароль" />
        </Form.Item>

        <Form.Item
          label="Новый пароль"
          name="newPassword"
          rules={[
            { required: true, message: 'Введите новый пароль' },
            { min: 8, message: 'Пароль должен содержать не менее 8 символов' },
          ]}
        >
          <Input.Password placeholder="Введите новый пароль" />
        </Form.Item>

        <Form.Item
          label="Повторите новый пароль"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Повторите новый пароль' },
            { min: 8, message: 'Пароль должен содержать не менее 8 символов' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Пароли не совпадают'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Повторите новый пароль" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
