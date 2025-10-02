import { Modal, Form, Select, App } from "antd"
import { usePatientContext } from "../PatientContext/PatientContext";

import styles from './addMedModal.module.css'

export const AddMedModal = ({ isModalOpen, setIsModalOpen, meds, setMeds }: {
    isModalOpen: boolean,
    meds: string[],
    setIsModalOpen: (value: boolean) => void,
    setMeds: (value: string[]) => void
}) => {
    const { notification } = App.useApp()
    const [form] = Form.useForm();
    const { patient } = usePatientContext();

    const onSubmit = async () => {
        const medication = form.getFieldValue('medication');
        if (!patient?.id) {
            notification.error({
                message: 'Ошибка',
                description: 'Сперва выберите пациента',
                placement: 'topLeft',
                className: 'notification',
            });
            return
        }
        if (!medication) {
            notification.error({
                message: 'Ошибка',
                description: 'Выберите препарат',
                placement: 'topLeft',
                className: 'notification',
            });
            return
        }
        setMeds([...meds, medication])
        setIsModalOpen(false)
        form.resetFields()

    }
    return (
        <Modal className={styles.modal}
            title="Укажите медикаменты"
            open={isModalOpen}
            closable={false}
            okText={
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.3335 7.33325V3.33325H8.66683V7.33325H12.6668V8.66659H8.66683V12.6666H7.3335V8.66659H3.3335V7.33325H7.3335Z" fill="#73FC8E" />
                    </svg>
                    Добавить
                </div>
            }
            cancelText={
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.49996 7.05767L11.7998 3.75781L12.7426 4.70062L9.44276 8.00047L12.7426 11.3003L11.7998 12.2431L8.49996 8.94327L5.20014 12.2431L4.25732 11.3003L7.55716 8.00047L4.25732 4.70062L5.20014 3.75781L8.49996 7.05767Z" fill="#FF93B3" />
                    </svg>
                    Отмена
                </div>
            }
            onOk={onSubmit}
            onCancel={() => {
                setIsModalOpen(false);
                form.resetFields();
            }}>
            <Form form={form} name='medForm' className={styles.form}>
                <Form.Item name='medication' label="Препарат">
                    <Select
                        placeholder="Выберите препарат"
                        options={[
                            { value: 'гинипрал', label: 'гинипрал' },
                            { value: 'окситоцин', label: 'окситоцин' },
                            { value: 'сернокислая магнезия', label: 'сернокислая магнезия' },
                        ].filter(item => !meds.includes(item.value))}></Select>
                </Form.Item>
            </Form>
        </Modal>
    )
}