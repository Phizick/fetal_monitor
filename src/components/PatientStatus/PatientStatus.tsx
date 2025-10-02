import { Space, Typography } from "antd"

export const PatientStatus = ({ hasPathology }: { hasPathology: boolean }) => {
    const getStatusParams = () => {
        if (hasPathology) {
            return (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8.00016 14.6668C4.31826 14.6668 1.3335 11.682 1.3335 8.00016C1.3335 4.31826 4.31826 1.3335 8.00016 1.3335C11.682 1.3335 14.6668 4.31826 14.6668 8.00016C14.6668 11.682 11.682 14.6668 8.00016 14.6668ZM7.3335 10.0002V11.3335H8.66683V10.0002H7.3335ZM7.3335 4.66683V8.66683H8.66683V4.66683H7.3335Z" fill="#0D0D0D" />
                    </svg>
                    <Typography.Text>
                        Патологическое состояние
                    </Typography.Text>
                </div>
            )
        }
        return (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M7.99967 14.6668C11.6815 14.6668 14.6663 11.682 14.6663 8.00016C14.6663 4.31826 11.6815 1.3335 7.99967 1.3335C4.31777 1.3335 1.33301 4.31826 1.33301 8.00016C1.33301 11.682 4.31777 14.6668 7.99967 14.6668ZM11.6377 6.3049L7.33301 10.6096L4.52827 7.8049L5.47108 6.8621L7.33301 8.72403L10.6949 5.36209L11.6377 6.3049Z" fill="#73FC8E" />
                </svg>
                <Typography.Text style={{ color: 'var(--text-default)' }}>
                    Состояние хорошее
                </Typography.Text>
            </div>
        )
    }
    return (
        <Space style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: 'inherit', backgroundColor: `${hasPathology ? 'var(--color-red-500)' : 'var(--background-default)'}` }}>
            {getStatusParams()}
        </Space>
    )
}