const pool = require('../config/db.js');
const moment = require('moment');
const configModel = require('../models/configModel.js');
const congeModel = require('../models/congeModel.js');
const employeeModel = require('../models/employeeModel.js');
const notificationModel = require('../models/notificationModel.js');
const { sendEmail } = require('../utils/emailService.js');

const validateConfigInputs = (dateDebut, dateFin, heureDebut, heureFin) => {
  if (!(dateDebut || dateFin) || !heureDebut || !heureFin) {
    return { isValid: false, message: "Veuillez remplir les champs obligatoires." };
  }

  if (dateDebut && dateFin && new Date(dateDebut) > new Date(dateFin)) {
    return { isValid: false, message: 'La date de début du plan doit précéder la date de fin' };
  }

  if (heureDebut && heureFin && heureDebut >= heureFin) {
    return { isValid: false, message: "L'horaire de début de service doit strictement précéder l'heure de fin" };
  }

  return { isValid: true };
};

const processEmployeeNotifications = async (employees, dateDebut, dateFin, heureDebut, heureFin, notificationType, connection) => {
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const emp of employees) {
    if (emp.Email) {
      const subject = 'Planning';
      const emailText = `Bonjour ${emp.Nom} ${emp.Prénom},\n\n${notificationType === 'create' ? 
        'Un nouveau plan a été décidé:' : 'Un changement de plan a été décidé:'} Pour la période du ${moment(dateDebut).format('DD/MM/YYYY')} au 
        ${moment(dateFin).format('DD/MM/YYYY')}, votre heure de travail sera de ${heureDebut} à ${heureFin}.${notificationType === 'update' ? 
        ' Veuillez consulter le calendrier de l\'entreprise dès que possible.' : ''}\n\nCordialement,\nL'équipe RH`;
      
      const html = `<p>Bonjour ${emp.Nom} ${emp.Prénom},</p><p>${notificationType === 'create' ? 
        'Un nouveau plan a été décidé:' : 'Un changement de plan a été décidé:'} Pour la période du <b>${moment(dateDebut).format('DD/MM/YYYY')}</b> au 
        <b>${moment(dateFin).format('DD/MM/YYYY')}</b>, votre heure de travail sera de <b>${heureDebut}</b> à <b>${heureFin}</b>.${notificationType === 'update' ? 
        ' Veuillez consulter le calendrier de l\'entreprise dès que possible.' : ''}</p><p>Cordialement,<br/>L'équipe RH</p>`;
      
      const emailSuccess = await sendEmail(emp.Email, subject, emailText, html);
      
      if (emailSuccess) {
        emailsSent++;
        const notificationText = `${emp.Nom} ${emp.Prénom}, ${notificationType === 'create' ? 
          'Un nouveau plan a été décidé:' : 'Un changement de plan a été décidé:'} Pour la période du ${moment(dateDebut).format('DD/MM/YYYY')} au 
          ${moment(dateFin).format('DD/MM/YYYY')}, votre heure de travail sera de ${heureDebut} à ${heureFin}.${notificationType === 'update' ? 
          ' Veuillez consulter le calendrier de l\'entreprise dès que possible.' : ''}`;
        
        await notificationModel.createNotification(
          emp.NumEmp,
          'Planning',
          notificationText.replace(/\n/g, ' '),
          'Changement Horaire',
          connection
        );
      } else {
        emailsFailed++;
      }
    }
  }

  return { emailsSent, emailsFailed };
};

const getEmployeesToNotify = async (notifyTarget, finalPoste, selectedEmployees, connection) => {
  let employeesToNotify = [];
  
  if (notifyTarget === 'all') {
    employeesToNotify = await employeeModel.getAllEmployees(connection);
  } else if (notifyTarget === 'poste' && finalPoste) {
    const employeeForPoste = (await employeeModel.getAllEmployees(connection)).filter(emp => emp.Poste === finalPoste);
    for (const emp of employeeForPoste) { 
      const haveConge = await congeModel.getEmployeeConges(emp.NumEmp, connection);
      if (haveConge.length === 0) { 
        employeesToNotify.push(emp); 
      }
    }
  } else if (notifyTarget === 'selected' && Array.isArray(selectedEmployees)) {
    for (const empId of selectedEmployees) {
      const emp = await employeeModel.getEmployeeById(empId, connection);
      if (emp) employeesToNotify.push(emp);
    }
  }
  
  return employeesToNotify;
};

const validateEmployeeAvailability = async (finalPoste, finalNumEmp, dateDebut, dateFin, connection) => {
  if (finalPoste) {
    const employeeForPoste = await employeeModel.getAllEmployeesForPoste(finalPoste, connection);
    if (employeeForPoste && employeeForPoste.length === 0) {
      return { isValid: false, message: 'Aucun employé n\'est présent dans le poste sélectionné. Veuillez insérer un poste valide.' };
    }
    for (const emp of employeeForPoste) {
      const haveConge = await congeModel.getEmployeeConges(emp.NumEmp, connection);
      if (employeeForPoste.length === 1 && haveConge.length !== 0) { 
        return {isValid: false, message: 'Le seul employé désigné à cette poste a déjà un congé plannifié durant cette période.'}
      }
    }    
  } else if (finalNumEmp) {
    const congeEmployee = await congeModel.getCongesBetweenDatesForEmployee(finalNumEmp, dateDebut, dateFin, connection);
    if (congeEmployee && congeEmployee.length > 0) {
      return { isValid: false, message: 'L\'employé sélectionné a un congé sur cette période et ne peut être affecté à un planning.' };
    }
  }
  
  return { isValid: true };
};

const getAllConfigs = async (req, res, next) => { 
  try {
    const configs = await configModel.getAllConfigs();
    res.status(200).json(configs);
  } catch (error) {
    next(error); 
  }
};

const getConfigById = async (req, res, next) => { 
  try {
    const config = await configModel.getConfigById(req.params.id);
    if (!config) {
      return res.status(404).json({ message: 'La configuration horaire prévue est introuvable ou inexistante.' });
    }
    res.status(200).json(config);
  } catch (error) {
    next(error); 
  }
};

const createConfig = async (req, res, next) => { 
  const { poste, numEmp, dateDebut, dateFin, heureDebut, heureFin, notifyTarget, selectedEmployees } = req.body;

  const validation = validateConfigInputs(dateDebut, dateFin, heureDebut, heureFin);
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.message });
  }

  const finalDateFin = dateFin || dateDebut;
  const finalPoste = poste === '' ? null : poste;
  const finalNumEmp = numEmp === '' ? null : parseInt(numEmp);

  if (finalPoste && finalNumEmp) {
    return res.status(400).json({ message: 'Vous ne pouvez pas spécifier à la fois un poste et un employé pour une configuration.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const availabilityCheck = await validateEmployeeAvailability(finalPoste, finalNumEmp, dateDebut, finalDateFin, connection);
    if (!availabilityCheck.isValid) {
      await connection.rollback();
      return res.status(400).json({ message: availabilityCheck.message });
    }

    const configId = await configModel.createConfig(finalPoste, finalNumEmp, dateDebut, finalDateFin, heureDebut, heureFin, connection);

    const employeesToNotify = await getEmployeesToNotify(notifyTarget, finalPoste, selectedEmployees, connection);
    const { emailsSent, emailsFailed } = await processEmployeeNotifications(
      employeesToNotify, 
      dateDebut, 
      finalDateFin, 
      heureDebut, 
      heureFin, 
      'create', 
      connection
    );

    await connection.commit();

    res.status(201).json({ 
      message: `Le planning a été ajouté avec succès. ${emailsSent} email(s) envoyé(s), ${emailsFailed} échec(s).`,
      configId,
      emailsSent,
      emailsFailed
    });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  } 
};

const updateConfig = async (req, res, next) => {
  const { poste, numEmp, dateDebut, dateFin, heureDebut, heureFin, notifyTarget, selectedEmployees } = req.body;
  const { id } = req.params;

  const validation = validateConfigInputs(dateDebut, dateFin, heureDebut, heureFin);
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.message });
  }

  const finalDateFin = dateFin || dateDebut;
  const finalPoste = poste === '' ? null : poste;
  const finalNumEmp = numEmp === '' ? null : parseInt(numEmp);

  if (finalPoste && finalNumEmp) {
    return res.status(400).json({ message: 'Vous ne pouvez pas spécifier à la fois un poste et un employé pour une configuration.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const availabilityCheck = await validateEmployeeAvailability(finalPoste, finalNumEmp, dateDebut, finalDateFin, connection);
    if (!availabilityCheck.isValid) {
      await connection.rollback();
      return res.status(400).json({ message: availabilityCheck.message });
    }

    const affectedRows = await configModel.updateConfig(id, finalPoste, finalNumEmp, dateDebut, finalDateFin, heureDebut, heureFin, connection);
    if (affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'La configuration horaire à mettre à jour est introuvable - Aucune modification a été effectuée.' });
    }

    const employeesToNotify = await getEmployeesToNotify(notifyTarget, finalPoste, selectedEmployees, connection);
    const { emailsSent, emailsFailed } = await processEmployeeNotifications(
      employeesToNotify, 
      dateDebut, 
      finalDateFin, 
      heureDebut, 
      heureFin, 
      'update', 
      connection
    );

    await connection.commit();

    res.status(200).json({ 
      message: `Le planning a été mise à jour avec succès. ${emailsSent} email(s) envoyé(s), ${emailsFailed} échec(s).`,
      emailsSent,
      emailsFailed
    });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const deleteConfig = async (req, res, next) => { 
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const affectedRows = await configModel.deleteConfig(req.params.id, connection);
    if (affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'La configuration horaire à supprimer est introuvable.' });
    }

    await connection.commit();

    res.status(200).json({ message: 'Le plan a été supprimé avec succès.' });
  } catch (error) {
    await connection.rollback();
    next(error); 
  } finally {
    if (connection) await connection.release();
  }
};

const searchConfigs = async (req, res, next) => { 
  try {
    const { startDate, endDate } = req.query;
    const rows = await configModel.getConfigsByDateRange(endDate, startDate);

    res.json(rows);
  } catch (error) {
    next(error);
  } 
};

module.exports = { getAllConfigs, getConfigById, createConfig, updateConfig, deleteConfig, searchConfigs };