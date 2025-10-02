import { ConfigProvider } from "antd"

export const AppConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const customTheme = {
        token: {
            colorPrimary: 'var(--background-default)',
            colorBgContainer: 'var(--background-default)',
            colorText: 'var(--text-default)',

        },
    };

    return (
        <ConfigProvider theme={customTheme}>
            {children}
        </ConfigProvider>
    )
}