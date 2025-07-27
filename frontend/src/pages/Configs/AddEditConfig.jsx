import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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

const AddEditConfig = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const [formData, setFormData] = useState({
    configId: null,
    poste: '',
    numEmp: '',
    dateDebut: '',
    dateFin: '',
    heureDebut: '',
    heureFin: '',
    notifyTarget: 'none',
    selectedEmployees: [],
  });
  const prevFormDataRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [employees, setEmployees] = useState([]);
  const prevEmployeesRef = useRef([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleDateChange = (selectedDates) => {
    if (selectedDates.length === 0) {
      setFormData(prev => ({
        ...prev,
        dateDebut: '',
        dateFin: ''
      }));
    } else if (selectedDates.length === 1) {
      const date = moment(selectedDates[0]).format('YYYY-MM-DD');
      setFormData(prev => ({
        ...prev,
        dateDebut: date,
        dateFin: date
      }));
    } else if (selectedDates.length === 2) {
      setFormData(prev => ({
        ...prev,
        dateDebut: moment(selectedDates[0]).format('YYYY-MM-DD'),
        dateFin: moment(selectedDates[1]).format('YYYY-MM-DD')
      }));
    }
  };

  const clearDates = () => {
    setFormData(prev => ({
      ...prev,
      dateDebut: '',
      dateFin: ''
    }));
  };

  const fetchConfigs = async () => {
    try {
      const response = await api.get(`/config/${id}`);
      const newFormData = {
        configId: response.data.ConfigID,
        poste: response.data.Poste || '',
        numEmp: response.data.NumEmp || '',
        dateDebut: moment(response.data.DateDebut).format('YYYY-MM-DD'),
        dateFin: moment(response.data.DateFin).format('YYYY-MM-DD'),
        heureDebut: response.data.HeureDebut,
        heureFin: response.data.HeureFin,
        notifyTarget: 'none',
        selectedEmployees: [],
      };
      
      if (JSON.stringify(newFormData) !== JSON.stringify(prevFormDataRef.current)) {
        setFormData(newFormData);
        prevFormDataRef.current = newFormData;
      }
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données de configuration:', error);
      toast.error('Une erreur est survenue à la récupération des données de configuration.');
      navigate('/configurations');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      if (JSON.stringify(response.data) !== JSON.stringify(prevEmployeesRef.current)) {
        setEmployees(response.data);
        prevEmployeesRef.current = response.data;
      }
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données de l\'employée:', error);
      toast.error('Une erreur est survenue à la récupération des données de l\'employée.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const dateDebutParam = queryParams.get('dateDebut');
    const dateFinParam = queryParams.get('dateFin');

    if (dateDebutParam && dateFinParam) {
      setFormData(prev => ({
        ...prev,
        dateDebut: dateDebutParam,
        dateFin: dateFinParam,
      }));
    }

    let isActive = true;
    if (id) {
      setIsEditMode(true);

      const fetchData = async () => {
        if (isActive && document.visibilityState === 'visible') {
          await fetchConfigs();
          await fetchEmployees();
        }
      };
      fetchData();

      const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchConfigs();
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
  }, [id, user, navigate, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'heureDebut' || name === 'heureFin') {
      if (value && value.length === 5) {
        formattedValue = `${value}:00`;
      }
    }

    setFormData({
      ...formData,
      [name]: formattedValue,
    });
  };

  const handleEmployeeSelect = (e) => {
    const options = Array.from(e.target.selectedOptions).map(option => option.value);
    setFormData({ ...formData, selectedEmployees: options });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitLoading(true);
    try {
      if (!(formData.dateDebut || formData.dateFin) || !formData.heureDebut || !formData.heureFin) {
        toast.warn("Veuillez remplir les champs obligatoires.");
        return;
      }
      
      let finalPoste = formData.poste.trim() === '' ? null : formData.poste.trim();
      let finalNumEmp = formData.numEmp === '' ? null : parseInt(formData.numEmp);

      if (finalPoste && finalNumEmp) {
        toast.warn('Vous ne pouvez pas spécifier à la fois un poste et un employé.');
        setLoading(false);
        return;
      }

      if (formData.heureDebut >= formData.heureFin) {
        toast.warn("L'horaire de début de service doit strictement précéder l'heure de fin.");
        return;
      }
      
      const payload = {
        poste: finalPoste,
        numEmp: finalNumEmp,
        dateDebut: formData.dateDebut,
        dateFin: formData.dateFin,
        heureDebut: formData.heureDebut,
        heureFin: formData.heureFin,
        notifyTarget: formData.notifyTarget,
        selectedEmployees: formData.selectedEmployees,
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/config/${id}`, payload);
        toast.success('Les données de configuration ont été mise à jour avec succès !');
      } else {
        response = await api.post('/config', payload);
        toast.success('Le planning a été enregistré avec succès.');
      }

      if (response.data.emailsSent > 0) {
        toast.info(`${response.data.emailsSent} email(s) envoyé(s). ${response.data.emailsFailed} échecs.`);
      }

      navigate('/configurations');
    } catch (error) {
      console.error('Une erreur est survenue à l\'enregistrement de la configuration:', error);
      if (error.response && error.response.data && error.response.data.errors) {
        const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
        toast.error(`Une erreur est survenue lors de la validation: ${validationErrors}`);
      } else {
        toast.error(error.response?.data?.message || 'Une erreur est survenue à l\'enregistrement de la configuration.');
      }
    } finally {
      setSubmitLoading(false);
    }
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
      <h2 className="text-3xl font-bold text-gray-800 mb-12">
        {isEditMode ? 'Modifier un planning' : 'Ajouter un nouvel plan'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className='grid grid-cols-2'>
          <div>
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">Période: </label>
              <div className="relative">
                <Flatpickr
                  id="dateRange"
                  options={{
                    mode: 'range',
                    dateFormat: 'd/m/Y',
                    minDate: new Date(new Date().setHours(0, 0, 0, 0) + 86400000),
                    locale: 'fr',
                    allowInput: true,
                    onClose: handleDateChange
                  }}
                  value={
                    formData.dateDebut && formData.dateFin 
                      ? [new Date(formData.dateDebut), new Date(formData.dateFin)] 
                      : []
                  }
                  placeholder="Sélectionner une période"
                  className="mt-1 block w-3/4 mb-6 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {(formData.dateDebut || formData.dateFin) && (
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
            <div className='mb-6'>
              <label htmlFor="heureDebut" className="block text-sm font-medium text-gray-700">Shift planifié: </label>
              <div>
                <input type="time" name="heureDebut" id="heureDebut" value={formData.heureDebut} onChange={handleChange} required
                  className="mt-1 block border border-blue-50 rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm" />
                <p className='ml-8'>|</p>  
                <input type="time" name="heureFin" id="heureFin" value={formData.heureFin} onChange={handleChange} required
                  className="mt-1 block border border-blue-50 rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm" />
              </div>
            </div>   
            <div>
              <label htmlFor="poste" className="block text-sm font-medium text-gray-700">Poste ciblé (Optionnel): </label>
              <input type="text" name="poste" id="poste" value={formData.poste} onChange={handleChange}
                className="mt-1 block w-3/4 mb-6 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={!!formData.numEmp}
                placeholder="Exemples: Développeur, Comptable ..."
              />
            </div>
            <div>
              <label htmlFor="numEmp" className="block text-sm font-medium text-gray-700">Employé ciblé (Optionnel): </label>
              <select
                id="numEmp"
                name="numEmp"
                value={formData.numEmp}
                onChange={handleChange}
                className="mt-1 block w-3/4 mb-6 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={!!formData.poste}
              >
                <option value="">-- Choisir un employé --</option>
                {employees.map((emp) => (
                  <option key={emp.NumEmp} value={emp.NumEmp}>
                    {emp.NumEmp} - {emp.Nom} {emp.Prénom} ({emp.Poste})
                  </option>
                ))}
              </select>
            </div>       
          </div>
          <div>
            <div>
              <label htmlFor="notifyTarget" className="block text-sm font-medium text-gray-700">Notifier la configuration par email ?</label>
              <select
                name="notifyTarget"
                id="notifyTarget"
                value={formData.notifyTarget}
                onChange={handleChange}
                className="mt-1 block w-3/4 mb-6 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="none">Ne pas notifier</option>
                <option value="all">Tous les employés</option>
                <option value="poste">Par poste (basé sur le poste ci-dessus)</option>
                <option value="selected">Employés spécifiques</option>
              </select>
            </div>
            

            {formData.notifyTarget === 'selected' && (
              <div className="mt-4">
                <label htmlFor="selectedEmployees" className="block text-sm font-medium text-gray-700">Sélectionner les employés à notifier</label>
                <select
                  multiple
                  name="selectedEmployees"
                  id="selectedEmployees"
                  value={formData.selectedEmployees}
                  onChange={handleEmployeeSelect}
                  className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-64"
                >
                  {employees.map(emp => (
                    <option key={emp.NumEmp} value={emp.NumEmp } className='py-1.5'>
                      {emp.NumEmp} - {emp.Nom} {emp.Prénom} ({emp.Poste})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Maintenez Ctrl/Cmd pour sélectionner plusieurs.</p>
              </div>
            )}
          </div>
        </div>

        <div className="py-8 space-x-4 flex items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
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

export default AddEditConfig;