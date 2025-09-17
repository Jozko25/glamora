# Glamora AI Receptionist Backend

Virtual AI receptionist system for Glamora beauty salon, integrated with ElevenLabs for voice AI and TeamUp for calendar management.

## Features

- **Appointment Booking**: Book appointments with specific staff members
- **Availability Check**: Check available time slots for services
- **Smart Scheduling**: Find next available slot across all staff
- **Immediate Booking**: Books appointments instantly during phone calls
- **Staff & Service Management**: Complete configuration for all salon services

## API Endpoints

### Main Booking Endpoint
`POST /api/booking`

Request body:
```json
{
  "action": "book|check_availability|find_next_available|human_request",
  "customerName": "string",
  "customerPhone": "string",
  "serviceName": "string",
  "preferredStaff": "string (optional)",
  "preferredDate": "YYYY-MM-DD (optional)",
  "preferredTime": "HH:mm (optional)",
  "sessionId": "string (optional)",
  "conversationContext": "any (optional)"
}
```

### Verification Endpoint
`POST /api/booking/verify`

Request body:
```json
{
  "sessionId": "string",
  "action": "confirm|cancel"
}
```

### Booking Details Webhook (for ElevenLabs to read)
`GET /api/webhook/booking/:sessionId`

Returns booking details that the AI agent can read out to the customer.

### Real-time Slot Check Webhook
`POST /api/webhook/check-slot`

Request body:
```json
{
  "staffName": "string",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "duration": "number (minutes)"
}
```

### Additional Endpoints
- `GET /api/services` - List all available services
- `GET /api/staff/:type` - Get staff by type (hairdresser/cosmetician/all)
- `GET /health` - Health check

## Staff Configuration

### Hairdressers
- **Janka**: Mon(PM), Tue(PM), Wed(AM), Thu(AM), Fri(AM)
- **Nika**: Mon(AM), Tue(AM), Wed(PM), Thu(PM), Fri(AM)
- **Lívia**: Mon(PM), Tue(10:00-18:00), Wed(AM), Thu(AM), Fri(AM)

### Cosmetician
- **Dominika**: Mon(AM), Tue(AM), Wed(PM), Thu(PM), Fri(AM)

(AM = 9:00-15:00, PM = 12:00-18:00)

## Environment Variables

```bash
# TeamUp Calendar API
TEAMUP_API_KEY=1ee8ab724a01af1b4e27cd5957a292e9d252afe3f8d755ff1cc08e3c6a0ae644
TEAMUP_CALENDAR_KEY=ksgwbfebbkgfiayjm3

# Server Configuration
PORT=3000
NODE_ENV=production
TZ=Europe/Bratislava
```

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Deployment on Railway

1. Fork/clone this repository
2. Connect to Railway
3. Add environment variables in Railway dashboard
4. Deploy

The app will automatically build and start using the configuration in `railway.json`.

## ElevenLabs Integration

The system is designed to receive POST requests from ElevenLabs voice AI:

1. **ElevenLabs sends customer request** to `/api/booking`
2. **System processes immediately** and books the appointment during the phone call
3. **Returns booking confirmation** with sessionId for ElevenLabs to read back to customer
4. **Use webhook** `GET /api/webhook/booking/:sessionId` to retrieve booking details

## Phone Call Flow

1. Customer calls → ElevenLabs AI answers
2. AI collects: name, phone, service, preferred staff/date
3. AI sends POST to `/api/booking` with action: "book"
4. System books immediately and returns confirmation message
5. AI reads confirmation to customer: "Your appointment is booked for [date] at [time] with [staff]"

## Testing

Run the test suite:
```bash
npx tsx test-booking.ts
```

This tests all major endpoints and booking flows.