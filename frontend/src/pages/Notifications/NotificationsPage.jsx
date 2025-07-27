import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import api from '../../api/api.js';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';

const NotificationsPage = () => {
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const prevNotificationsRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState(null);
  const [markAsReadLoading, setMarkAsReadLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [refuseLoading, setRefuseLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      let response;
      let filteredNotifications = [];

      if (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') {
        response = await api.get('/notifications');
        filteredNotifications = response.data.filter(notif =>
          notif.TypeNotif !== 'Changement Horaire' && notif.TypeNotif !== 'Statut Congé' && notif.TypeNotif !== 'Absence'
        );
      } else {
        response = await api.get('/notifications/me');
        filteredNotifications = response.data.filter(notif =>
          notif.TypeNotif !== 'Demande de Congé'
        );
      }
      if (JSON.stringify(filteredNotifications) !== JSON.stringify(prevNotificationsRef.current)) {
        setNotifications(filteredNotifications);
        prevNotificationsRef.current = filteredNotifications;
      }
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données de notifications:', error);
      toast.error('Une erreur est survenue à la récupération des données de notifications.');
    } finally { 
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await fetchNotifications();
      }
    };
    fetchData();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 10000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [user]);

  const handleUpdateCongeStatus = async (notifId, message, newStatus) => {
    const numCongeMatch = message.match(/ID Congé: (\d+)/);
    let numConge = null;
    
    if (numCongeMatch && numCongeMatch[1]) {
        numConge = parseInt(numCongeMatch[1]);
    } else {
        toast.error("L'ID congé prévu pour le profil employé est introuvable dans les notifications.");
        return;
    }
    
    confirmAlert({
      title: `Confirmer ${newStatus === 'Validé' ? 'la validation' : 'le refus'}`,
      message: `Êtes-vous sûr de vouloir ${newStatus === 'Validé' ? 'valider' : 'refuser'} cette demande de congé? Un email sera envoyé à l'employé.`,
      buttons: [
        {
          label: <FontAwesomeIcon icon={faCheck} />,
          onClick: async () => {
            if (newStatus === 'Validé') {
              setAcceptLoading(true);
            } else {
              setRefuseLoading(true);
            }
            
            try {
              const congeUpdateResponse = await api.put(`/conges/${numConge}/status`, { congeInfo: newStatus }); 

              await api.put(`/notifications/${notifId}`, {
                statut: 'Lu',
                updatedBy: user.NomUtil,
                updatedByRole: user.TitreUtil
              });

              toast.success(congeUpdateResponse.data.message); 
              if (congeUpdateResponse.data.emailSent) {
                toast.info("Un email de notification a été envoyé.");
              } else {
                toast.warn("L'email de notification n'a pas pu être envoyé.");
              }
              fetchNotifications(); 
            } catch (error) {
              console.error('Une erreur est survenue à la mise à jour du statut du congé:', error);
              toast.error(error.response?.data?.message || 'Une erreur est survenue à la mise à jour du statut du congé.');
            } finally {
              if (newStatus === 'Validé') {
                setAcceptLoading(false);
              } else {
                setRefuseLoading(false);
              }
            }
          },
        },
        {
          label: <FontAwesomeIcon icon={faTimes} />,
          onClick: () => {},
        },
      ],
    });
  };

  const handleMarkAsRead = async (notifId) => {
    setMarkAsReadLoading(true);
    try {
      await api.put(`/notifications/${notifId}`, { statut: 'Lu' });
      toast.success('La notification est marquée comme lue.');
      fetchNotifications();
    } catch (error) {
      console.error('Une erreur est survenue à la mise à jour du statut de notification:', error);
      toast.error('Une erreur est survenue à la mise à jour du statut de notification.');
    } finally {
      setMarkAsReadLoading(false);
    }
  };

  const handleViewEmployeeProfile = async (numEmp) => {
    setProfileLoading(true);
    try {
      const response = await api.get(`/notifications/employee-profile/${numEmp}`);
      setSelectedEmployeeProfile(response.data);
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données sur le profil de l\'employé:', error);
      toast.error('Une erreur est survenue à la récupération des données sur le profil de l\'employé.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setSelectedEmployeeProfile(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg"/>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {notifications.length === 0 ? (
        <p className="text-center text-gray-600">Aucune notification pour le moment.</p>
      ) : (
        <>
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Notifications</h2>
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div key={notif.NotifID} className={`p-4 rounded-lg shadow-sm border ${notif.Statut === 'Non lu' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} transition-all duration-200`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{notif.Titre}</h3>
                    <p className="text-gray-700 mt-1">{notif.Message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Reçu le: {moment(notif.DateNotif).format('DD/MM/YYYY HH:mm')}
                    </p>
                    {notif.UpdatedBy && (
                      <p className="text-sm text-gray-500 mt-1">
                        {notif.TypeNotif === 'Demande de Congé' ? 'Statut mis à jour' : 'Modifié'} par {notif.UpdatedBy} ({notif.UpdatedByRole}) le {moment(notif.UpdatedAt).format('DD/MM/YYYY HH:mm')}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${notif.Statut === 'Non lu' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                    {notif.Statut === 'Non lu' ? 'Non lu' : 'Lu'}
                  </span>
                </div>

                {notif.TypeNotif === 'Demande de Congé' && (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') && !notif.UpdatedBy && (
                  <div className="mt-4 flex space-x-3">
                    <button
                      type="button"
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-4 rounded transition-all duration-200"
                      onClick={() => { handleUpdateCongeStatus(notif.NotifID, notif.Message, 'Validé'); } }
                      disabled={acceptLoading || refuseLoading}
                    >
                      {acceptLoading ? (<LoadingSpinner size="sm" inline />) : 'Accepter'}
                    </button>
                    <button
                      type="button"
                      className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-4 rounded transition-all duration-200"
                      onClick={() => { handleUpdateCongeStatus(notif.NotifID, notif.Message, 'Refusé'); } }
                      disabled={acceptLoading || refuseLoading}
                    >
                      {refuseLoading ? (<LoadingSpinner size="sm" inline />) : 'Refuser'}
                    </button>
                    {notif.NumEmpCible && (
                      <button
                        type="button"
                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2 px-4 rounded transition-all duration-200"
                        onClick={() => { handleViewEmployeeProfile(notif.NumEmpCible); } }
                        disabled={profileLoading}
                      >
                        {profileLoading ? (<LoadingSpinner size="sm" inline />) : 'Voir profil'}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-4 flex space-x-3 justify-end">
                  {notif.Statut === 'Non lu' && (
                    <button
                      type="button"
                      className="bg-gray-400 hover:bg-gray-500 text-white text-sm font-bold py-2 px-4 rounded transition-all duration-200"
                      onClick={() => { handleMarkAsRead(notif.NotifID); } }
                      disabled={markAsReadLoading}
                    >
                      {markAsReadLoading ? (<LoadingSpinner size="sm" inline />) : 'Marquer comme lu'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedEmployeeProfile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full relative">
            <button
              onClick={handleCloseProfile}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Profil de l'employé</h3>
            <div className="space-y-2 max-h-full overflow-y-auto">
              {selectedEmployeeProfile.PhotoID && (
                <img src={`${import.meta.env.VITE_BASE_URL}${selectedEmployeeProfile.PhotoID}`} alt="Photo Employé" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
              )}
              <p><strong>Date d'embauche:</strong> {moment(selectedEmployeeProfile.DateEmbauche).format('DD/MM/YYYY')}</p>              
              <p><strong>Numéro employé:</strong> {selectedEmployeeProfile.NumEmp}</p>
              <p><strong>Nom:</strong> {selectedEmployeeProfile.Nom} {selectedEmployeeProfile.Prénom}</p>
              <p><strong>Poste:</strong> {selectedEmployeeProfile.Poste}</p><br />
              <p><strong>Performance de ces 2 derniers mois: </strong></p>
              <ul className="list-disc list-inside">
                <li>Total d'absences: {selectedEmployeeProfile.totalAbsences}</li>
                <li>Retards: {selectedEmployeeProfile.totalRetards}</li>
              </ul><br />
              
              {selectedEmployeeProfile.absencesList && selectedEmployeeProfile.absencesList.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold">Dates d'absences:</p>
                  <ul className="list-disc list-inside">
                    {selectedEmployeeProfile.absencesList.map((date, index) => (
                      <li key={index}>{date}</li>
                    ))}
                  </ul><br />
                </div>
              )}
              {selectedEmployeeProfile.retardsList && selectedEmployeeProfile.retardsList.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold">Retards repétés:</p>
                  <ul className="list-disc list-inside">
                    {selectedEmployeeProfile.retardsList.map((date, index) => (
                      <li key={index}>{date}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;