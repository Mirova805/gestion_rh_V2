const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error("La vérification du token a échoué:", error);
      res.status(401).json({ message: 'Vous n\'êtes pas autorisé, token invalide ou expiré' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Vous n\'êtes pas autorisé, aucun token est fourni' });
  }
};

const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return res.status(403).json({ message: 'Accès refusé, rôle insuffisant' });
    }
    next();
  };
};

module.exports = { protect, authorize };