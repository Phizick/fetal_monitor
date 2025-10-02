import { Modal, Form, App, Tabs } from "antd"
import { useEffect, useState } from "react";
import { skipToken } from '@reduxjs/toolkit/query';
import { SelectPatientForm } from "./SelectPatientForm";
import { useAddPatientsMutation, useGetAllPatientsQuery, useGetPatientByIdQuery } from "../../api/initialApi";
import styles from './selectPatient.module.css'
import { usePatientContext } from "../PatientContext/PatientContext";
import { PatientType } from "../../types";

export const SelectPatientModal = ({ isModalOpen, setIsModalOpen }: { isModalOpen: boolean, setIsModalOpen: (value: boolean) => void }) => {
    const { notification } = App.useApp()
    const { setPatient } = usePatientContext()
    const [form] = Form.useForm()
    const [activeKey, setActiveKey] = useState('fromBase');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
    const [list, setList] = useState<Array<PatientType>>([])

    const [addPatient, {
        isLoading: isAdding,
        isError: isAddingError,
        error: addingError
    }] = useAddPatientsMutation()
    useEffect(() => {
        if (isAddingError) {
            notification.error({
                message: 'Ошибка',
                description: `Ошибка при добавлении пациента`,
                placement: 'topLeft',
                className: 'notification',
            });
            console.error('Ошибка при добавлении пациента:', addingError);
        }
    }, [isAddingError, addingError]);

    const {
        data: patientsList,
        isSuccess,
        isError,
        error,
        isLoading,
    } = useGetAllPatientsQuery()
    useEffect(() => {
        if (isError) {
            notification.error({
                message: 'Ошибка',
                description: `Ошибка получения списка пациентов`,
                placement: 'topLeft',
                className: 'notification',
            });
            console.error('Ошибка получения списка пациентов:', error);
        }
        if (isSuccess && patientsList) {
            setList(patientsList)
        }
    }, [isError, error, isSuccess, patientsList]);

    const {
        data: selectedPatient,
        isSuccess: isPatientSuccess,
        isError: isPatientError,
        error: patientError,
        isLoading: isPatientLoading,
    } = useGetPatientByIdQuery(selectedPatientId ?? skipToken)

    useEffect(() => {
        if (isPatientError) {
            notification.error({
                message: 'Ошибка',
                description: `Ошибка при загрузке данных`,
                placement: 'topLeft',
                className: 'notification',
            });
            console.error('Ошибка при загрузке данных:', patientError);
        }
        if (isPatientSuccess && selectedPatient) {
            setPatient(selectedPatient)
        }
    }, [isError, error, isPatientSuccess, selectedPatient]);

    const onSubmit = async () => {
        let id
        const { patient, patientId, age, gestationalAge } = form.getFieldsValue();
        if (patientId) {
            id = patientId;
        }
        if (patient && patient.length > 3) {
            const { data } = await addPatient({ full_name: patient });
            if (data?.id) {
                id = data.id;
            }
        }
        if (!id) {
            notification.error({
                message: 'Ошибка',
                description: 'Сперва выберите пациента',
                placement: 'topLeft',
                className: 'notification',
            });
            return
        }
        setSelectedPatientId(id)
        setIsModalOpen(false)
        form.resetFields()
    }

    const onChange = (key: string) => {
        setActiveKey(key);
        form.resetFields()
    };
    return (
        <Modal className={styles.modal}
            open={isModalOpen}
            closable={false}
            confirmLoading={isLoading || isAdding || isPatientLoading}
            okText={
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8.00004 14.6668C11.6819 14.6668 14.6667 11.682 14.6667 8.00016C14.6667 4.31826 11.6819 1.3335 8.00004 1.3335C4.31814 1.3335 1.33337 4.31826 1.33337 8.00016C1.33337 11.682 4.31814 14.6668 8.00004 14.6668ZM11.6381 6.3049L7.33337 10.6096L4.52863 7.8049L5.47145 6.8621L7.33337 8.72403L10.6953 5.36209L11.6381 6.3049Z" fill="#73FC8E" />
                    </svg>
                    Сохранить
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
                form.resetFields()
            }}>
            <Tabs
                onChange={onChange}
                activeKey={activeKey}
                items={[
                    { label: `Выбрать из базы`, children: <SelectPatientForm patients={list} form={form} type='fromBase' />, key: 'fromBase' },
                    { label: `Ввести вручную`, children: <SelectPatientForm form={form} type='handleAdd' />, key: 'handleAdd' }
                ]}
            />

        </Modal>
    )
}
