import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const HomePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
      <h2 className="text-3xl font-bold text-gray-800 mb-12">Accueil</h2>
      <p className="text-lg text-gray-700">Bienvenue à l'accueil {user?.TitreUtil} {user?.NomUtil} !</p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user?.TitreUtil === 'admin' && (
          <div className="bg-blue-100 p-6 rounded-lg shadow-sm border border-blue-200">
            <h3 className="text-xl font-semibold text-blue-800 mb-2">Gestion Admin</h3>
            <p className="text-blue-700">Accès complet aux employés, utilisateurs, configurations.</p>
            <Link to="/employees" className="text-blue-600 hover:underline mt-3 block">Gérer les employés</Link>
            <Link to="/users" className="text-blue-600 hover:underline mt-1 block">Gérer les comptes d'utilisateur</Link>
          </div>
        )}

        {user?.TitreUtil === 'superuser' && (
          <div className="bg-green-100 p-6 rounded-lg shadow-sm border border-green-200">
            <h3 className="text-xl font-semibold text-green-800 mb-2">Gestion Superuser</h3>
            <p className="text-green-700">Gérer les employés, congés, pointages, créer des utilisateurs simples.</p>
            <Link to="/employees" className="text-green-600 hover:underline mt-3 block">Gérer les employés</Link>
            <Link to="/conges" className="text-green-600 hover:underline mt-1 block">Gérer les congés</Link>
          </div>
        )}

        <div className="bg-yellow-100 p-6 rounded-lg shadow-sm border border-yellow-200">
          <h3 className="text-xl font-semibold text-yellow-800 mb-2">Calendrier</h3>
          <p className="text-yellow-700">Consultez les emplois du temps de l'entreprise.</p>
          <Link to="/calendar" className="text-yellow-600 hover:underline mt-3 block">Voir le calendrier</Link>
        </div>

        <div className="bg-red-100 p-6 rounded-lg shadow-sm border border-red-200">
          <h3 className="text-xl font-semibold text-red-800 mb-2">Pointages</h3>
          <p className="text-red-700">Accédez à l'historique des pointages.</p>
          <Link to="/pointages" className="text-red-600 hover:underline mt-3 block">Voir les pointages</Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;