require('dotenv').config();

const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const store = require('./models/store');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/client');
const providerRoutes = require('./routes/provider');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('io', io);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'zilo-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

app.get('/', (req, res) => {
  if (req.session.user) {
    const dashboards = { client: '/cliente', provider: '/proveedor', admin: '/admin' };
    return res.redirect(dashboards[req.session.user.role] || '/login');
  }
  res.render('landing', { title: 'Zilo — Servicios premium a domicilio' });
});

app.use('/', authRoutes);
app.use('/cliente', clientRoutes);
app.use('/proveedor', providerRoutes);
app.use('/admin', adminRoutes);
app.use('/pagos', paymentRoutes);

io.on('connection', (socket) => {
  socket.on('register_provider', (providerId) => {
    store.providerSockets.set(providerId, socket.id);
    socket.providerId = providerId;
  });

  socket.on('register_client', (requestId) => {
    socket.join(`request_${requestId}`);
  });

  socket.on('disconnect', () => {
    if (socket.providerId) {
      store.providerSockets.delete(socket.providerId);
    }
  });
});

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'No encontrado',
    message: 'La página que buscas no existe.',
    code: 404
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Zilo corriendo en puerto ${PORT}`);
});
