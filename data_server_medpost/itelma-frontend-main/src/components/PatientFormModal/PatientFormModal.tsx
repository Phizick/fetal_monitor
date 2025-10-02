import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Drawer, Form, Input, DatePicker, InputNumber, Select, Grid, Button } from 'antd';
import PhoneInput from './PhoneInput';
import dayjs, { Dayjs } from 'dayjs';
import { userService, patientService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { User, Patient, CreatePatientResponse } from '../../types';
import { showSuccess, showError } from '../../services/notificationService';

interface PatientFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: CreatePatientResponse | null) => void;
  initialValues?: Partial<Patient> & { id?: string };
}

interface PatientFormValues {
  name: string;
  birthday: Dayjs;
  address: string;
  phone: string;
  roomNumber?: number;
  pregnancyStartDate: Dayjs;
  fetusCount: number;
  doctorId: number;
}

const PatientFormModal: React.FC<PatientFormModalProps> = ({ open, onClose, onSuccess, initialValues }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // <= 768px
  const [form] = Form.useForm<PatientFormValues>();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<User[]>([]);
  const isEdit = !!initialValues?.id;

  useEffect(() => {
    if (!open) return;
    const loadDoctors = async () => {
      try {
        const res = await userService.getUsers({ page: 1, limit: 1000 });
        setDoctors(res.users || []);
      } catch {
        // ignore
      }
    };
    loadDoctors();
  }, [open]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      const base = {
        name: initialValues?.name,
        birthday: initialValues?.birthday ? dayjs(initialValues.birthday) : undefined,
        address: initialValues?.address,
        phone: initialValues?.phone,
        roomNumber: initialValues?.roomNumber ? Number(initialValues.roomNumber) : undefined,
        pregnancyStartDate: initialValues?.pregnancyStartDate ? dayjs(initialValues.pregnancyStartDate) : undefined,
        fetusCount: initialValues?.fetusCount ?? 1,
        doctorId: initialValues?.doctorId ?? user?.id,
      } as Partial<PatientFormValues>;
      form.setFieldsValue(base);
    }
  }, [open, user, form, initialValues]);

const nameVal = Form.useWatch('name', form);
const birthdayVal = Form.useWatch('birthday', form);
const addressVal = Form.useWatch('address', form);
const phoneVal = Form.useWatch('phone', form);
const isSaveDisabled = useMemo(() => {
  const hasRequired = !!nameVal && !!birthdayVal && !!addressVal && !!phoneVal;
  if (!hasRequired) return true;
  const digits = String(phoneVal).replace(/\D/g, '');
  const phoneValid = digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'));
  return !phoneValid;
}, [nameVal, birthdayVal, addressVal, phoneVal]);


  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload: Patient = {
        name: values.name,
        birthday: values.birthday.toISOString(),
        address: values.address,
        phone: values.phone,
        roomNumber: values.roomNumber != null ? String(values.roomNumber) : '',
        pregnancyStartDate: values.pregnancyStartDate?.toISOString() || dayjs().toISOString(),
        fetusCount: values.fetusCount || 1,
        doctorId: values.doctorId || (user?.id ?? 0),
      };

      if (initialValues?.id) {
        await patientService.updatePatient(initialValues.id, payload);
        showSuccess('Пациентка обновлена');
        onSuccess(null);
      } else {
        const result = await patientService.createPatient(payload);
        showSuccess('Пациентка создана');
        onSuccess(result);
      }
      onClose();
    } catch (err: unknown) {
      if ((err as { errorFields?: unknown })?.errorFields) return;
      showError('Не удалось создать пациентку');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <Form form={form} layout="vertical">
      <Form.Item label="Имя" name="name" rules={[{ required: true, message: 'Введите имя' }]}>
        <Input placeholder="Имя" allowClear />
      </Form.Item>
      <Form.Item label="Дата рождения" name="birthday" rules={[{ required: true, message: 'Выберите дату рождения' }]}>
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item label="Адрес" name="address" rules={[{ required: true, message: 'Введите адрес' }]}>
        <Input placeholder="Адрес" allowClear />
      </Form.Item>
      <Form.Item
        label="Телефон"
        name="phone"
        rules={[
          { required: true, message: 'Введите телефон' },
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              const digits = String(value).replace(/\D/g, '');
              if (digits.length !== 11) return Promise.reject('Неверный номер');
              if (!(digits.startsWith('7') || digits.startsWith('8'))) return Promise.reject('Начинайте с +7 или 8');
              return Promise.resolve();
            }
          }
        ]}
      >
        <PhoneInput placeholder="+7 (999) 999-99-99" allowClear />
      </Form.Item>
      <Form.Item label="Палата" name="roomNumber">
        <InputNumber style={{ width: '100%' }} min={0} placeholder="Номер палаты" />
      </Form.Item>
      <Form.Item label="Дата начала беременности" name="pregnancyStartDate">
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item label="Количество плодов" name="fetusCount">
        <InputNumber style={{ width: '100%' }} min={1} max={4} />
      </Form.Item>
      <Form.Item label="Лечащий врач" name="doctorId">
        <Select
          showSearch
          optionFilterProp="label"
          options={(doctors || []).map(d => ({ value: d.id, label: d.name || d.login }))}
          placeholder="Выберите врача"
        />
      </Form.Item>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Отмена</Button>
        <Button type="primary" onClick={handleSubmit} loading={saving} disabled={isSaveDisabled}>
          Сохранить
        </Button>
      </div>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        title={isEdit ? null : 'Новая пациентка'}
        placement="bottom"
        height="90vh"
        destroyOnClose
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? null : 'Новая пациентка'}
      destroyOnClose
      footer={null}
    >
      {content}
    </Modal>
  );
};

export default PatientFormModal;


