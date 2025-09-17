import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { BookingController } from './controllers/booking.controller';

// Load environment variables
dotenv.config();

// Set timezone
process.env.TZ = 'Europe/Bratislava';

const app = express();
const bookingController = new BookingController();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    timezone: process.env.TZ,
    environment: process.env.NODE_ENV
  });
});

// Main booking endpoint for ElevenLabs
app.post('/api/booking', bookingController.handleBookingRequest.bind(bookingController));

// Verification endpoint for double-checking bookings
app.post('/api/booking/verify', bookingController.handleVerification.bind(bookingController));

// Webhook endpoint for ElevenLabs to read booking confirmations
app.get('/api/webhook/booking/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { verificationService } = await import('./services/verification');

    const session = verificationService.getSession(sessionId);

    if (!session) {
      return res.json({
        success: false,
        message: 'Session not found or expired',
        status: 'NOT_FOUND'
      });
    }

    // Return booking details for the AI agent to read out
    return res.json({
      success: true,
      status: session.status,
      booking: {
        customerName: session.bookingDetails.customerName,
        service: session.bookingDetails.service,
        staff: session.bookingDetails.staff,
        date: session.bookingDetails.date,
        time: session.bookingDetails.time,
        endTime: session.bookingDetails.endTime
      },
      message: session.status === 'confirmed'
        ? `Your appointment is confirmed for ${session.bookingDetails.date} at ${session.bookingDetails.time} with ${session.bookingDetails.staff} for ${session.bookingDetails.service}`
        : `Your appointment is scheduled for ${session.bookingDetails.date} at ${session.bookingDetails.time} with ${session.bookingDetails.staff} for ${session.bookingDetails.service}`
    });
  } catch (error) {
    console.error('Error retrieving booking details:', error);
    res.json({
      success: false,
      message: 'Error retrieving booking details'
    });
  }
});

// Webhook endpoint for ElevenLabs to check slot availability in real-time
app.post('/api/webhook/check-slot', async (req, res) => {
  try {
    const { staffName, date, time, duration } = req.body;

    if (!staffName || !date || !time || !duration) {
      return res.json({
        available: false,
        reason: 'Missing required parameters'
      });
    }

    const { teamUpService } = await import('./services/teamup');
    const isAvailable = await teamUpService.checkAvailability(
      staffName,
      date,
      time,
      duration
    );

    res.json({
      available: isAvailable,
      staffName,
      date,
      time,
      duration
    });
  } catch (error) {
    console.error('Error checking slot availability:', error);
    res.json({
      available: false,
      reason: 'Error checking availability'
    });
  }
});

// Get available staff for a service
app.get('/api/staff/:serviceType', (req, res) => {
  const { serviceType } = req.params;
  const { STAFF } = require('./config/staff');

  const availableStaff = STAFF.filter((s: any) =>
    s.role === serviceType || serviceType === 'all'
  );

  res.json({
    success: true,
    staff: availableStaff.map((s: any) => ({
      name: s.name,
      role: s.role,
      schedule: s.schedule
    }))
  });
});

// Get all services
app.get('/api/services', (req, res) => {
  const { SERVICES } = require('./config/services');

  res.json({
    success: true,
    services: SERVICES.map((s: any) => ({
      name: s.name,
      duration: s.duration,
      category: s.category,
      staffType: s.staffType
    }))
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

export default app;