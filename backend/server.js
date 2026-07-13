const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan'); // HTTP request logger

// Load environment variables (Sabse upar load karna zaroori hai)
dotenv.config();

// Initialize Express App
const app = express();

// ==========================================
// 1. MIDDLEWARES
// ==========================================
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Build allowed origins from env + hardcoded defaults
    const allowed = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://the-design-space-websiteadmin.vercel.app',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
    ].filter(Boolean);

    if (allowed.includes(origin)) return callback(null, true);

    // Allow any *.vercel.app or *.hostingersite.com subdomain in dev/staging
    if (/\.vercel\.app$/.test(origin) || /\.hostingersite\.com$/.test(origin)) {
      return callback(null, true);
    }

    // Allow custom production domain (with or without www)
    const productionDomain = process.env.PRODUCTION_DOMAIN; // e.g. thedesignspace.in
    if (productionDomain) {
      if (
        origin === `https://${productionDomain}` ||
        origin === `https://www.${productionDomain}`
      ) {
        return callback(null, true);
      }
    }

    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json()); // Body parser to read JSON data
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Log requests to console
}

// ==========================================
// 2. MONGODB CONNECTION (Optimized & Secure)
// ==========================================
const connectDB = async () => {
  try {
    // MONGODB_URI directly fetched from your .env file
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true, // Automatically build MongoDB indexes
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Crash the server safely if DB fails to connect
  }
};

connectDB();

// ==========================================
// 3. ROUTES CONFIGURATION
// ==========================================

// Auth & Users (Isi ke andar aapke naye Manager Approval Endpoints chalenge)
app.use('/api/v1/auth', require('./routes/urls')); 

// Dashboard
app.use('/api/v1/dashboard', require('./routes/dashboard_urls'));

// Clients & Projects
app.use('/api/v1/clients', require('./routes/client_urls'));

// Line Items (Catalogue)
app.use('/api/v1/line-items', require('./routes/line_item_urls'));

// Quotations
app.use('/api/v1/quotations', require('./routes/quotation_urls'));

// Proposals
app.use('/api/v1/proposals', require('./routes/proposal_urls'));

// Invoices
app.use('/api/v1/invoices', require('./routes/invoice_urls'));

// Payments
app.use('/api/v1/payments', require('./routes/payment_urls'));

// Enquiries
app.use('/api/v1/enquiries', require('./routes/enquiry_routes'));

// Notifications (WhatsApp, Email & Logs)
app.use('/api/v1/notifications', require('./routes/notification_urls'));

// Settings (Tax, Bank, Brand, Milestones, Numbering)
app.use('/api/v1/settings', require('./routes/settings_urls'));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Master Services
app.use('/api/v1/services', require('./routes/master_service_urls'));

// Portfolio (client work gallery)
app.use('/api/v1/portfolio', require('./routes/portfolio_urls'));

// Weather
app.use('/api/v1/weather', require('./routes/weather_urls'));

// In-App Notifications
app.use('/api/v1/in-app-notifications', require('./routes/in_app_notification_urls'));

// Public Website (thedesignspace.in root) — no auth, published content + contact form
app.use('/api/v1/public', require('./routes/public_urls'));

// Website Web-CMS (dashboard "Website Interactive CMS" panel) — manager/owner only
app.use('/api/v1/web-cms', require('./routes/web_cms_urls'));


// ==========================================
// 4. GLOBAL ERROR HANDLER
// ==========================================

// Fallback route for 404 (Not Found)
app.use((req, res, next) => {
  res.status(404).json({ detail: `Route ${req.originalUrl} not found` });
});

// Generic global error handler (Catches server crashes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ==========================================
// 5. BACKGROUND TASKS (CRON JOBS)
// ==========================================
require('./tasks/reminder_task'); 


// ==========================================
// 6. START SERVER / EXPORT FOR SERVERLESS
// ==========================================

// For Vercel serverless environment
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // For local development
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}