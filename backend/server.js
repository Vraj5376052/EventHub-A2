const os = require('os');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');


dotenv.config();


const app = express();

app.use(cors());
app.use(express.json());

// Load balancer health check, and the evidence that requests really are spread
// across instances. The hostname says which one answered.
// (US-6.1, NFR-05).
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        instance: os.hostname(),
        uptime: Math.round(process.uptime()),
    });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/auditRoutes'));

// Export the app object for testing
if (require.main === module) {
    connectDB();
    // If the file is run directly, start the server
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }


module.exports = app
