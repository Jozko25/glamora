import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Glamora AI Receptionist Server`);
  console.log(`📍 Running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕐 Timezone: ${process.env.TZ}`);
  console.log(`📱 WhatsApp: ${process.env.WHATSAPP_API_KEY ? 'Configured' : 'Mock mode'}`);
  console.log(`📅 TeamUp Calendar: ${process.env.TEAMUP_CALENDAR_KEY || 'Not configured'}`);
  console.log('\n📡 Endpoints:');
  console.log(`   POST /api/booking - Main booking endpoint`);
  console.log(`   POST /api/booking/verify - Verify booking`);
  console.log(`   POST /api/webhook/check-slot - Real-time slot check`);
  console.log(`   GET /api/services - List all services`);
  console.log(`   GET /api/staff/:type - Get staff by type`);
  console.log(`   GET /health - Health check`);
});