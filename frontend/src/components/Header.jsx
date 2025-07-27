import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api.js';
import moment from 'moment';
import { useAuth } from '../context/AuthContext.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faUserCircle, faUserClock } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
  const { user } = useAuth();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unpunchedEmployeesCount, setUnpunchedEmployeesCount] = useState(0);
  const today = moment().format('YYYY-MM-DD');

  useEffect(() => {
    const fetchHeaderData = async () => {
      if (user) {
        try {
          let response;
          if (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') {
            response = await api.get('/notifications');
            const filteredNotifications = response.data.filter(notif =>
              notif.TypeNotif === 'Demande de Congé' 
            );
            const unreadCount = filteredNotifications.filter(notif => notif.Statut === 'Non lu').length;
            setUnreadNotificationsCount(unreadCount);
          } else if (user.TitreUtil === 'user') {
            response = await api.get('/notifications/me');
            const unreadCount = response.data.filter(notif => 
              notif.Statut === 'Non lu' && notif.TypeNotif !== 'Demande de Congé'
            ).length;
            setUnreadNotificationsCount(unreadCount);
          } else {
            setUnreadNotificationsCount(0);
          }

          if (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') {
            const absentEmployeesResponse = await api.get(`/employees/absent?date=${today}`);
            const absentEmployees = absentEmployeesResponse.data;

            const notificationChecks = absentEmployees.map(async (emp) => {
              const notificationCheckResponse = await api.get(`/notifications/check-absence-notification/${emp.NumEmp}/${today}`);
              return notificationCheckResponse.data.notified;
            });

            const results = await Promise.all(notificationChecks);
            const notNotifiedCount = results.filter(notified => !notified).length;
            setUnpunchedEmployeesCount(notNotifiedCount);
          } else {
            setUnpunchedEmployeesCount(0);
          }

        } catch (error) {
          console.error('Une erreur est survenue lors de la récupération des données de l\'en-tête:', error);
        }
      }
    };

    fetchHeaderData();
    const interval = setInterval(fetchHeaderData, 5000);
    return () => clearInterval(interval);
  }, [user, today]);

  return (
    <header className="p-4 flex justify-between items-center fixed top-0 right-0 z-50">
      <div className="flex-grow"></div>
      <div className="flex items-center space-x-6">
        {user && (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') && (
          <div className="relative">
            <Link to="/pointages/absent-today" className="text-gray-600 hover:text-gray-800" title="Employés non pointés aujourd'hui">
              <FontAwesomeIcon icon={faUserClock} className="text-2xl" />
              {unpunchedEmployeesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {unpunchedEmployeesCount}
                </span>
              )}
            </Link>
          </div>
        )}

        {user && (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser' || user.TitreUtil === 'user') && (
          <div className="relative">
            <Link to="/notifications" className="text-gray-600 hover:text-gray-800">
              <FontAwesomeIcon icon={faBell} className="text-2xl" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faUserCircle} className="text-3xl text-gray-600" />
          <span className="text-xl font-semibold text-gray-800">{user ? user.NomUtil : 'Invité'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;