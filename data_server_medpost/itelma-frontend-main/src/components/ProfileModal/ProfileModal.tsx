import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { useUserStore } from '../../store/userStore';
import { userService } from '../../services/api';
import { showSuccess, showError } from '../../services/notificationService';
import ChangePasswordModal from '../ChangePasswordModal/ChangePasswordModal';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const { user, setUser } = useUserStore();

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        login: user.login,
        name: user.name,
      });
      setHasChanges(false);
    }
  }, [open, user, form]);

  const handleValuesChange = () => {
    const currentValues = form.getFieldsValue();
    const hasLoginChanged = currentValues.login !== user?.login;
    const hasNameChanged = currentValues.name !== user?.name;
    setHasChanges(hasLoginChanged || hasNameChanged);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const updatedUser = await userService.updateProfile({
        login: values.login,
        name: values.name,
      });

      setUser(updatedUser);
      showSuccess('Ваши данные успешно изменены');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setHasChanges(false);
    onClose();
  };

  const handleChangePassword = () => {
    setIsChangePasswordOpen(true);
  };

  const handleChangePasswordClose = () => {
    setIsChangePasswordOpen(false);
  };

  return (
    <Modal
      title="Редактирование профиля"
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
          disabled={!hasChanges}
          onClick={handleSave}
        >
          Сохранить изменения
        </Button>,
      ]}
      width={400}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          label="Логин"
          name="login"
          rules={[
            { required: true, message: 'Введите логин' },
            { min: 3, message: 'Логин должен содержать не менее 3 символов' },
          ]}
        >
          <Input placeholder="Введите логин" />
        </Form.Item>

        <Form.Item
          label="Имя"
          name="name"
          rules={[
            { required: true, message: 'Введите имя' },
            { min: 2, message: 'Имя должно содержать не менее 2 символов' },
          ]}
        >
          <Input placeholder="Введите имя" />
        </Form.Item>

        <Form.Item>
          <Button
            type="link"
            onClick={handleChangePassword}
            style={{ padding: 0, color: '#1890ff' }}
          >
            Сменить пароль
          </Button>
        </Form.Item>
      </Form>

      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={handleChangePasswordClose}
      />
    </Modal>
  );
};

export default ProfileModal;
