import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import 'flatpickr/dist/l10n/fr.js';
import api from '../../api/api.js'; 
import moment from 'moment';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 
import { faSort, faSortUp, faSortDown, faPlus, faTrashAlt, faEye, faTimes, faCalendarXmark, faCheck } from '@fortawesome/free-solid-svg-icons'; 

const PointageList = () => {
  const { user } = useAuth();

  const [pointages, setPointages] = useState([]);
  const prevPointagesRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [absenceDate, setAbsenceDate] = useState('');
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [showAbsentList, setShowAbsentList] = useState(false);
  const [absentLoading, setAbsentLoading] = useState(false);

  const handleAbsenceDateChange = (selectedDates) => {
    if (selectedDates.length === 0) {
      setAbsenceDate('');
    } else {
      setAbsenceDate(moment(selectedDates[0]).format('YYYY-MM-DD'));
    }
  };

  const clearAbsenceDate = () => {
    setAbsenceDate('');
  };

  const fetchPointages = async () => {
    try {      
      const response = await api.get('/pointages');

      if (JSON.stringify(response.data) !== JSON.stringify(prevPointagesRef.current)) {
        setPointages(response.data);
        prevPointagesRef.current = response.data;
      }
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données de pointage:', error);
      toast.error('Une erreur est survenue à la récupération des données de pointage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    
    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await fetchPointages();
      }
    };
    fetchData();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPointages();
      }
    }, 10000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  const handleDelete = (numPointage) => {
    confirmAlert({
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer ce pointage (ID: ${numPointage}) ?`,
      buttons: [
        {
          label: <FontAwesomeIcon icon={faCheck} />,
          onClick: async () => {
            try {
              await api.delete(`/pointages/${numPointage}`);
              toast.success('Le pointage a été supprimé avec succès.');
              fetchPointages(); 
            } catch (error) {
              console.error('Une erreur est survenue à la suppression des données de pointage:', error);
              toast.error(error.response?.data?.message || 'Une erreur est survenue à la suppression des données de pointage.');
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

  const handleSort = (column) => {
    const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(direction);

    const sortedPointages = [...pointages].sort((a, b) => {
      const aValue = typeof a[column] === 'string' ? a[column].toLowerCase() : a[column];
      const bValue = typeof b[column] === 'string' ? b[column].toLowerCase() : b[column];

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setPointages(sortedPointages);
  };

  const getSortIcon = (column) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? faSortUp : faSortDown;
    }
    return faSort;
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleShowAbsentEmployees = async () => {
    if (!absenceDate) {
      toast.warn('Veuillez sélectionner une date.');
      return;
    }
    if (moment(absenceDate).isSame(moment(), 'day')) {
      toast.warn('Pour les absents d\'aujourd\'hui, veuillez vérifier les \'listes de ce qui n\'ont pas encore pointé\'. La vérification d\'absence attendra demain');
      return;
    }
    if (moment(absenceDate).isAfter(moment(), 'day')) {
      toast.warn('Impossible de vérifier les absences pour une date future.');
      return;
    }

    setAbsentLoading(true);
    try {
      const response = await api.get(`/employees/absent?date=${absenceDate}`);
      setAbsentEmployees(response.data);
      setShowAbsentList(true);
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des listes des absents:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue à la récupération des listes des absents.');
    } finally {
      setAbsentLoading(false);
    }
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
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Liste des pointages</h2>

      <div className="flex justify-between items-center mb-24">
        <Link to="/pointages/add" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 flex items-center">
          <FontAwesomeIcon icon={faPlus} /> 
        </Link>
        {(user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') && (
          <div className="flex items-center space-x-4">
            <button
              type="button"  
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 flex items-center"
              onClick={handleShowAbsentEmployees}
              disabled={absentLoading}
            >
              {absentLoading ? ( 
                <LoadingSpinner size="sm" inline /> 
              ) : (
                <>
                  <FontAwesomeIcon icon={faCalendarXmark} className='mr-2'/> Absences
                </>
              )}
            </button>
            <div className="relative">
              <Flatpickr
                options={{
                  dateFormat: 'd/m/Y',
                  locale: 'fr',
                  allowInput: true,
                  maxDate: new Date(),
                  onClose: handleAbsenceDateChange
                }}
                value={absenceDate ? [new Date(absenceDate)] : []}
                placeholder="Sélectionner une date"
                className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-54"
              />
              {absenceDate && (
                <button
                  onClick={clearAbsenceDate}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  title="Effacer la date"
                >
                  <FontAwesomeIcon icon={faTimes} size="sm" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {pointages.length === 0 ? (
        <p className="text-center text-gray-600">Aucun pointage trouvé.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NumPointage')}>
                  ID Pointage <FontAwesomeIcon icon={getSortIcon('NumPointage')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NumEmp')}>
                  Num Emp <FontAwesomeIcon icon={getSortIcon('NumEmp')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('Nom')}>
                  Employé <FontAwesomeIcon icon={getSortIcon('Nom')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('DateHeurePointage')}>
                  Date & Heure Pointage <FontAwesomeIcon icon={getSortIcon('DateHeurePointage')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('PointageInfo')}>
                  Info Pointage <FontAwesomeIcon icon={getSortIcon('PointageInfo')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('HeureRetard')}>
                  Heure Retard <FontAwesomeIcon icon={getSortIcon('HeureRetard')} />
                </th>
                <th className="py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {pointages.map((pointage) => (
                <tr key={pointage.NumPointage} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{pointage.NumPointage}</td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">{pointage.NumEmp}</td>
                  <td className="py-3 px-6 text-left">{pointage.Nom} {pointage.Prénom}</td>
                  <td className="py-3 px-6 text-left">{moment(pointage.DateHeurePointage).format('DD/MM/YYYY HH:mm:ss')}</td>
                  <td className="py-3 px-6 text-left">{pointage.PointageInfo}</td>
                  <td className="py-3 px-6 text-left">{pointage.HeureRetard || '-'}</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center space-x-3">
                      {(user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') && (
                        <button onClick={() => handleDelete(pointage.NumPointage)} className="w-6 h-6 transform hover:text-red-500 hover:scale-110 transition-transform duration-150">
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      )}
                      <button onClick={() => handleViewDetails(pointage)} className="w-6 h-6 transform hover:text-green-500 hover:scale-110 transition-transform duration-150">
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Détails du pointage</h3>
            <div className="space-y-2 max-h-full overflow-y-auto">
              <p><strong>Numéro pointage:</strong> {selectedItem.NumPointage}</p>
              <p><strong>Numéro d'employé:</strong> {selectedItem.NumEmp}</p>
              <p><strong>Nom:</strong> {selectedItem.Nom} {selectedItem.Prénom}</p>
              <p><strong>Date et heure de pointage:</strong> {moment(selectedItem.DateHeurePointage).format('DD/MM/YYYY HH:mm:ss')}</p>
              <p><strong>Information du pointage:</strong> {selectedItem.PointageInfo}</p>
              <p><strong>Retard:</strong> {selectedItem.HeureRetard || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {showAbsentList && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-3/5 relative">
            <button
              onClick={() => setShowAbsentList(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-16">Employés Absents le {moment(absenceDate).format('DD/MM/YYYY')}</h3>
            {absentEmployees.length === 0 ? (
              <p>Aucun employé absent pour cette date.</p>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-2 px-4">Num Emp</th>
                      <th className="py-2 px-4">Nom</th>
                      <th className="py-2 px-4">Prénom</th>
                      <th className="py-2 px-4">Poste</th>
                      <th className="py-2 px-4">Email</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm font-light">
                    {absentEmployees.map((emp, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-4">{emp.NumEmp}</td>
                        <td className="py-2 px-4">{emp.Nom}</td>
                        <td className="py-2 px-4">{emp.Prénom}</td>
                        <td className="py-2 px-4">{emp.Poste}</td>
                        <td className="py-2 px-4">{emp.Email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PointageList;

