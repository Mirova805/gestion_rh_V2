import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import api from '../../api/api.js'; 
import moment from 'moment'; 
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 
import { faSort, faSortUp, faSortDown, faPlus, faEdit, faTrashAlt, faEye, faTimes, faUserCircle, faSearch, faCheck } from '@fortawesome/free-solid-svg-icons'; 
import numeral from 'numeral';
import 'numeral/locales/fr';
numeral.locale('fr');

const EmployeeList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState([]);
  const prevEmployeesRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchEmployees = async () => {
    try {
      let response;
      if (searchTerm.trim() === '') {
        response = await api.get('/employees');
      } else {
        response = await api.get(`/employees/search?query=${searchTerm}`);
      }

      if (JSON.stringify(response.data) !== JSON.stringify(prevEmployeesRef.current)) {
        setEmployees(response.data);
        prevEmployeesRef.current = response.data; 
      }
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données des employées:', error);
      toast.error('Une erreur est survenue à la récupération des données des employées.');
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }
  
  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {       
        await fetchEmployees();
      }
    };

    if (searchTerm.trim() !== '') {
      setSearchLoading(true);
    }

    const delayDebounceFn = setTimeout(fetchData, searchTerm.trim() === '' ? 0 : 500);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEmployees();
      }
    }, 10000);

    return () => {
      isActive = false;
      clearTimeout(delayDebounceFn);
      clearInterval(interval);
    };
  }, [searchTerm]);

  const handleDelete = (nom, prénom, numEmp) => {
    confirmAlert({
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer ${nom} ${prénom} (ID: ${numEmp}) des employés ?`,
      buttons: [
        {
          label: <FontAwesomeIcon icon={faCheck} />,
          onClick: async () => {
            try {
              await api.delete(`/employees/${numEmp}`);
              toast.success('L\'employé a été supprimé avec succès.');
              fetchEmployees(); 
            } catch (error) {
              console.error('Une erreur est survenue à la suppression des données de l\'employé:', error);
              toast.error(error.response?.data?.message || 'Une erreur est survenue à la suppression des données de l\'employé.');
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

    const sortedEmployees = [...employees].sort((a, b) => {
      if (a[column] < b[column]) return direction === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setEmployees(sortedEmployees);
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

  const getWorkingDaysString = (employee) => {
    const days = [];
    if (employee.TravailLundi) days.push('Lundi');
    if (employee.TravailMardi) days.push('Mardi');
    if (employee.TravailMercredi) days.push('Mercredi');
    if (employee.TravailJeudi) days.push('Jeudi');
    if (employee.TravailVendredi) days.push('Vendredi');
    if (employee.TravailSamedi) days.push('Samedi');
    if (employee.TravailDimanche) days.push('Dimanche');
    return days.join(', ') || 'Aucun';
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
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Liste des employés</h2>

      <div className="flex justify-between items-center mb-24">
        <Link to="/employees/add" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 flex items-center">
          <FontAwesomeIcon icon={faPlus} />
        </Link>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <label htmlFor="filterName" className="mr-2"><FontAwesomeIcon icon={faSearch} /></label>
            <input
              type="text"
              placeholder="Nom/prénom..."
              className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                title="Effacer la recherche"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {searchLoading ? (
        <div className="flex justify-center items-center">
          <LoadingSpinner size="md"/>
        </div>
      ) : employees.length === 0 ? (
        <p className="text-center text-gray-600">Aucun employé trouvé.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NumEmp')}>
                  Numéro <FontAwesomeIcon icon={getSortIcon('NumEmp')} />
                </th>
                <th className="py-3 px-6">Photo</th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('Nom')}>
                  Nom <FontAwesomeIcon icon={getSortIcon('Nom')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('Prénom')}>
                  Prénom <FontAwesomeIcon icon={getSortIcon('Prénom')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('Poste')}>
                  Poste <FontAwesomeIcon icon={getSortIcon('Poste')} />
                </th>
                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('SalaireMensuel')}>
                  Salaire <FontAwesomeIcon icon={getSortIcon('SalaireMensuel')} />
                </th>
                <th className="py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {employees.map((employee) => (
                <tr key={employee.NumEmp} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{employee.NumEmp}</td>
                  <td className="py-3 px-6 text-left">
                    {employee.PhotoID ? (
                      <img 
                        src={`${import.meta.env.VITE_BASE_URL}${employee.PhotoID}`} 
                        alt="Employee" 
                        className="w-10 h-10 rounded-full object-cover" 
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.parentElement.innerHTML = `<FontAwesomeIcon icon={faUserCircle} className="text-4xl text-gray-200" />`;
                        }}
                      />
                    ) : (
                      <FontAwesomeIcon icon={faUserCircle} className="text-4xl text-gray-200" />
                    )}
                  </td>
                  <td className="py-3 px-6 text-left">{employee.Nom}</td>
                  <td className="py-3 px-6 text-left">{employee.Prénom}</td>
                  <td className="py-3 px-6 text-left">{employee.Poste}</td>
                  <td className="py-3 px-6 text-left">{numeral(employee.SalaireMensuel).format('0,0')} Ar</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center space-x-3">
                      <Link to={`/employees/edit/${employee.NumEmp}`} className="w-6 h-6 transform hover:text-blue-500 hover:scale-110 transition-transform duration-150">
                        <FontAwesomeIcon icon={faEdit} />
                      </Link>
                      <button onClick={() => handleDelete(employee.Nom, employee.Prénom, employee.NumEmp)} className="w-6 h-6 transform hover:text-red-500 hover:scale-110 transition-transform duration-150">
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                      <button onClick={() => handleViewDetails(employee)} className="w-6 h-6 transform hover:text-green-500 hover:scale-110 transition-transform duration-150">
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
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Détails de l'employé</h3>
            <div className="space-y-2 max-h-full overflow-y-auto">
              {selectedItem.PhotoID && (
                <img src={`${import.meta.env.VITE_BASE_URL}${selectedItem.PhotoID}`} alt="Photo Employé" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
              )}
              <p><strong>Date d'embauche:</strong> {moment(selectedItem.DateEmbauche).format('DD/MM/YYYY')}</p>
              <p><strong>Numéro d'employé:</strong> {selectedItem.NumEmp}</p>
              <p><strong>Nom:</strong> {selectedItem.Nom}</p>
              <p><strong>Prénom:</strong> {selectedItem.Prénom}</p>
              <p><strong>Poste:</strong> {selectedItem.Poste}</p>
              <p><strong>Salaire mensuel:</strong> {numeral(selectedItem.SalaireMensuel).format('0,0')} Ar</p>
              <p><strong>Email:</strong> {selectedItem.Email}</p>
              <p><strong>Horaire de travail:</strong> {selectedItem.HeureDebutTravail} - {selectedItem.HeureFintravail}</p>
              <p><strong>Jours de travail:</strong> {getWorkingDaysString(selectedItem)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;