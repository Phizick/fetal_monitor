import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Active from './pages/Patients/Active/Active';
import Archive from './pages/Patients/Archive/Archive';
import Doctors from './pages/Personal/Doctors/Doctors';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import PatientCard from './pages/Patients/Card/PatientCard';
import PatientSessions from './pages/Patients/Sessions/PatientSessions';
import PatientSessionDetails from './pages/Patients/Sessions/PatientSessionDetails';
import ActiveSession from './pages/Patients/Sessions/ActiveSession';
import NotificationProvider from './components/NotificationProvider';
import './styles/global.scss';

function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <AntdApp>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/"
                element={<Navigate to="/patients/active" replace />}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients/active"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Active />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PatientCard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients/:id/session"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PatientSessions />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients/:id/session/:sessionId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PatientSessionDetails />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activeSession/:sessionId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ActiveSession />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients/archive"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Archive />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/personal/doctors"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Doctors />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </NotificationProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
