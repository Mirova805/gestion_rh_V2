import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faUserTag, faIdBadge } from '@fortawesome/free-solid-svg-icons';

const Register = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); 
  
  const [nomUtil, setNomUtil] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('');
  const [titreUtil, setTitreUtil] = useState('user'); 
  const [numEmp, setNumEmp] = useState('');
  const [employees, setEmployees] = useState([]); 
  const prevEmployeesRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

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
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nomUtil || !motDePasse || !titreUtil) {
      toast.warn('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (motDePasse !== confirmMotDePasse) {
      toast.warn('Les mots de passe ne correspondent pas.');
      return;
    }
    if (motDePasse.length < 6) {
      toast.warn('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setSubmitLoading(true);

    const userData = { nomUtil, motDePasse, titreUtil };
    if (titreUtil === 'user') {
      userData.numEmp = numEmp;
    }

    try {
      await api.post('/users/register', userData);
      toast.success('Le compte d\'utilisateur a été enregistré avec succès !');
      navigate('/users'); 
    } catch (error) {
      console.error('Une erreur est survenue à l\'enregistrement:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue à l\'enregistrement.');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer un nouveau compte
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4"> 
            <div className="relative">
              <label htmlFor="username" className="sr-only">Nom d'utilisateur: </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Nom d'utilisateur"
                value={nomUtil}
                onChange={(e) => setNomUtil(e.target.value)}
              />
              <FontAwesomeIcon icon={faUser} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">Mot de passe: </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Mot de passe (min 6 caractères)"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
              <FontAwesomeIcon icon={faLock} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <div className="relative">
              <label htmlFor="confirm-password" className="sr-only">Confirmer le mot de passe: </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Confirmer le mot de passe"
                value={confirmMotDePasse}
                onChange={(e) => setConfirmMotDePasse(e.target.value)}
              />
              <FontAwesomeIcon icon={faLock} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="mt-4 relative">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rôle: </label>
            <select
              id="role"
              name="role"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={titreUtil}
              onChange={(e) => setTitreUtil(e.target.value)}
            >
              {user.TitreUtil === 'admin' && <option value="superuser">superuser</option>}
              {(user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') && <option value="user">user</option>}
            </select>
            <FontAwesomeIcon icon={faUserTag} className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-2 text-gray-400" />
          </div>

          {titreUtil === 'user' && (
            <div className="mt-4 relative">
              <label htmlFor="numEmp" className="block text-sm font-medium text-gray-700">Numéro d'employé (Obligatoire pour les "Users")</label>
              <select
                id="numEmp"
                name="numEmp"
                required={titreUtil === 'user'}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={numEmp}
                onChange={(e) => setNumEmp(e.target.value)}
              >
                <option value="">Sélectionner un employé</option>
                {employees.map((emp) => (
                  <option key={emp.NumEmp} value={emp.NumEmp}>
                    {emp.NumEmp} - {emp.Nom} {emp.Prénom}
                  </option>
                ))}
              </select>
              <FontAwesomeIcon icon={faIdBadge} className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-2 text-gray-400" />
            </div>
          )}

          <div>
            <button
              type="submit"  
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
              disabled={submitLoading}
            >
              {submitLoading ? ( <LoadingSpinner size='sm' inline/> ) : 'Enregister'}
            </button>
          </div>
          <div className="text-center text-sm">
            <button type="button" onClick={() => navigate('/users')} className="font-medium text-indigo-600 hover:text-indigo-500">
              Annuler et revenir à la page précédente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;