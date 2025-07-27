const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'Gmail', 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`L'envoi du mail à ${to} a été effectué avec succès.`);
    return true; 
  } catch (error) {
    console.error(`L'envoi du mail à ${to} a échoué :`, error);
    return false; 
  }
};

module.exports = { sendEmail };