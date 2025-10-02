import FetalMonitor from "../FetalMonitor/FetalMonitor";
import { SystemMenu } from "../SystemMenu/SystemMenu";
import styles from './mainBlock.module.css';

export const MainBlock = ({ setHasPathology, showMenu, isStarted }: {
    setHasPathology: (value: boolean) => void,
    showMenu: boolean,
    isStarted: boolean
}) => {
    return (
        <main className={styles.main}>
            {showMenu && <SystemMenu />}
            {isStarted && (
                <FetalMonitor
                    setHasPathology={setHasPathology}
                    apiUrl="http://77.246.158.103:8081/stream/sse"
                    windowSize={15}
                />
            )}
            {/* <Button className={`button ${styles.main_button}`}>
                Запустить мониторинг
            </Button> */}
        </main>
    )
}