import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'; 
import numeral from 'numeral';
import 'numeral/locales/fr';
numeral.locale('fr');

const AddEditEmployee = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    photoId: '',
    nom: '',
    prenom: '',
    poste: '',
    salaireMensuel: '',
    email: '',
    heureDebutTravail: '08:00:00',
    heureFinTravail: '17:00:00',
    travailLundi: true,
    travailMardi: true,
    travailMercredi: true,
    travailJeudi: true,
    travailVendredi: true,
    travailSamedi: false,
    travailDimanche: false,
  });
  const prevFormDataRef = useRef({});
  const salaireInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const imageFileRef = useRef(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchEmployees = async () => {
    try {
      const response = await api.get(`/employees/${id}`);
      const newFormData = {
        photoId: response.data.PhotoID || '',
        nom: response.data.Nom || '',
        prenom: response.data.Prénom || '',
        poste: response.data.Poste || '',
        salaireMensuel: response.data.SalaireMensuel || 0,
        email: response.data.Email || '',
        heureDebutTravail: response.data.HeureDebutTravail || '08:00:00',
        heureFinTravail: response.data.HeureFintravail || '17:00:00',
        travailLundi: response.data.TravailLundi === 1,
        travailMardi: response.data.TravailMardi === 1,
        travailMercredi: response.data.TravailMercredi === 1,
        travailJeudi: response.data.TravailJeudi === 1,
        travailVendredi: response.data.TravailVendredi === 1,
        travailSamedi: response.data.TravailSamedi === 1,
        travailDimanche: response.data.TravailDimanche === 1,
      };

      if (JSON.stringify(newFormData) !== JSON.stringify(prevFormDataRef.current)) {
        setFormData(newFormData);
        prevFormDataRef.current = newFormData;
      }
      if (!imageFileRef.current && response.data.PhotoID && response.data.PhotoID !== formData.photoId) {
        setImagePreview(`${import.meta.env.VITE_BASE_URL}${response.data.PhotoID}`);
      }
      
    } catch (error) {
      console.error('Une erreur est survenue à la récupération des données de l\'employée:', error);
      toast.error('Une erreur est survenue à la récupération des données de l\'employée.');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    if (id) {
      setIsEditMode(true);
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
    }
    setIsEditMode(false);
    setLoading(false);
  }, [id, user, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        toast.warn('Veuillez sélectionner un fichier d\'image valide.');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        toast.warn('La taille de l\'image ne doit pas dépasser les 2MB.');
        return;
      }

      setImageFile(file);
      imageFileRef.current = true;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setFormData({ ...formData, photoId: '' });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let formattedValue = value;
    
    if ((name === 'heureDebutTravail' || name === 'heureFinTravail') && value) {
      formattedValue = value.includes(':') 
        ? value.split(':').length === 2 
          ? `${value}:00` 
          : value 
        : `${value}:00:00`;
    } else if (name === 'salaireMensuel') {
      const input = salaireInputRef.current;
      const rawValue = value.charAt(0) !== '0' ? value : value.slice(1);
      const cursorPos = input.selectionStart;
      const numericOnly = rawValue.replace(/\D/g, '');
      const formatted = numeral(numericOnly).format('0,0');
      const digitsBeforeCursor = rawValue.slice(0, cursorPos).replace(/\D/g, '').length;

      let newCursorPos = 0;
      let digitCount = 0;

      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
        }
        if (digitCount >= digitsBeforeCursor) {
          newCursorPos = i + 1;
          break;
        }
      }

      setFormData({
        ...formData,
        [name]: numericOnly
      });

      setTimeout(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : formattedValue,
    });
  };

  const validateForm = () => {
    const { nom, prenom, poste, salaireMensuel, email, heureDebutTravail, heureFinTravail, 
    travailLundi, travailMardi, travailMercredi, travailJeudi, travailVendredi, travailSamedi, travailDimanche } = formData;

    if (!nom || !prenom || !poste || salaireMensuel === null || !email || !heureDebutTravail || !heureFinTravail) {
      toast.warn('Veuillez remplir tous les champs obligatoires.');
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(nom)) {
      toast.warn('Le nom ne doit contenir de chiffre ni de caractère spécial.');
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(prenom)) {
      toast.warn('Le prénom ne doit contenir de chiffre ni de caractère spécial.');
      return false;
    }
    const formattedSalaire = parseInt(String(salaireMensuel).replace(/\D/g, '')) || 0;
    if (isNaN(formattedSalaire) || formattedSalaire < 0) {
      toast.warn('Le salaire mensuel doit être un nombre positif.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warn('Le format de l\'email est invalide.');
      return false;
    }
    if (heureDebutTravail && heureFinTravail && heureDebutTravail >= heureFinTravail) {
      toast.warn("L'horaire de début de service doit strictement précéder l'heure de fin.");
      return false;
    }
    if (!(travailLundi || travailMardi || travailMercredi || travailJeudi || travailVendredi || travailSamedi || travailDimanche)) {
      toast.warn("Veuillez définir les jours de travail de l'employé.");
      return false;
    }

    return { isValid: true, salaireMensuel: formattedSalaire };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateForm();
    if (!validation.isValid) return;

    setSubmitLoading(true);
    try {
      let photoUrl = formData.photoId;
      if (imageFile) {
        const formData = new FormData();
        formData.append('photo', imageFile);
        
        const uploadResponse = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        photoUrl = uploadResponse.data.filePath;
      }

      const payload = {
        photoId: photoUrl,
        nom: formData.nom,
        prenom: formData.prenom,
        poste: formData.poste,
        salaireMensuel: validation.salaireMensuel,
        email: formData.email,
        heureDebutTravail: formData.heureDebutTravail,
        heureFinTravail: formData.heureFinTravail,
        travailLundi: formData.travailLundi,
        travailMardi: formData.travailMardi,
        travailMercredi: formData.travailMercredi,
        travailJeudi: formData.travailJeudi,
        travailVendredi: formData.travailVendredi,
        travailSamedi: formData.travailSamedi,
        travailDimanche: formData.travailDimanche,
      };

      if (isEditMode) {
        await api.put(`/employees/${id}`, payload);
        toast.success('Les données de l\'employée ont été mis à jour avec succès !');
      } else {
        await api.post('/employees', payload);
        toast.success('L\'employé a été ajouté avec succès !');
      }
      navigate('/employees');
    } catch (error) {
      console.error('Une erreur est survenue à l\'enregistrement de l\'employé:', error);
      if (error.response && error.response.data && error.response.data.errors) {
        const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
        toast.error(`Une erreur est survenue à la validation des données: ${validationErrors}`);
      } else {
        toast.error(error.response?.data?.message || 'Une erreur est survenue à l\'enregistrement de l\'employé.');
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
        {isEditMode ? 'Modifier les données d\'un employé' : 'Ajouter un nouvel employé'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className='mb-12'>
          <label htmlFor="photoUpload" className="block text-sm font-medium text-gray-700">Photo d'identité: </label>
          <div className="mt-1 flex items-center">
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Employee preview" className="w-16 h-16 rounded-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <label htmlFor="photoUpload" className="ml-4 cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {imagePreview ? 'Changer la photo' : 'Ajouter une photo'}
              <input
                id="photoUpload"
                name="photoUpload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2">
            <div>
              <div>
                <label htmlFor="nom" className="block text-sm font-medium text-gray-700">Nom: </label>
                <input type="text" name="nom" id="nom" value={formData.nom} onChange={handleChange} required
                  className="mt-1 block w-3/4 mb-6 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="prenom" className="block text-sm font-medium text-gray-700">Prénom: </label>
                <input type="text" name="prenom" id="prenom" value={formData.prenom} onChange={handleChange} required
                  className="mt-1 block w-3/4 mb-6 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="poste" className="block text-sm font-medium text-gray-700">Poste: </label>
                <input type="text" name="poste" id="poste" value={formData.poste} onChange={handleChange} required
                  className="mt-1 block w-3/4 mb-6 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="salaireMensuel" className="block text-sm font-medium text-gray-700">Salaire mensuel:</label>
                
                <div className="relative w-3/4 mb-6 mt-1">
                  <input type="text" name="salaireMensuel" id="salaireMensuel" value={formData.salaireMensuel ? numeral(formData.salaireMensuel).format('0,0') : 0} onChange={handleChange} ref={salaireInputRef} min="0" required
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pr-10 pl-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">Ar</span>
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email: </label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required
                  className="mt-1 block w-3/4 mb-6 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>
            <div>
              <div className='mb-12'>
                <label htmlFor="heureDebutTravail" className="block text-sm font-medium text-gray-700 mb-4">Horaire de travail: </label>
                <div>
                  <input type="time" name="heureDebutTravail" id="heureDebutTravail" value={formData.heureDebutTravail} onChange={handleChange} required
                    className="mt-1 block border border-blue-50 rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm" />
                  <p className='ml-8'>|</p>  
                  <input type="time" name="heureFinTravail" id="heureFinTravail" value={formData.heureFinTravail} onChange={handleChange} required
                    className="mt-1 block border border-blue-50 rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm" />
                </div>
              </div>
              

              <div className='mb-12'>
                <h3 className="block text-sm font-medium text-gray-700 mb-4">Jours de Travail: </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => (
                    <div key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`travail${day}`}
                        name={`travail${day}`}
                        checked={formData[`travail${day}`]}
                        onChange={handleChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`travail${day}`} className="ml-2 block text-sm text-gray-900">
                        {day}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>

        <div className="py-8 space-x-4 flex items-center">
          <button
            type="button"
            onClick={() => navigate('/employees')}
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

export default AddEditEmployee;