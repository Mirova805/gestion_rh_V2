import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { toast } from 'react-toastify';
import api from '../../api/api.js'; 
import moment from 'moment';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const StatisticsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    absentByMonth: {}, 
    leaveMotifDistribution: {},
    averageDelayTime: '00:00:00',
  });
  const prevStatsRef = useRef({});
  const [loading, setLoading] = useState(true);

  const FRENCH_MONTHS = [
    'Jan', 'Fév', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
  ];

  const fetchStatistics = async () => {
    try {
      const absentByMonth = {};
      
      for (let month = 0; month < 12; month++) {
        const monthStart = moment().month(month).startOf('month');
        const monthEnd = moment().month(month).endOf('month');
        const monthName = FRENCH_MONTHS[month];
        
        let totalAbsentDaysInMonth = 0;
        let firstDayOfMonth = moment(monthStart);
        const yesterday = moment().subtract(1, 'days').endOf('day'); 
        while (firstDayOfMonth.isSameOrBefore(monthEnd, 'day')) {
          if (firstDayOfMonth.isAfter(yesterday, 'day')) { 
            break;
          }
          const formattedDate = firstDayOfMonth.format('YYYY-MM-DD');
          try {
            const absentEmployeesForDayResponse = await api.get(`/employees/absent?date=${formattedDate}`);
            totalAbsentDaysInMonth += absentEmployeesForDayResponse.data.length;
          } catch (error) {
            console.warn(`Erreur lors de la récupération des absents pour le ${formattedDate}:`, error.message);
          }
          firstDayOfMonth.add(1, 'day');
        }
        absentByMonth[monthName] = totalAbsentDaysInMonth;
      }

      const congesResponse = await api.get('/conges');
      const leaveMotifDistribution = congesResponse.data.reduce((acc, c) => {
        acc[c.Motif] = (acc[c.Motif] || 0) + 1;
        return acc;
      }, {});

      const allPointagesResponse = await api.get('/pointages');
      let totalDelaySeconds = 0;
      let delayCount = 0;
      allPointagesResponse.data.forEach(p => {
        if (p.HeureRetard) {
          const [h, m, s] = p.HeureRetard.split(':').map(Number);
          totalDelaySeconds += (h * 3600) + (m * 60) + s;
          delayCount++;
        }
      });

      let averageDelayTime = '00:00:00';
      if (delayCount > 0) {
        const avgSeconds = totalDelaySeconds / delayCount;
        const hours = Math.floor(avgSeconds / 3600);
        const minutes = Math.floor((avgSeconds % 3600) / 60);
        const seconds = Math.floor(avgSeconds % 60);
        averageDelayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }

      if (JSON.stringify({ absentByMonth, leaveMotifDistribution, averageDelayTime }) !== JSON.stringify(prevStatsRef.current)) {
        setStats({
          absentByMonth, 
          leaveMotifDistribution,
          averageDelayTime,
        });
        prevStatsRef.current = { absentByMonth, leaveMotifDistribution, averageDelayTime };
      }

    } catch (error) {
      console.error('Une erreur est survenue à la récupération des statistiques:', error);
      setStats({ 
        absentByMonth: {},
        leaveMotifDistribution: {},
        averageDelayTime: '00:00:00',
      });
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des statistiques. La base de données est peut-être vide ou inaccessible.');
    } finally { 
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    
    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await fetchStatistics();
      }
    };
    fetchData();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatistics();
      }
    }, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [user]);

  const absentByMonthChartData = {
    labels: Object.keys(stats.absentByMonth),
    datasets: [
      {
        label: 'Nombre de jours d\'absence cumulés',
        data: Object.values(stats.absentByMonth),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const generateColors = (count) => {
    const colors = [];
    const hueStep = 360 / count;
    
    for (let i = 0; i < count; i++) {
      const hue = Math.floor(hueStep * i);
      colors.push(`hsla(${hue}, 70%, 60%, 0.6)`);
    }
    
    return colors;
  };

  const labels = Object.keys(stats.leaveMotifDistribution);
  const backgroundColors = generateColors(labels.length);
  const borderColors = backgroundColors.map(color => color.replace('0.6)', '1)'));

  const leaveMotifChartData = {
    labels: labels,
    datasets: [
      {
        label: 'Nombre de demandes',
        data: Object.values(stats.leaveMotifDistribution),
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
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
      <h2 className="text-3xl font-bold text-gray-800 mb-16">Statistiques de l'entreprise</h2>

      <div className="w-2/5 mb-12">
        <div className="bg-yellow-50 p-4 rounded-full shadow-sm text-center">
          <h3 className="text-xl font-semibold text-yellow-800">Temps de retard moyen</h3>
          <p className="text-4xl font-bold text-yellow-600 mt-2">{stats.averageDelayTime}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Nombre de jours d'absence cumulés par mois </h3>
          {Object.keys(stats.absentByMonth).length > 0 ? (
            <div className="h-96"> 
              <Bar 
                data={absentByMonthChartData} 
                options={{ 
                  responsive: true,
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { position: 'top' }, 
                    title: { display: true, text: 'Absences par mois' } 
                  }
                }} 
              />
            </div>
          ) : (
            <p className="text-center text-gray-600">Aucune donnée d'absence par mois disponible.</p>
          )}
        </div>

        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Distribution des motifs de congé</h3>
          {Object.keys(stats.leaveMotifDistribution).length > 0 ? (
            <div className="h-96"> 
              <Pie 
                data={leaveMotifChartData} 
                options={{ 
                  responsive: true,
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { 
                      position: 'top' 
                    }, 
                    title: { 
                      display: true, 
                      text: 'Motifs de congé' 
                    } 
                  }
                }} 
              />
            </div>
          ) : (
            <p className="text-center text-gray-600">Aucune donnée de congé disponible.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;