1/ Créer et placer cette fichier temporaire dans le dossier "backend":

generateHashedPassword.js:

const bcrypt = require('bcryptjs');
const plainPassword = process.argv[2];

if (!plainPassword) {
  console.error('Insérer un mot de passe valide');
  process.exit(1);
}

async function generateHashedPassword(password) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);   
    console.log('Mot de passe hashé:', hashedPassword);
  } catch (error) {
    console.error('Erreur lors du hachage:', error);
  }
}

generateHashedPassword(plainPassword);

__________________________

2/ Exécuter la commande suivante dans l'invite de commande: 
cd chemin_vers_backend/backend
node generateHashedPassword.js votre_mot_de_passe

__________________________

3/ Puis créer un "admin" avec cette requête SQL:
"Insert into utilisateur (NomUtil, MotDePasse, TitreUtil) values ('votre_user_name', '$2a$10.... (Le mot de passe hashé générée)', 'admin')"

__________________________

4/ Connecter vous avec le mot de passe en clair et votre user name

__________________________
