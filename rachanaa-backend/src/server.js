// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path');
// const http = require('http');
// const { Server } = require('socket.io');

// const authRoutes  = require('./routes/auth');
// const leadsRoutes = require('./routes/leads');
// const Admin = require('./models/Admin');

// const app = express();
// const server = http.createServer(app);

// console.log("Mongo URI:", process.env.MONGODB_URI);

// // const io = new Server(server, {
// //   cors: {
// //     origin: process.env.FRONTEND_URL || '*',
// //     methods: ['GET', 'POST', 'PATCH', 'DELETE']
// //   }
// // });
// const io = new Server(server, {
//   cors: {
//     origin: process.env.NODE_ENV === 'production'
//       ? process.env.FRONTEND_URL
//       : ['http://localhost:3000', 'http://127.0.0.1:3000', 'null'], // Add null for dev
//     methods: ['GET', 'POST', 'PATCH', 'DELETE'],
//     credentials: true
//   }
// });

// // Make io accessible in routes via req.io
// app.use((req, res, next) => { req.io = io; next(); });

// // ─── Middleware ───────────────────────────────────────────────────────────────
// // app.use(cors({
// //   origin: [
// //     process.env.FRONTEND_URL || 'http://localhost:3000',
// //     'http://localhost:3001',
// //     'http://localhost:5173',
// //   ],
// //   credentials: true
// // }));
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Serve uploaded files (for thumbnail preview in admin)
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// // ─── Routes ───────────────────────────────────────────────────────────────────
// app.use('/api/auth',  authRoutes);
// app.use('/api/leads', leadsRoutes);

// // Health check
// app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// // ─── Socket.IO ────────────────────────────────────────────────────────────────
// io.on('connection', (socket) => {
//   console.log('Admin connected:', socket.id);
//   socket.on('disconnect', () => console.log('Admin disconnected:', socket.id));
// });

// // ─── MongoDB + Seed Admin ────────────────────────────────────────────────────
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rachanaa_fintech')
//   .then(async () => {
//     console.log('✅ MongoDB connected');

//     // Seed default admin if none exists
//     const exists = await Admin.findOne({ username: process.env.ADMIN_USERNAME || 'admin' });
//     if (!exists) {
//       await Admin.create({
//         username: process.env.ADMIN_USERNAME || 'admin',
//         password: process.env.ADMIN_PASSWORD || 'Admin@123'
//       });
//       console.log(`✅ Admin seeded — username: ${process.env.ADMIN_USERNAME || 'admin'} | password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
//     }

//     const PORT = process.env.PORT || 5000;
//     server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
//   })
//   .catch(err => {
//     console.error('❌ MongoDB connection error:', err.message);
//     process.exit(1);
//   });

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes  = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const Admin = require('./models/Admin');

const app = express();
const server = http.createServer(app);

console.log("Mongo URI:", process.env.MONGODB_URI);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : ['https://rachanaa-admin.vercel.app/','https://rachanaa-frontend.vercel.app/'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Make io accessible in routes via req.io
app.use((req, res, next) => { req.io = io; next(); });

// ─── Middleware ───────────────────────────────────────────────────────────────
// Updated CORS to handle file uploads
app.use(cors({
  origin: ['https://rachanaa-admin.vercel.app/','https://rachanaa-frontend.vercel.app/'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Increase payload limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files (for thumbnail preview in admin)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/leads', leadsRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Admin connected:', socket.id);
  socket.on('disconnect', () => console.log('Admin disconnected:', socket.id));
});

// ─── MongoDB + Seed Admin ────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rachanaa_fintech')
  .then(async () => {
    console.log('✅ MongoDB connected');

    // Seed default admin if none exists
    const exists = await Admin.findOne({ username: process.env.ADMIN_USERNAME || 'admin' });
    if (!exists) {
      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'Admin@123'
      });
      console.log(`✅ Admin seeded — username: ${process.env.ADMIN_USERNAME || 'admin'} | password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });