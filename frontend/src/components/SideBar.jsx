import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faUsers, faCalendarCheck, faCalendarAlt, faClock,
  faChartLine, faCogs, faSignOutAlt, faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("Vous avez été déconnecté.");
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className={`bg-gray-900 text-white ${isOpen ? 'w-64' : 'w-20'} space-y-6 py-7 px-2 transition-all duration-300 ease-in-out flex flex-col justify-between fixed h-full`}>
      <div>
        <div className="flex items-center justify-start px-4 mb-12">
          <button onClick={() => setIsOpen(!isOpen)} className="text-white focus:outline-none">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /> 
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M4 12h16" />
              )}
            </svg>
          </button>
        </div>

        <nav>
          {(user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') && (
            <>
              <Link to="/home" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faHome} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Accueil</span>
              </Link>
              <Link to="/statistics" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faChartLine} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Statistiques</span>
              </Link>
              <Link to="/calendar" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faCalendarCheck} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Calendrier</span>
              </Link>
              <Link to="/configurations" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faCogs} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Planning</span>
              </Link>
              <Link to="/employees" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faUsers} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Employés</span>
              </Link>
              <Link to="/pointages" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faClock} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Pointages</span>
              </Link>
              <Link to="/conges" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faCalendarAlt} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Congés</span>
              </Link>
              <Link to="/payslip" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faMoneyBillWave} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Fiches de paie</span>
              </Link>
            </>
          )}

          {user.TitreUtil === 'user' && (
            <>
              <Link to="/calendar" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faCalendarCheck} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Calendrier</span>
              </Link>
              <Link to="/pointages" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faClock} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Pointages</span>
              </Link>
              <Link to="/conges" className="flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1">
                <FontAwesomeIcon icon={faCalendarAlt} className="w-5 text-center" />
                <span className={`ml-3 ${!isOpen && 'hidden'}`}>Congés</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      <div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center py-3 px-4 rounded transition duration-200 hover:bg-gray-700 mb-1"
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="w-5 text-center" />
          <span className={`ml-3 ${!isOpen && 'hidden'}`}>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;