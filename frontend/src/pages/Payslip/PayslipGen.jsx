import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/api.js'; 
import moment from 'moment';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const PayslipGen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const prevEmployeesRef = useRef([]);
  const [selectedNumEmp, setSelectedNumEmp] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1); 
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [loading, setLoading] = useState(true); 
  const [generatedPayslipPath, setGeneratedPayslipPath] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);
    
  const FRENCH_MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const fetchEmployees = async () => {
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
        fetchData();
      }
    }, 10000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [user, navigate]);

  const handleGeneratePayslip = async (e) => {
    e.preventDefault();
    if (!selectedNumEmp || !selectedMonth || !selectedYear) {
      toast.warn('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setGenerateLoading(true);
    setGeneratedPayslipPath('');
    try {
      const response = await api.post('/payslip/generate-payslip', {
        numEmp: selectedNumEmp,
        month: selectedMonth,
        year: selectedYear,
      });

      toast.success(response.data.message);
      setGeneratedPayslipPath(`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/payslips/${response.data.filePath}`);
    } catch (error) {
      console.error('Une erreur est survenue à la génération du fiche de paie:', error);
      toast.error(error.response?.data?.message || 'Une erreur est survenue à la génération du fiche de paie.');
    } finally {
      setGenerateLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => moment().year() - i); 

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
      <h2 className="text-3xl font-bold text-gray-800 mb-12">Fiche de paie</h2>

        <div className="grid grid-cols-2 mb-8 gap-6">
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700">Mois: </label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              required
              className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {FRENCH_MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">Année: </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              required
              className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleGeneratePayslip}>
        <div className='w-1/2'>
          <label htmlFor="employee" className="block text-sm font-medium text-gray-700">Sélectionner un employé: </label>
          <select
            id="employee"
            value={selectedNumEmp}
            onChange={(e) => setSelectedNumEmp(e.target.value)}
            required
            className="mt-1 block w-3/4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">-- Choisir un employé --</option>
            {employees.map((emp) => (
              <option key={emp.NumEmp} value={emp.NumEmp}>
                {emp.NumEmp} - {emp.Nom} {emp.Prénom}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-16">
          <button
            type="submit"  
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-all duration-200"
            disabled={generateLoading}
          >
            {generateLoading ? ( <LoadingSpinner size='sm' inline/> ) : 'Générer la fiche de paie' }
          </button>
        </div>
      </form>

      {generatedPayslipPath && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-lg text-green-800 mb-2">Fiche de paie générée !</p>
          <a
            href={generatedPayslipPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline font-semibold"
          >
            Télécharger la fiche de paie
          </a>
        </div>
      )}
    </div>
  );
};

export default PayslipGen;