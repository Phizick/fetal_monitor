import { MenuOutlined, UserAddOutlined } from "@ant-design/icons";
import { Button, Flex } from "antd"
import React, { useState } from "react";
import { ActiveMedModal } from "../ActiveMedModal/ActiveMedModal";
import { usePatientContext } from "../PatientContext/PatientContext";
import { SelectPatientModal } from "../SelectPatientModal/SelectPatientModal";
import styles from './header.module.css';

export const Header = ({ toggleShowMenu, children }: {
    toggleShowMenu: () => void,
    children: React.ReactNode
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const { patient } = usePatientContext()

    return (
        <Flex className={styles.header}>
            <Button
                className={`button ${styles.header_item} ${styles.borderRight}`}
                onClick={toggleShowMenu}>
                <MenuOutlined />
                Меню
            </Button>
            {patient ? (
                <Button
                    onClick={() => setIsPatientModalOpen(!isPatientModalOpen)}
                    className={`button active ${styles.header_item} ${styles.borderRight}`}
                    title={patient.full_name}>
                    <span style={{
                        maxWidth: 100,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'normal',
                    }}>
                        {patient.full_name}
                    </span>
                </Button>
            ) : (
                <Button onClick={() => setIsPatientModalOpen(!isPatientModalOpen)} className={`button ${styles.header_item} ${styles.borderRight}`}>
                    <UserAddOutlined />
                    Пациент
                </Button>
            )}
            <SelectPatientModal isModalOpen={isPatientModalOpen} setIsModalOpen={setIsPatientModalOpen} />
            {children}
            <Button onClick={() => setIsModalOpen(!isModalOpen)} className={`button ${styles.header_item} ${styles.borderLeft}`}>
                + Медикаменты
            </Button>
            <ActiveMedModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
        </Flex>
    )
}