import { Button, App } from "antd"
import { Footer } from "antd/es/layout/layout"
import { useEffect } from "react";
import { useStartMonitoringMutation, useStopMonitoringMutation } from "../../api/initialApi";
import { usePatientContext } from "../PatientContext/PatientContext";
import styles from './footer.module.css';

export const FooterMenu = ({ isStarted, setIsStarted }: { isStarted: boolean, setIsStarted: (value: boolean) => void }) => {
    const { patient } = usePatientContext()
    const { notification } = App.useApp()
    const [startMonitoring, {
        isSuccess: isSuccessStarting,
        isError: isStartingError,
        error: startingError
    }] = useStartMonitoringMutation()

    useEffect(() => {
        if (isSuccessStarting) {
            setIsStarted(true)
        }
    }, [isSuccessStarting])

    useEffect(() => {
        if (isStartingError) {
            notification.error({
                message: 'Ошибка',
                description: `Ошибка старта`,
                placement: 'topLeft',
                className: 'notification',
            });
            console.error('Ошибка старта:', startingError);
        }
    }, [isStartingError, startingError]);

    const [stopMonitoring, {
        isSuccess: isSuccessStopping,
        isError: isStoppingError,
        error: stoppingError
    }] = useStopMonitoringMutation()

    useEffect(() => {
        if (isSuccessStopping) {
            setIsStarted(false)
        }
    }, [isSuccessStopping])

    useEffect(() => {
        if (isStoppingError) {
            notification.error({
                message: 'Ошибка',
                description: `Ошибка остановки`,
                placement: 'topLeft',
                className: 'notification',
            });
            console.error('Ошибка остановки:', stoppingError);
        }
    }, [isStoppingError, stoppingError]);



    const started = () => {
        if (!patient) {
            notification.error({
                message: 'Ошибка',
                description: 'Сперва выберите пациента',
                placement: 'topLeft',
                className: 'notification',
            });
            return
        }
        if (isStarted) {
            stopMonitoring({ id: patient.id })
        } else {
            startMonitoring({ id: patient.id })
        }
        setIsStarted(!isStarted)
    }

    return (
        <Footer className={styles.footer} style={{ textAlign: 'center' }}>
            <nav className={styles.footer_menu}>
                <Button onClick={started} className={`button ${styles.footer_menu_item}`} key="1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M6.47605 4.33323H7.80939V9.66657H6.47605V4.33323Z" fill="#F2F2F2" />
                        <path d="M13.338 6.5285C13.5983 6.78885 13.5983 7.21095 13.338 7.4713L7.61413 13.1952C7.35378 13.4555 6.93167 13.4555 6.67132 13.1952L0.947459 7.4713C0.68711 7.21095 0.68711 6.78885 0.94746 6.5285L6.67132 0.804637C6.93167 0.544287 7.35378 0.544288 7.61413 0.804637L13.338 6.5285ZM2.36147 6.9999L7.14272 11.7811L11.924 6.9999L7.14272 2.21865L2.36147 6.9999Z" fill="#F2F2F2" />
                    </svg>
                    {isStarted ? 'Стоп' : 'Старт'}
                </Button>
                <Button className={`button ${styles.footer_menu_item}`} key="2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
                        <path d="M12.819 13.3341H3.09516C2.91106 13.3341 2.76183 13.1849 2.76183 13.0007C2.76183 12.9286 2.78522 12.8585 2.8285 12.8007L3.09516 12.4452V6.6674C3.09516 5.78088 3.31147 4.94486 3.69419 4.20926L1.35742 1.8725L2.30024 0.929688L15.4996 14.129L14.5567 15.0718L12.819 13.3341ZM4.70023 5.2153C4.52478 5.66545 4.4285 6.15519 4.4285 6.6674V12.0007H11.4857L4.70023 5.2153ZM13.7619 10.5246L12.4285 9.19127V6.6674C12.4285 4.45829 10.6377 2.66742 8.42852 2.66742C7.70286 2.66742 7.02236 2.86064 6.43564 3.19843L5.46785 2.23064C6.31486 1.66431 7.33312 1.33409 8.42852 1.33409C11.374 1.33409 13.7619 3.72191 13.7619 6.6674V10.5246ZM6.76183 14.0007H10.0952C10.0952 14.9212 9.34899 15.6674 8.42852 15.6674C7.50799 15.6674 6.76183 14.9212 6.76183 14.0007Z" fill="#F2F2F2" />
                    </svg>
                    Тишина
                </Button>
                <Button className={`button ${styles.footer_menu_item}`} key="3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none">
                        <path fillRule="evenodd" cbuttonp-rule="evenodd" d="M7.7137 0C9.55465 0 11.047 1.49238 11.047 3.33333V8.66667L11.0425 8.83789C10.9534 10.5993 9.49722 12 7.7137 12C5.93018 12 4.47406 10.5993 4.38493 8.83789L4.38037 8.66667V3.33333C4.38037 1.49238 5.87276 0 7.7137 0ZM7.7137 1.33333C6.60913 1.33333 5.7137 2.22876 5.7137 3.33333V8.66667C5.7137 9.77124 6.60913 10.6667 7.7137 10.6667C8.81827 10.6667 9.7137 9.77124 9.7137 8.66667V3.33333C9.7137 2.22876 8.81827 1.33333 7.7137 1.33333Z" fill="#F2F2F2" />
                        <path d="M3.38037 6L1.7137 7.66667V6.66667H0.380371V5.33333H1.7137V4.33333L3.38037 6Z" fill="#F2F2F2" />
                        <path d="M13.7137 5.33333H15.047V6.66667H13.7137V7.66667L12.047 6L13.7137 4.33333V5.33333Z" fill="#F2F2F2" />
                    </svg>
                    Обнулить TOCO
                </Button>
                <Button className={`button ${styles.footer_menu_item}`} key="4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.9999 14V2H13.3332V14H11.9999Z" fill="#F2F2F2" />
                        <path d="M10.6668 8L5.52881 13.138L4.5861 12.1953L8.78141 8L4.5861 3.80469L5.52881 2.86198L10.6668 8Z" fill="#F2F2F2" />
                        <path d="M3.3335 6L5.3335 8L3.3335 10L1.3335 8L3.3335 6Z" fill="#F2F2F2" />
                    </svg>
                    Метка
                </Button>
                <Button className={`button ${styles.footer_menu_item}`} key="5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
                        <path fillRule="evenodd" cbuttonp-rule="evenodd" d="M13.619 2C13.9872 2 14.2856 2.29848 14.2856 2.66667V13.3333C14.2856 13.7015 13.9872 14 13.619 14H2.95231C2.58412 14 2.28564 13.7015 2.28564 13.3333V2.66667C2.28564 2.29848 2.58412 2 2.95231 2H13.619ZM8.95231 4.92122L12.4432 6.66667L7.10986 9.33333L8.95231 10.2546V12.6667H12.9523V3.33333H8.95231V4.92122ZM3.61898 12.6667H7.61898V11.0788L4.12809 9.33333L9.46143 6.66667L7.61898 5.74544V3.33333H3.61898V12.6667Z" fill="#F2F2F2" />
                    </svg>
                    Печать
                </Button>
                <Button className={`button ${styles.footer_menu_item}`} key="6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
                        <path d="M7.23796 11.3333H5.23796V10H7.23796V11.3333Z" fill="#F2F2F2" />
                        <path d="M7.23796 8.66667H5.23796V7.33333H7.23796V8.66667Z" fill="#F2F2F2" />
                        <path d="M7.23796 6H5.23796V4.66667H7.23796V6Z" fill="#F2F2F2" />
                        <path fillRule="evenodd" cbuttonp-rule="evenodd" d="M13.9046 2C14.2728 2 14.5713 2.29848 14.5713 2.66667V13.3333C14.5713 13.7015 14.2728 14 13.9046 14H3.23796C2.86977 14 2.57129 13.7015 2.57129 13.3333V2.66667C2.57129 2.29848 2.86977 2 3.23796 2H13.9046ZM3.90462 12.6667H13.238V8.66667H11.5713L9.57194 6H8.57129V4.66667H10.238L12.2373 7.33333H13.238V3.33333H3.90462V12.6667Z" fill="#F2F2F2" />
                    </svg>
                    Канал
                </Button>
                <Button className={`button ${styles.footer_menu_item}`} key="7">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
                        <path fillRule="evenodd" cbuttonp-rule="evenodd" d="M14.1901 7.33333C14.1901 9.05199 13.913 10.7706 13.7161 11.7754L13.638 12.1602C13.5745 12.4594 13.3085 12.6667 13.0026 12.6667H9.52344V14H8.1901V12.6667H4.71094C4.40515 12.6665 4.13897 12.4593 4.07552 12.1602C3.88495 11.2615 3.52341 9.29739 3.52344 7.33333C3.52347 5.3693 3.88497 3.40515 4.07552 2.50651C4.13896 2.20735 4.40515 2.00014 4.71094 2H13.0026C13.3085 2 13.5745 2.20728 13.638 2.50651L13.7161 2.89128C13.913 3.89604 14.1901 5.61467 14.1901 7.33333ZM12.8568 7.33333C12.8568 5.83173 12.6258 4.30878 12.4421 3.33333H5.27083C5.08714 4.3088 4.8568 5.83183 4.85677 7.33333C4.85675 8.83484 5.08713 10.3579 5.27083 11.3333H12.4421C12.6258 10.3579 12.8568 8.83493 12.8568 7.33333Z" fill="#F2F2F2" />
                    </svg>
                    НИАД
                </Button>
            </nav>
        </Footer>
    )
}