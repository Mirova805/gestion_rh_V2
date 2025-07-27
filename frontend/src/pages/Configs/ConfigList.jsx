import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { faEdit, faTrashAlt, faPlus, faSort, faSortUp, faSortDown, faTimes, faSearch, faCheck } from '@fortawesome/free-solid-svg-icons';

const ConfigList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [configs, setConfigs] = useState([]);
  const prevConfigsRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

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

  const fetchConfigs = async () => {
    try {
      let response;
      if (filterStartDate && filterEndDate) {
        response = await api.get(`/config/by-date-range?startDate=${filterStartDate}&endDate=${filterEndDate}`);
      } else {
        response = await api.get('/config');
      }

      if (JSON.stringify(response.data) !== JSON.stringify(prevConfigsRef.current)) {
        setConfigs(response.data);
        prevConfigsRef.current = response.data; 
      }
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données de configuration:', error);
      toast.error('Une erreur est survenue à la récupération des données de configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    
    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await fetchConfigs();
      }
    };
    fetchData();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchConfigs();
      }
    }, 10000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [filterStartDate, filterEndDate]);


  const handleDelete = (configId) => {
    confirmAlert({
      title: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cet plan ?',
      buttons: [
        {
          label: <FontAwesomeIcon icon={faCheck} />,
          onClick: async () => {
            try {
              await api.delete(`/config/${configId}`);
              toast.success('Le plan a été supprimé avec succès.');
              fetchConfigs();
            } catch (error) {
              console.error('Une erreur est survenue lors de la suppression du donnée de configuration:', error);
              toast.error(error.response?.data?.message || 'Une erreur est survenue lors de la suppression du donnée de configuration.');
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

    const sortedConfigs = [...configs].sort((a, b) => {
      const aValue = typeof a[column] === 'string' ? a[column].toLowerCase() : a[column];
      const bValue = typeof b[column] === 'string' ? b[column].toLowerCase() : b[column];

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setConfigs(sortedConfigs);
  };

  const getSortIcon = (column) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? faSortUp : faSortDown;
    }
    return faSort;
  };

  if (!user || (!['admin', 'superuser'].includes(user.TitreUtil))) {
    navigate('/unauthorized'); return;
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
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Liste des configurations/plannings</h2>

      <div className="flex justify-between items-center mb-24">
        <Link to="/configurations/add" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 flex items-center">
          <FontAwesomeIcon icon={faPlus} /> 
        </Link>
        
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
      </div>

      {configs.length === 0 ? (
        <p className="text-center text-gray-600">Aucune configuration horaire trouvée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('ConfigID')}>
                  ID <FontAwesomeIcon icon={getSortIcon('ConfigID')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('Poste')}>
                  Poste <FontAwesomeIcon icon={getSortIcon('Poste')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NumEmp')}>
                  Employé (Num) <FontAwesomeIcon icon={getSortIcon('NumEmp')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('DateDebut')}>
                  Date Début <FontAwesomeIcon icon={getSortIcon('DateDebut')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('DateFin')}>
                  Date Fin <FontAwesomeIcon icon={getSortIcon('DateFin')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('HeureDebut')}>
                  Début de journée <FontAwesomeIcon icon={getSortIcon('HeureDebut')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('HeureFin')}>
                  Fin de journée <FontAwesomeIcon icon={getSortIcon('HeureFin')} />
                </th>
                <th className="py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {configs.map((cfg) => (
                <tr key={cfg.ConfigID} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-6 text-left">{cfg.ConfigID}</td>
                  <td className="py-3 px-6 text-left">{cfg.Poste || '-'}</td>
                  <td className="py-3 px-6 text-left">{cfg.NumEmp || '-'}</td>
                  <td className="py-3 px-6 text-left">{moment(cfg.DateDebut).format('DD/MM/YYYY')}</td>
                  <td className="py-3 px-6 text-left">{moment(cfg.DateFin).format('DD/MM/YYYY')}</td>
                  <td className="py-3 px-6 text-left">{cfg.HeureDebut}</td>
                  <td className="py-3 px-6 text-left">{cfg.HeureFin}</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center space-x-3">
                      <Link to={`/configurations/edit/${cfg.ConfigID}`} className="w-6 h-6 transform hover:text-blue-500 hover:scale-110 transition-transform duration-150">
                        <FontAwesomeIcon icon={faEdit} />
                      </Link>
                      <button onClick={() => handleDelete(cfg.ConfigID)} className="w-6 h-6 transform hover:text-red-500 hover:scale-110 transition-transform duration-150">
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    </div>
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

export default ConfigList;

