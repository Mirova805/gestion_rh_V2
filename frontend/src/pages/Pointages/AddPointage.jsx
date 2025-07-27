import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/api.js'; 
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'; 

const AddPointage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    numEmp: user?.NumEmp || '',
    pointageInfo: 'Pointage au travail',
  });
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const prevEmployeesRef = useRef([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lastPointageInfo, setLastPointageInfo] = useState(null);

  const fetchLastPointage = useCallback(async (numEmp) => {
    try {
      if (user && user.TitreUtil === 'user' && user.NumEmp) {
        const response = await api.get(`/pointages/employee/${user.NumEmp}/last`);
        return response.data ? response.data.PointageInfo : null;
      } else {
        const response = await api.get(`/pointages/employee/${numEmp}/last`);
        return response.data ? response.data.PointageInfo : null;
      }
    } catch (error) {
      console.error('Une erreur est survenue:', error);
      toast.error('Une erreur est survenue.');
      return null;
    }
  }, [user]);

  const fetchPointages = async () => {    
    if (user && (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser')) {
      try {
        const response = await api.get('/employees');
        if (JSON.stringify(response.data) !== JSON.stringify(prevEmployeesRef.current)) {
          setEmployees(response.data);
          prevEmployeesRef.current = response.data;
        }
      } catch (error) {
        console.error('Une erreur est survenue à la récupération des données des employées:', error);
        toast.error('Une erreur est survenue à la récupération des données des employées.');
      } finally {
        setLoading(false);
      } 
    }

    if (formData.numEmp) {
      try {
        const info = await fetchLastPointage(formData.numEmp);
        if (JSON.stringify(info) !== JSON.stringify(lastPointageInfo)) {
          setLastPointageInfo(info);
        }
      } catch (error) {
        console.error('Une erreur est survenue à la récupération des données de pointage:', error);
      } finally {
        setLoading(false);
      } 
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
  }, [user, formData.numEmp, fetchLastPointage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = async() => {
    const { numEmp, pointageInfo } = formData;
    if (!numEmp || !pointageInfo) {
      toast.warn('Veuillez remplir tous les champs obligatoires.');
      return false;
    }

    const lastPointageInfo = await fetchLastPointage(numEmp);
    const allowedTransitions = {
      'Pointage au travail': [null], 
      'Sorti': ['Pointage au travail', 'Retour de pause'],
      'Retour de pause': ['Sorti'],
      'Fin de la journée': ['Pointage au travail', 'Retour de pause'],
    };

    const validActions = Object.keys(allowedTransitions);
    const normalizedLastPointage = lastPointageInfo ?? null;

    const isInvalidWorkflow = 
      !validActions.includes(pointageInfo) ||
      !allowedTransitions[pointageInfo].includes(normalizedLastPointage);

    if (isInvalidWorkflow) {
      const lastPointageDisplay = lastPointageInfo || 'Aucun';
      let message;

      if (!lastPointageInfo) {
        message = 'Pointer d\'abord l\'arrivée au travail.';
      } else if (lastPointageInfo === 'Fin de la journée') {
        message = '"Fin de la journée" était le dernier pointage. Aucun ajout n\'est plus disponible pour aujourd\'hui.';
      } else {
        message = `Sélectionner une action valide. Le dernier pointage ajouté est: ${lastPointageDisplay}.`;
      }

      toast.warn(`Respectez le workflow: ${message}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (!isValid) return;

    setSubmitLoading(true);
    try {
      const payload = {
        numEmp: formData.numEmp,
        pointageInfo: formData.pointageInfo,
      };

      await api.post('/pointages', payload);
      toast.success('Le pointage a été ajouté avec succès !');
      navigate('/pointages');
    } catch (error) {
      console.error('Une erreur est survenue à l\'envoi de formulaire:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue à l\'envoi de formulaire.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getAvailablePointageOptions = useCallback(() => {
    switch (lastPointageInfo) {
      case 'Pointage au travail':
      case 'Retour de pause':
        return ['Sorti', 'Fin de la journée'];
      case 'Sorti':
        return ['Retour de pause'];
      case 'Fin de la journée':
        return []; 
      default:
        return ['Pointage au travail']; 
    }
  }, [lastPointageInfo]);

  const availableOptions = getAvailablePointageOptions();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg"/>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-12">Ajouter un pointage</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className='grid grid-cols-2'>
          {(user && (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser')) ? (
            <div>
              <label htmlFor="numEmp" className="block text-sm font-medium text-gray-700">Identité de l'employé: </label>
              <select
                id="numEmp"
                name="numEmp"
                value={formData.numEmp}
                onChange={handleChange}
                required
                className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Sélectionner un employé</option>
                {employees.map((emp) => (
                  <option key={emp.NumEmp} value={emp.NumEmp}>
                    {emp.NumEmp} - {emp.Nom} {emp.Prénom}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="numEmp" className="block text-sm font-medium text-gray-700">Numéro d'employé: </label>
              <input
                type="text"
                name="numEmp"
                id="numEmp"
                value={formData.numEmp}
                readOnly 
                className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 cursor-not-allowed sm:text-sm"
              />
            </div>
          )}

          <div>
            <label htmlFor="pointageInfo" className="block text-sm font-medium text-gray-700">Pointage: </label>
            <select
              name="pointageInfo"
              id="pointageInfo"
              value={formData.pointageInfo}
              onChange={handleChange}
              required
              className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={availableOptions.length === 0} 
            >
              {availableOptions.length === 0 && <option value="">Plus aucune option est disponible</option>}
              {availableOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))} 
            </select>
            {availableOptions.length === 0 && user?.TitreUtil === 'user' && (
              <p className="text-red-500 text-sm mt-1">Plus aucune option est disponible. Vérifiez le dernier pointage.</p>
            )}
          </div>
        </div>
        
        <div className="py-8 space-x-4 flex items-center">
          <button
            type="button"
            onClick={() => navigate('/pointages')}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-bold py-2 px-4 rounded transition-all duration-200"
          >
            <FontAwesomeIcon icon={faArrowLeft}/>
          </button>
          <button
            type="submit"  
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded transition-all duration-200"
            disabled={submitLoading}
          >
            {submitLoading ? ( <LoadingSpinner size='sm' inline/> ) : 'Enregister'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPointage;