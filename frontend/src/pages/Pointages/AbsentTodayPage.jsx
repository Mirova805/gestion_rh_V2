import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import api from '../../api/api.js';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const AbsentTodayPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifyAllLoading, setNotifyAllLoading] = useState(false);
  const [notifiedEmployees, setNotifiedEmployees] = useState(new Set());
  const [loadingEmployees, setLoadingEmployees] = useState(new Set());
  
  const today = moment().format('YYYY-MM-DD');

  const checkNotificationStatus = async (employee) => {
    try {
      const notificationCheckResponse = await api.get(`/notifications/check-absence-notification/${employee.NumEmp}/${today}`);
      return notificationCheckResponse.data.notified;
    } catch (checkError) {
      console.error(`Une erreur est survenue à la vérification du staut du notification de l'employé ${employee.NumEmp}:`, checkError);
      return false;
    }
  };

  const fetchNotificationStatuses = async (employees) => {
    const alreadyNotifiedSet = new Set();
    for (const emp of employees) {
      const isNotified = await checkNotificationStatus(emp);
      if (isNotified) {
        alreadyNotifiedSet.add(emp.NumEmp);
      }
    }
    setNotifiedEmployees(alreadyNotifiedSet);
  };

  const fetchAbsentEmployees = async () => {
    try {
      const response = await api.get(`/employees/absent?date=${today}`);
      const fetchedAbsentEmployees = response.data;
      if (JSON.stringify(fetchedAbsentEmployees) !== JSON.stringify(absentEmployees)) {
        setAbsentEmployees(fetchedAbsentEmployees);
      }
      await fetchNotificationStatuses(fetchedAbsentEmployees);
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données des employés non pointés:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue à la récupération des données des employés non pointés.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await fetchAbsentEmployees();
      }
    };

    fetchData();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAbsentEmployees();
      }
    }, 10000); 

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [today]);

  const handleNotifyAbsence = async (numEmp) => {
    if (notifiedEmployees.has(numEmp)) {
      toast.info(`L'employé ${numEmp} a déjà été notifié.`);
      return;
    }

    setLoadingEmployees(prev => new Set(prev).add(numEmp));
    try {
      const response = await api.post('/notifications/send-absent-emails', { 
        date: today, 
        numEmp: [numEmp] 
      });
      toast.success(response.data.message);
      setNotifiedEmployees(prev => new Set(prev).add(numEmp));
      const updatedEmployees = absentEmployees.filter(emp => emp.NumEmp === numEmp);
      if (updatedEmployees.length > 0) {
        await fetchNotificationStatuses(updatedEmployees);
      }
    } catch (error) {
      console.error('Une erreur est survenue lors de l\'envoi du notification:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue lors de l\'envoi du notification.');
    } finally {
      setLoadingEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(numEmp);
        return newSet;
      });
    }
  };

  const handleNotifyAllAbsences = async () => {
    if (absentEmployees.length === 0) {
      toast.info('Tous les employés ont pointés aujourd\'hui. Aucun email à envoyer.');
      return;
    }

    const employeesToNotify = absentEmployees.filter(emp => !notifiedEmployees.has(emp.NumEmp));
    
    if (employeesToNotify.length === 0) {
      toast.info('Tous les employés absents ont déjà été notifiés.');
      return;
    }

    const message = (employeesToNotify.length === 1) ? 'cet employé' : `ces ${employeesToNotify.length} employés`;

    confirmAlert({
      title: 'Confirmation',
      message: `Êtes-vous sûr de marqué ${message} comme absent ?`,
      buttons: [
        {
          label: <FontAwesomeIcon icon={faCheck} />,
          onClick: async () => {
            setNotifyAllLoading(true);
            try {
              const response = await api.post('/notifications/send-absent-emails', { 
                date: today,
                numEmp: employeesToNotify.map(emp => emp.NumEmp) 
              });
              toast.success(response.data.message);
              
              await fetchNotificationStatuses(absentEmployees);
            } catch (error) {
              console.error('Une erreur est survenue à l\'envoi des notifications:', error);
              toast.error(error.response?.data?.message || 'Une erreur est survenue à l\'envoi des notifications.');
            } finally {
              setNotifyAllLoading(false);
            }
          }
        },
        {
          label: <FontAwesomeIcon icon={faTimes} />,
          onClick: () => {}
        }
      ]
    });
  };

  if (!user || (!['admin', 'superuser'].includes(user.TitreUtil))) {
    navigate('/unauthorized'); 
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg"/>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
        Employés non pointés aujourd'hui ({moment().format('DD/MM/YYYY')})
      </h2>

      <div className="mb-24">
        {absentEmployees.length > 0 && absentEmployees.some(emp => !notifiedEmployees.has(emp.NumEmp)) && (
          <button
            type="button"  
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all duration-200"
            onClick={handleNotifyAllAbsences}
            disabled={notifyAllLoading}
          >
            {notifyAllLoading ? ( 
              <LoadingSpinner size="sm" inline /> 
            ) : (
              <>
                <FontAwesomeIcon icon={faEnvelope} className="mr-2"/> Notifier tous les absents
              </>
            )}
          </button>
        )}
      </div>

      {absentEmployees.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">Tous les employés attendus ont pointé aujourd'hui !</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6">Numéro</th>
                <th className="py-3 px-6">Nom</th>
                <th className="py-3 px-6">Prénom</th>
                <th className="py-3 px-6">Poste</th>
                <th className="py-3 px-6">Email</th>
                <th className="py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {absentEmployees.map((employee) => (
                <tr key={employee.NumEmp} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{employee.NumEmp}</td>
                  <td className="py-3 px-6 text-left">{employee.Nom}</td>
                  <td className="py-3 px-6 text-left">{employee.Prénom}</td>
                  <td className="py-3 px-6 text-left">{employee.Poste}</td>
                  <td className="py-3 px-6 text-left">{employee.Email}</td>
                  <td className="py-3 px-6 text-center">
                    <button
                      type="button"  
                      className={`bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded transition-all duration-200 ${notifiedEmployees.has(employee.NumEmp) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleNotifyAbsence(employee.NumEmp)}
                      disabled={notifyAllLoading || notifiedEmployees.has(employee.NumEmp) || loadingEmployees.has(employee.NumEmp)}
                    >
                      {loadingEmployees.has(employee.NumEmp) ? (
                        <LoadingSpinner size="sm" inline />
                      ) : notifiedEmployees.has(employee.NumEmp) ? (
                        "Notifié"
                      ) : (
                        "Notifier l'absence"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AbsentTodayPage;