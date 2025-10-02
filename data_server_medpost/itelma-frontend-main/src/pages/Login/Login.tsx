import React, { useState } from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { showError } from '../../services/notificationService';
import Logo from '../../assets/logo.png'
import styles from './Login.module.scss';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState({ login: '', password: '' });
  const { login } = useAuth();

  const onFinish = async (values: { login: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
    } catch (error: unknown) {
      console.error('Login error:', error);
      let errorMessage = 'Ошибка входа в систему';

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className={styles.loginPage}>
        <header className={styles.header}>
          <img src={Logo} alt="Logo" className={styles.logo}/>
        </header>

        <main className={styles.wrapper}>
          <div className={styles.loginCard}>
            <div className={styles.cardHeader}>
              <Typography.Title level={2}>Вход</Typography.Title>
              <Typography.Text className={styles.subtitle}>Заполните форму для входа в аккаунт</Typography.Text>
            </div>
             <Form
                 form={form}
                 name="login"
                 onFinish={onFinish}
                 onValuesChange={(_changedValues, allValues) => {
                   setFormValues(allValues);
                 }}
                 autoComplete="off"
                 layout="vertical"
                 className={styles.form}
             >
               <div className={styles.formFields}>
                 <Form.Item
                     name="login"
                     label="Логин"
                     rules={[
                       {required: true, message: 'Введите логин'},
                       {min: 3, message: 'Логин должен содержать минимум 3 символа'}
                     ]}
                 >
                   <Input
                       prefix={<UserOutlined/>}
                       placeholder="Введите логин"
                       size="large"
                   />
                 </Form.Item>

                 <Form.Item
                     name="password"
                     label="Пароль"
                     rules={[
                       {required: true, message: 'Введите пароль'},
                       {min: 8, message: 'Пароль должен содержать минимум 8 символов'}
                     ]}
                 >
                   <Input.Password
                       prefix={<LockOutlined/>}
                       placeholder="Введите пароль"
                       size="large"
                   />
                 </Form.Item>
               </div>

               <div className={styles.formActions}>
                 <Form.Item>
                   <Button
                       type="primary"
                       htmlType="submit"
                       loading={loading}
                       disabled={
                         !formValues.login ||
                         !formValues.password ||
                         formValues.login.length < 3 ||
                         formValues.password.length < 8
                       }
                       size="large"
                       block
                   >
                     Войти
                   </Button>
                 </Form.Item>
               </div>
             </Form>
          </div>
        </main>
      </div>
  );
};

export default Login;
