import '@ant-design/v5-patch-for-react-19';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux'
import { store } from './api/store'
import { App } from 'antd';
import { FooterMenu } from './components/Footer/Footer';
import { Header } from './components/Header/Header';
import { MainBlock } from './components/Main/MainBlock';
import { PatientStatus } from './components/PatientStatus/PatientStatus';
import { AppConfigProvider } from './components/AppConfigProvider/AppConfigProvider';
import { PatientContext } from './components/PatientContext/PatientContext';
import { PatientType } from './types';
import './App.css';

function MyApp() {
  const [showMenu, setShowMenu] = useState(false);
  const [patient, setPatient] = useState<PatientType | null>(null)
  const [isStarted, setIsStarted] = useState(false)
  const [hasPathology, setHasPathology] = useState(false)
  const toggleShowMenu = () => {
    setShowMenu(!showMenu)
  }

  useEffect(() => {
    if (!isStarted) {
      setHasPathology(false)
    }
  }, [isStarted])

  return (
    <Provider store={store}>
      <App>
        <div className="App">
          <AppConfigProvider>
            <PatientContext.Provider value={{ patient, setPatient }}>
              <Header toggleShowMenu={toggleShowMenu}>
                {isStarted ? <PatientStatus hasPathology={hasPathology} /> : <div></div>}
              </Header>
              <MainBlock
                setHasPathology={setHasPathology}
                isStarted={isStarted}
                showMenu={showMenu} />
              <FooterMenu isStarted={isStarted} setIsStarted={setIsStarted} />
            </PatientContext.Provider>
          </AppConfigProvider>
        </div>
      </App>
    </Provider>
  );
}

export default MyApp;
