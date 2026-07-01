/**
 * Punto de entrada para Hostinger y producción.
 * Hostinger detecta Express por server.js + dependencia express en package.json.
 */
require('dotenv').config();
require('./app.js');
