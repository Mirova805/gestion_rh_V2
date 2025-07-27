import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import api from '../../api/api.js';
import moment from 'moment';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import momentPlugin from '@fullcalendar/moment';
import interactionPlugin from '@fullcalendar/interaction'; 
import frLocale from '@fullcalendar/core/locales/fr';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';

const Calendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const prevEventsRef = useRef([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendarEvents = async () => {
    try {
      const congesResponse = await api.get('/conges');
      const approvedConges = congesResponse.data.filter(c => c.CongeInfo === 'Validé' || c.CongeInfo === 'En Cours');

      let congeEvents = [];
      if (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') {
        congeEvents = approvedConges.map(conge => ({
          title: `Congé: ${conge.Nom} ${conge.Prénom} (${conge.Motif})`,
          start: moment(conge.DebutConge).format('YYYY-MM-DD'),
          end: moment(conge.DateRetour).format('YYYY-MM-DD'), 
          allDay: true,
          resource: { type: 'conge', data: conge },
          color: '#4CAF50'
        })); 
      }

      const configResponse = await api.get('/config');
      const configEvents = configResponse.data.map(cfg => ({
        title: `${cfg.Poste ? cfg.Poste + ': ' : ''}${cfg.NumEmp ? 'Emp ' + cfg.NumEmp + ': ' : ''}${cfg.HeureDebut}-${cfg.HeureFin}`,
        start: moment(cfg.DateDebut).format('YYYY-MM-DD'),
        end: moment(cfg.DateFin).add(1, 'day').format('YYYY-MM-DD'),
        allDay: true,
        resource: { type: 'config', data: cfg },
        color: '#2196F3'
      }));

      const newEvents = [...congeEvents, ...configEvents];
      
      if (JSON.stringify(newEvents) !== JSON.stringify(prevEventsRef.current)) {
        setEvents(newEvents);
        prevEventsRef.current = newEvents;
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue à la récupération des événements du calendrier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    
    const fetchData = async () => {
      if (isActive && document.visibilityState === 'visible') {
        await fetchCalendarEvents();
      }
    };
    fetchData();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCalendarEvents();
      }
    }, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [user]);

  const handleSelectSlot = ({ start, end }) => {
    const today = moment().startOf('day');
    const selectedStart = moment(start).startOf('day');
    
    if (selectedStart.isSameOrBefore(today)) {
      toast.warn("Vous ne pouvez pas sélectionner des dates passées ou aujourd'hui");
      return;
    }

    const adjustedEnd = moment(end).subtract(1, 'day');
      if (user.TitreUtil === 'admin' || user.TitreUtil === 'superuser') {
        const message = moment(start).isSame(adjustedEnd, 'day') 
          ? `pour le ${moment(start).format('DD/MM/YYYY')}`
          : `pour la période du ${moment(start).format('DD/MM/YYYY')} au ${adjustedEnd.format('DD/MM/YYYY')}`;
        confirmAlert({
          title: 'Ajouter un événement au calendrier',
          message: `Voulez-vous ajouter un plan ${message}?`,
          buttons: [
            {
              label: <FontAwesomeIcon icon={faCheck} />,
              onClick: () => {
                navigate(`/configurations/add?dateDebut=${moment(start).format('YYYY-MM-DD')}&dateFin=${adjustedEnd.format('YYYY-MM-DD')}`);
              }
            },
            { label: <FontAwesomeIcon icon={faTimes} /> }
          ]
        });
      }
    };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg"/>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md h-max">
      <h2 className="text-3xl font-bold text-gray-800 mb-16">Calendrier de l'entreprise</h2>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, momentPlugin, interactionPlugin]} 
        initialView="dayGridMonth"
        events={events}
        selectable={user.TitreUtil === 'admin' || user.TitreUtil === 'superuser'}
        select={handleSelectSlot} 
        selectAllow={(selectInfo) => {
          const today = moment().startOf('day');
          const selectedStart = moment(selectInfo.start).startOf('day');
          return selectedStart.isAfter(today);
        }}
        eventDisplay="block"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        eventColor="#378006"
        firstDay={1} 
        locale={frLocale}
      />
    </div>
  );
};

export default Calendar;