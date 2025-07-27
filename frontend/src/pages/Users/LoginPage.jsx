import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser , faLock } from '@fortawesome/free-solid-svg-icons';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [nomUtil, setNomUtil] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoginLoading(true);
    try {
      const response = await api.post('/users/login', {
        nomUtil,
        motDePasse,
      });
      login(response.data);
      toast.success('Connexion réussie !');

      if (response.data.TitreUtil === 'admin' || response.data.TitreUtil === 'superuser') {
        navigate('/home');
      } else {
        navigate('/calendar');
      }
    } catch (error) {
      console.error('Une erreur est survenue:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue à la connexion. Veuillez vérifier vos identifiants.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connectez-vous à votre compte
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
                autoComplete="username"
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
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10" 
                placeholder="Mot de passe"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
              <FontAwesomeIcon icon={faLock} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <button
              type="submit"  
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              disabled={loginLoading}
            >
              {loginLoading ? ( <LoadingSpinner size='sm' inline/> ) : 'Se connecter' }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;