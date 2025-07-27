import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoutes.jsx';
import Layout from './components/Layout.jsx';
import Unauthorized from './pages/Unauthorized/Unauthorized.jsx';  
import LoadingSpinner from './components/LoadingSpinner.jsx';

import LoginPage from './pages/Users/LoginPage.jsx';
import Register from './pages/Users/Register.jsx';
import UserList from './pages/Users/UserList.jsx';
import HomePage from './pages/Home/HomePage.jsx';
import Calendar from './pages/Calendar/Calendar.jsx';
import ConfigList from './pages/Configs/ConfigList.jsx';
import AddEditConfig from './pages/Configs/AddEditConfig.jsx';
import EmployeeList from './pages/Employees/EmployeeList.jsx';
import AddEditEmployee from './pages/Employees/AddEditEmployee.jsx';
import PointageList from './pages/Pointages/PointageList.jsx';
import AddPointage from './pages/Pointages/AddPointage.jsx';
import NotificationsPage from './pages/Notifications/NotificationsPage.jsx';
import AbsentTodayPage from './pages/Pointages/AbsentTodayPage.jsx';
import CongeList from './pages/Conges/CongeList.jsx';
import AddEditConge from './pages/Conges/AddEditConge.jsx';
import StatisticsPage from './pages/Statistics/StatisticsPage.jsx';
import PayslipGen from './pages/Payslip/PayslipGen.jsx';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg"/>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/calendar" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} /> 

        <Route path="/register" element={<PrivateRoute roles={['admin', 'superuser']}><Register /></PrivateRoute>} />

        <Route element={<Layout />}>
          <Route path="/users" element={<PrivateRoute roles={['admin']}><UserList /></PrivateRoute>} />
          <Route path="/home" element={<PrivateRoute roles={['superuser', 'admin']}><HomePage /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute roles={['user', 'superuser', 'admin']}><Calendar /></PrivateRoute>} />
          <Route path="/configurations" element={<PrivateRoute roles={['superuser', 'admin']}><ConfigList /></PrivateRoute>} />
          <Route path="/configurations/add" element={<PrivateRoute roles={['superuser', 'admin']}><AddEditConfig /></PrivateRoute>} />
          <Route path="/configurations/edit/:id" element={<PrivateRoute roles={['superuser', 'admin']}><AddEditConfig /></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute roles={['superuser', 'admin']}><EmployeeList /></PrivateRoute>} />
          <Route path="/employees/add" element={<PrivateRoute roles={['superuser', 'admin']}><AddEditEmployee /></PrivateRoute>} />
          <Route path="/employees/edit/:id" element={<PrivateRoute roles={['superuser', 'admin']}><AddEditEmployee /></PrivateRoute>} />
          <Route path="/pointages" element={<PrivateRoute roles={['user', 'superuser', 'admin']}><PointageList /></PrivateRoute>} />
          <Route path="/pointages/add" element={<PrivateRoute roles={['user', 'superuser', 'admin']}><AddPointage /></PrivateRoute>} />
          <Route path="/pointages/absent-today" element={<PrivateRoute roles={['superuser', 'admin']}><AbsentTodayPage /></PrivateRoute>} />
          <Route path="/conges" element={<PrivateRoute roles={['user', 'superuser', 'admin']}><CongeList /></PrivateRoute>} />
          <Route path="/conges/add" element={<PrivateRoute roles={['user', 'superuser', 'admin']}><AddEditConge /></PrivateRoute>} />
          <Route path="/conges/edit/:id" element={<PrivateRoute roles={['user', 'superuser', 'admin']}><AddEditConge /></PrivateRoute>} /> 
          <Route path="/statistics" element={<PrivateRoute roles={['superuser', 'admin']}><StatisticsPage /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute roles={['user', 'superuser', 'admin']}><NotificationsPage /></PrivateRoute>} /> 
          <Route path="/payslip" element={<PrivateRoute roles={['admin', 'superuser']}><PayslipGen /></PrivateRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
