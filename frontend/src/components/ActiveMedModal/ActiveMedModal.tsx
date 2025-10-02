import { Modal, List, Typography, Button, Space, App } from "antd"
import { useEffect, useState } from "react";
import { useUpdateMedicationsByIdMutation } from "../../api/initialApi";
import { AddMedModal } from "../AddMedModal/AddMedModal";
import { usePatientContext } from "../PatientContext/PatientContext";

import styles from './activeMedModal.module.css'

export const ActiveMedModal = ({ isModalOpen, setIsModalOpen }: { isModalOpen: boolean, setIsModalOpen: (value: boolean) => void }) => {
    const { notification } = App.useApp()
    const { patient } = usePatientContext()
    const [meds, setMeds] = useState<string[]>([])
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [updateMedications, { isLoading, isError, error }] = useUpdateMedicationsByIdMutation();

    useEffect(() => {
        if (patient?.medications) {
            setMeds(patient.medications)
        }

    }, [patient?.medications])

    useEffect(() => {
        if (isError) {
            notification.error({
                message: 'Ошибка',
                description: 'Ошибка обновления данных',
                placement: 'topLeft',
                className: 'notification',
            });
            console.error('Ошибка обновления данных: ', error)
        }
    }, [isError, error])

    const onSubmit = async () => {
        if (!patient) {
            notification.error({
                message: 'Ошибка',
                description: 'Сперва выберите пациента',
                placement: 'topLeft',
                className: 'notification',
            });
            return
        }
        await updateMedications({ id: patient?.id, medications: meds })
        setIsModalOpen(false)
    }

    return (
        <Modal className={styles.modal}
            title="Активные медикаменты"
            open={isModalOpen}
            closable={false}
            confirmLoading={isLoading}
            okText={
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.3335 7.33325V3.33325H8.66683V7.33325H12.6668V8.66659H8.66683V12.6666H7.3335V8.66659H3.3335V7.33325H7.3335Z" fill="#73FC8E" />
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
                setMeds(patient?.medications ?? []);
            }}>
            <List>
                {meds.map((med, index) => {
                    return (
                        <List.Item className={styles.list_item} key={index}>
                            <Typography.Text>{med}</Typography.Text>
                            <Space>
                                <Button className={styles.item_button} id={`del-${med}`} onClick={() => setMeds((prev) => prev.filter(item => item !== med))}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M4.66683 3.99992V1.99992C4.66683 1.63173 4.96531 1.33325 5.3335 1.33325H10.6668C11.035 1.33325 11.3335 1.63173 11.3335 1.99992V3.99992H14.6668V5.33325H13.3335V13.9999C13.3335 14.3681 13.035 14.6666 12.6668 14.6666H3.3335C2.96531 14.6666 2.66683 14.3681 2.66683 13.9999V5.33325H1.3335V3.99992H4.66683ZM6.00016 2.66659V3.99992H10.0002V2.66659H6.00016Z" fill="#FF93B3" />
                                    </svg>
                                </Button>
                                <Button className={styles.item_button} id={`pause-${med}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M7.00016 13.6666C3.31826 13.6666 0.333496 10.6818 0.333496 6.99992C0.333496 3.31802 3.31826 0.333252 7.00016 0.333252C10.682 0.333252 13.6668 3.31802 13.6668 6.99992C13.6668 10.6818 10.682 13.6666 7.00016 13.6666ZM5.00016 4.99992V8.99992H6.3335V4.99992H5.00016ZM7.66683 4.99992V8.99992H9.00016V4.99992H7.66683Z" fill="#F2F2F2" />
                                    </svg>
                                </Button>
                            </Space>

                        </List.Item>
                    )
                })}
            </List>
            <Button className={styles.add_button} type='primary' id='add' onClick={() => setIsAddModalOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="10" viewBox="0 0 9 10" fill="none">
                    <path d="M3.9165 4.41675V0.916748H5.08317V4.41675H8.58317V5.58341H5.08317V9.08341H3.9165V5.58341H0.416504V4.41675H3.9165Z" fill="#0D0D0D" />
                </svg>
                Добавить медикамент
            </Button>
            <AddMedModal meds={meds} setMeds={setMeds} isModalOpen={isAddModalOpen} setIsModalOpen={setIsAddModalOpen} />

        </Modal>
    )
}