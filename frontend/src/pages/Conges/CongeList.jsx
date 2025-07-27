import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import 'flatpickr/dist/l10n/fr.js';
import api from '../../api/api.js'; 
import moment from 'moment';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 
import { faTimes, faSort, faSortUp, faSortDown, faPlus, faEdit, faEye, faCalendarCheck, faSearch } from '@fortawesome/free-solid-svg-icons'; 

const CongeList = () => {
  const { user } = useAuth();
  
  const [conges, setConges] = useState([]);
  const prevCongesRef = useRef([]); 
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [remainingLeaveDays, setRemainingLeaveDays] = useState([]);
  const [showRemainingLeaveModal, setShowRemainingLeaveModal] = useState(false);
  const [selectedYearForLeave, setSelectedYearForLeave] = useState(moment().year());

  const handleFilterDateChange = (selectedDates) => {
    if (selectedDates.length === 0) {
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (selectedDates.length === 1) {
      const date = moment(selectedDates[0]).format('YYYY-MM-DD');
      setFilterStartDate(date);
      setFilterEndDate(date);
    } else if (selectedDates.length === 2) {
      setFilterStartDate(moment(selectedDates[0]).format('YYYY-MM-DD'));
      setFilterEndDate(moment(selectedDates[1]).format('YYYY-MM-DD'));
    }
  };

  const clearFilterDates = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const fetchConges = async () => {
    try {
      let response;
      if (filterStartDate && filterEndDate) {
        response = await api.get(`/conges/by-date-range?startDate=${filterStartDate}&endDate=${filterEndDate}`);
      } else {
        response = await api.get('/conges');
      }

      if (JSON.stringify(response.data) !== JSON.stringify(prevCongesRef.current)) {
        setConges(response.data);
        prevCongesRef.current = response.data;
      }
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données de congés:', error);
      toast.error('Une erreur est survenue à la récupération des données de congés.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    
    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await fetchConges();
      }
    };

    fetchData();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchConges();
      }
    }, 10000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [filterStartDate, filterEndDate]);

  const handleSort = (column) => {
    const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(direction);

    const sortedConges = [...conges].sort((a, b) => { 
      const aValue = typeof a[column] === 'string' ? a[column].toLowerCase() : a[column];
      const bValue = typeof b[column] === 'string' ? b[column].toLowerCase() : b[column];

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setConges(sortedConges); 
  };

  const getSortIcon = (column) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? faSortUp : faSortDown;
    }
    return faSort;
  };

  const filteredConges = conges;

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const fetchRemainingLeaveDays = async () => {
    setLoading(true);
    try {
      const employeesResponse = await api.get('/employees');
      const employeesData = employeesResponse.data;
      
      const remainingDaysPromises = employeesData.map(async (emp) => {
        const response = await api.get(`/conges/remaining-days/${emp.NumEmp}?year=${selectedYearForLeave}`);
        return {
          NumEmp: emp.NumEmp,
          Nom: emp.Nom,
          Prénom: emp.Prénom,
          Poste: emp.Poste,
          TotalTaken: response.data.totalTaken,
          Remaining: response.data.remaining,
        };
      });
      const results = await Promise.all(remainingDaysPromises);
      setRemainingLeaveDays(results);
      setShowRemainingLeaveModal(true);
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données des congés restant:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue à la récupération des données des congés restant.');
    } finally {
      setLoading(false);
    }
  };

  const yearsOptions = Array.from({ length: 5 }, (_, i) => moment().year() - i); 

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg"/>
      </div>
    );
  }

  const style = user.TitreUtil === 'user' ? 'mb-[72.5px]' : ''; 

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Liste des demandes de congé</h2>

      <div className="flex justify-between items-center mb-6">
        <Link to="/conges/add" className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 flex items-center ${style}`}>
          <FontAwesomeIcon icon={faPlus} />
        </Link>
        {(user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <label htmlFor="filterDate" className="mr-2"><FontAwesomeIcon icon={faSearch} /></label>
              <div className="relative">
                <Flatpickr
                  id="filterDate"
                  options={{
                    mode: 'range',
                    dateFormat: 'd/m/Y',
                    locale: 'fr',
                    allowInput: true,
                    onClose: handleFilterDateChange
                  }}
                  value={
                    filterStartDate && filterEndDate 
                      ? [new Date(filterStartDate), new Date(filterEndDate)] 
                      : []
                  }
                  placeholder="Sélectionner une période"
                  className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-64"
                />
                {filterStartDate && (
                  <button
                    onClick={clearFilterDates}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="Effacer le filtre"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
        {(user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') && (
          <div className="flex items-center justify-end space-x-2 mb-24">
            <button
              type="button"  
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 flex items-center"
              onClick={fetchRemainingLeaveDays}
              disabled={loading}
            >
              {loading ? ( 
                <LoadingSpinner size="sm" inline /> 
              ) : (
                <>
                  <FontAwesomeIcon icon={faCalendarCheck} className="mr-2" /> Jours de congé restants
                </>
              )}
            </button>
            <label htmlFor="selectedYearForLeave" className="text-sm font-medium text-gray-700"> - Année:</label>
            <select
              id="selectedYearForLeave"
              value={selectedYearForLeave}
              onChange={(e) => setSelectedYearForLeave(parseInt(e.target.value))}
              className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {yearsOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}
  

      {filteredConges.length === 0 ? (
        <p className="text-center text-gray-600">Aucune demande de congé trouvée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NumConge')}>
                  Num Congé <FontAwesomeIcon icon={getSortIcon('NumConge')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NumEmp')}>
                  Num Emp <FontAwesomeIcon icon={getSortIcon('NumEmp')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('DateDemande')}>
                  Date Demande <FontAwesomeIcon icon={getSortIcon('DateDemande')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('DebutConge')}>
                  Début Congé <FontAwesomeIcon icon={getSortIcon('DebutConge')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('DateRetour')}>
                  Date Retour <FontAwesomeIcon icon={getSortIcon('DateRetour')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('CongeInfo')}>
                  Statut <FontAwesomeIcon icon={getSortIcon('CongeInfo')} />
                </th>
                <th className="py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {filteredConges.map((conge) => (
                <tr key={conge.NumConge} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{conge.NumConge}</td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">{conge.NumEmp}</td>
                  <td className="py-3 px-6 text-left">{moment(conge.DateDemande).format('DD/MM/YYYY HH:mm:ss')}</td>
                  <td className="py-3 px-6 text-left">{moment(conge.DebutConge).format('DD/MM/YYYY')}</td>
                  <td className="py-3 px-6 text-left">{moment(conge.DateRetour).format('DD/MM/YYYY')}</td>
                  <td className="py-3 px-6 text-left">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      conge.CongeInfo === 'En attente' ? 'bg-yellow-200 text-yellow-800' :
                      conge.CongeInfo === 'Validé' ? 'bg-green-200 text-green-800' :
                      conge.CongeInfo === 'Refusé' ? 'bg-red-200 text-red-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {conge.CongeInfo}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center space-x-3">
                      {(conge.CongeInfo === 'En attente') && (
                        <Link to={`/conges/edit/${conge.NumConge}`} className="w-6 h-6 transform hover:text-blue-500 hover:scale-110 transition-transform duration-150">
                          <FontAwesomeIcon icon={faEdit} />
                        </Link>
                      )}                     
                      <button onClick={() => handleViewDetails(conge)} className="w-6 h-6 transform hover:text-green-500 hover:scale-110 transition-transform duration-150">
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
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Détails du congé</h3>
            <div className="space-y-2 max-h-full overflow-y-auto">
              <p><strong>Numéro congé:</strong> {selectedItem.NumConge}</p>
              <p><strong>Numéro employé:</strong> {selectedItem.NumEmp}</p>
              <p><strong>Nom:</strong> {selectedItem.Nom} {selectedItem.Prénom}</p>
              <p><strong>Motif:</strong> {selectedItem.Motif}</p>
              <p><strong>Nombre de jours:</strong> {selectedItem.Nbrjr}</p>
              <p><strong>Date de demande:</strong> {moment(selectedItem.DateDemande).format('DD/MM/YYYY HH:mm:ss')}</p>
              <p><strong>Début du congé:</strong> {moment(selectedItem.DebutConge).format('DD/MM/YYYY')}</p>
              <p><strong>Date du retour:</strong> {moment(selectedItem.DateRetour).format('DD/MM/YYYY')}</p>
              <p><strong>Statut:</strong> {selectedItem.CongeInfo}</p>
            </div>
          </div>
        </div>
      )}

      {showRemainingLeaveModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-3/5 relative">
            <button
              onClick={() => setShowRemainingLeaveModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-16">Jours de Congé Restants ({selectedYearForLeave})</h3>
            {remainingLeaveDays.length === 0 ? (
              <p>Aucune donnée disponible pour les jours de congé restants.</p>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-2 px-4">Num Emp</th>
                      <th className="py-2 px-4">Nom</th>
                      <th className="py-2 px-4">Prénom</th>
                      <th className="py-2 px-4">Poste</th>
                      <th className="py-2 px-4">Jours Pris</th>
                      <th className="py-2 px-4">Jours Restants</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm font-light">
                    {remainingLeaveDays.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-4">{item.NumEmp}</td>
                        <td className="py-2 px-4">{item.Nom}</td>
                        <td className="py-2 px-4">{item.Prénom}</td>
                        <td className="py-2 px-4">{item.Poste}</td>
                        <td className="py-2 px-4">{item.TotalTaken}</td>
                        <td className="py-2 px-4">{item.Remaining}</td>
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

export default CongeList;

