import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; 
import { toast } from 'react-toastify';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import 'flatpickr/dist/l10n/fr.js';
import api from '../../api/api.js';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 
import { faArrowLeft, faTimes } from '@fortawesome/free-solid-svg-icons'; 

const AddEditConge = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    numEmp: user?.NumEmp || '', 
    motif: '',
    debutConge: '',
    dateRetour: '',
    congeInfo: 'En attente',
  });
  const prevFormDataRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [employees, setEmployees] = useState([]); 
  const prevEmployeesRef = useRef([]);
  const [initialCongeInfo, setInitialCongeInfo] = useState('En attente');
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleDateChange = (selectedDates) => {
    if (selectedDates.length === 0) {
      setFormData(prev => ({
        ...prev,
        debutConge: '',
        dateRetour: ''
      }));
    } else if (selectedDates.length === 1) {
      const date = moment(selectedDates[0]).format('YYYY-MM-DD');
      setFormData(prev => ({
        ...prev,
        debutConge: date,
        dateRetour: date
      }));
    } else if (selectedDates.length === 2) {
      setFormData(prev => ({
        ...prev,
        debutConge: moment(selectedDates[0]).format('YYYY-MM-DD'),
        dateRetour: moment(selectedDates[1]).format('YYYY-MM-DD')
      }));
    }
  };

  const clearDates = () => {
    setFormData(prev => ({
      ...prev,
      debutConge: '',
      dateRetour: ''
    }));
  };

  const fetchConges = async () => {
    try {
      const response = await api.get(`/conges/${id}`);
      const newFormData = {
        numEmp: response.data.NumEmp || '',
        motif: response.data.Motif || '',
        debutConge: moment(response.data.DebutConge).format('YYYY-MM-DD'),
        dateRetour: moment(response.data.DateRetour).format('YYYY-MM-DD'),
        congeInfo: response.data.CongeInfo || 'En attente', 
      };
      
      if (JSON.stringify(newFormData) !== JSON.stringify(prevFormDataRef.current)) {
        setFormData(newFormData);
        prevFormDataRef.current = newFormData;
      }
      setInitialCongeInfo(response.data.CongeInfo);
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données de congé:', error);
      toast.error('Une erreur est survenue à la récupération des données de congé.');
      navigate('/conges');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (user && (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser')) {
      try {
        const response = await api.get('/employees');
        if (JSON.stringify(response.data) !== JSON.stringify(prevEmployeesRef.current)) {
          setEmployees(response.data);
          prevEmployeesRef.current = response.data;
        }
      } catch (error) {
        console.error('Une erreur est survenue à la récupération des données des employés:', error);
        toast.error('Une erreur est survenue à la récupération des données des employés.');
      } finally { 
        setLoading(false);
      }   
    } 
  };

  useEffect(() => {    
    let isActive = true;
    if (id) {
      setIsEditMode(true);

      const fetchData = async () => {
        if (isActive && document.visibilityState === 'visible') {
          await fetchConges();
          await fetchEmployees();
        }
      };
      fetchData();

      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchConges();
          fetchEmployees();
        }
      }, 10000);

      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }

    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await fetchEmployees();
      }
    };
    fetchData();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEmployees();
      }
    }, 10000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [id, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const { numEmp, motif, debutConge, dateRetour } = formData;
    const today = moment().format('YYYY-MM-DD');

    if (!numEmp || !motif || !debutConge || !dateRetour) {
      toast.warn('Veuillez remplir tous les champs obligatoires.');
      return false;
    }
    if (moment(dateRetour).isSameOrBefore(moment(debutConge))) {
      toast.warn('Veuillez sélectoinner une période valide.');
      return false;
    }

    if (moment(debutConge).isSameOrBefore(today) && !isEditMode)  {
      toast.warn('La date de début du congé ne doit strictement précéder aujourd\'hui.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitLoading(true);
    try {
      let payload = {
        numEmp: parseInt(formData.numEmp), 
        motif: formData.motif,
        debutConge: formData.debutConge,
        dateRetour: formData.dateRetour,
      };

      let response;
      if (isEditMode) {
        if (user.TitreUtil !== 'admin' && user.TitreUtil !== 'superuser') {
          delete payload.congeInfo; 
        } else if (formData.congeInfo === initialCongeInfo) {
          delete payload.congeInfo;
        } else {
          payload.congeInfo = formData.congeInfo;
        }
        response = await api.put(`/conges/${id}`, payload);
        toast.success(response.data.message);
      }
      else { 
        response = await api.post('/conges', payload);
        toast.success('La demande de congé a été soumise avec succès !');
      }

      if (response.data.emailSent !== undefined) {
        if (response.data.emailSent) {
          toast.info('Un email de notification a été envoyé.');
        } else {
          toast.warn('L\'email de notification n\'a pas pu être envoyé.');
        }
      }

      navigate('/conges');
    } catch (error) {
      console.error('Une erreur est survenue à l\'envoi du formulaire:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue à l\'envoi du formulaire.');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  const isStatusFieldDisabled = isEditMode && (initialCongeInfo === 'Validé' || initialCongeInfo === 'Refusé');
  const isOtherFieldsDisabled = isEditMode && (initialCongeInfo === 'Validé' || initialCongeInfo === 'Refusé');
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg"/>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-12">
        {isEditMode ? 'Modifier une demande de congé' : 'Demander un congé'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className='grid grid-cols-2'>
          {(user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') ? (
            <div>
              <label htmlFor="numEmp" className="block text-sm font-medium text-gray-700">Identité de l'employé: </label>
              <select
                id="numEmp"
                name="numEmp"
                value={formData.numEmp}
                onChange={handleChange}
                required
                disabled={isOtherFieldsDisabled}
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
            <label htmlFor="periodeConge" className="block text-sm font-medium text-gray-700">Période de congé: </label>
            <div className="relative">
              <Flatpickr
                id="periodeConge"
                options={{
                  mode: 'range',
                  dateFormat: 'd/m/Y',
                  locale: 'fr',
                  allowInput: true,
                  minDate: new Date(new Date().setHours(0, 0, 0, 0) + 86400000),
                  onClose: handleDateChange
                }}
                value={
                  formData.debutConge && formData.dateRetour 
                    ? [new Date(formData.debutConge), new Date(formData.dateRetour)] 
                    : []
                }
                placeholder="Sélectionner la période de congé"
                disabled={isOtherFieldsDisabled}
                className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {(formData.debutConge || formData.dateRetour) && !isOtherFieldsDisabled && (
                <button
                  type="button"
                  onClick={clearDates}
                  className="absolute right-[27%] top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  title="Effacer les dates"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
          </div>
        </div>
        

        <div className='w-1/2'>
          <label htmlFor="motif" className="block text-sm font-medium text-gray-700">Motif: </label>
          <textarea
            name="motif"
            id="motif"
            value={formData.motif}
            onChange={handleChange}
            required
            rows="3"
            disabled={isOtherFieldsDisabled}
            className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          ></textarea>
        </div>

        <div className="py-8 space-x-4 flex items-center">
          <button
            type="button"
            onClick={() => navigate('/conges')}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-bold py-2 px-4 rounded transition-all duration-200"
          >
            <FontAwesomeIcon icon={faArrowLeft}/>
          </button>
          <button
            type="submit"  
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded transition-all duration-200"
            disabled={submitLoading && isOtherFieldsDisabled && isStatusFieldDisabled}
          >
            {submitLoading ? ( <LoadingSpinner size='sm' inline/> ) : 'Enregister'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditConge;

