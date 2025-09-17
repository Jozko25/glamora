# Glamora AI Receptionist - Railway Deployment Guide

## ✅ System Ready for Production

Your AI receptionist backend is fully configured and ready to deploy on Railway.

### **What's Been Built:**

- ✅ **Real TeamUp Integration** - Connected to calendar `ksgwbfebbkgfiayjm3`
- ✅ **ElevenLabs-Ready API** - Immediate booking during phone calls
- ✅ **Staff & Service Management** - All 29 services + 4 staff members configured
- ✅ **Smart Scheduling** - Respects work shifts and availability
- ✅ **Booking Webhooks** - For AI to read confirmation details

---

## 🚀 Deploy to Railway

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Glamora AI Receptionist - Production Ready"
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Connect to Railway
1. Go to [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Select your Glamora repository

### 3. Environment Variables
Add these in Railway dashboard under **Variables**:

```
TEAMUP_API_KEY=1ee8ab724a01af1b4e27cd5957a292e9d252afe3f8d755ff1cc08e3c6a0ae644
TEAMUP_CALENDAR_KEY=ksgwbfebbkgfiayjm3
PORT=3000
NODE_ENV=production
TZ=Europe/Bratislava
```

### 4. Deploy
Railway will automatically:
- Build with `npm run build`
- Start with `npm start`
- Health check at `/health`

---

## 📞 ElevenLabs Integration

### Main Endpoint
```
POST https://your-app.railway.app/api/booking
```

### Example Request (what ElevenLabs sends):
```json
{
  "action": "book",
  "customerName": "Anna Nováková",
  "customerPhone": "+421900123456",
  "serviceName": "Strihanie, umytie, fúkanie, česanie",
  "preferredStaff": "Janka",
  "preferredDate": "2025-09-18",
  "preferredTime": "14:00"
}
```

### Response (what AI reads to customer):
```json
{
  "success": true,
  "message": "Your appointment has been booked for 2025-09-18 at 14:00 with Janka for Strihanie, umytie, fúkanie, česanie",
  "data": {
    "bookingId": "12345",
    "sessionId": "abc123",
    "bookedSlot": {
      "date": "2025-09-18",
      "time": "14:00",
      "endTime": "15:00",
      "staffName": "Janka",
      "service": "Strihanie, umytie, fúkanie, česanie"
    }
  }
}
```

---

## 🎯 Key Features Ready

### Available Actions:
1. **"book"** - Books appointment immediately
2. **"check_availability"** - Shows available slots
3. **"find_next_available"** - Finds soonest appointment
4. **"human_request"** - Logs when customer wants human help

### Staff Schedules Configured:
- **Janka**: Mon(PM), Tue(PM), Wed(AM), Thu(AM), Fri(AM)
- **Nika**: Mon(AM), Tue(AM), Wed(PM), Thu(PM), Fri(AM)
- **Lívia**: Mon(PM), Tue(10-18), Wed(AM), Thu(AM), Fri(AM)
- **Dominika**: Mon(AM), Tue(AM), Wed(PM), Thu(PM), Fri(AM)

### All Services Ready:
- Hair services (15 types) - 30min to 8 hours
- Cosmetic services (14 types) - 30min to 4 hours

---

## 🔧 Testing After Deployment

```bash
# Health check
curl https://your-app.railway.app/health

# Test booking
curl https://your-app.railway.app/api/booking \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"book","customerName":"Test","customerPhone":"+421900123456","serviceName":"Strihanie, umytie, fúkanie, česanie","preferredStaff":"Janka","preferredDate":"2025-09-20","preferredTime":"10:00"}'
```

---

## 📋 Next Steps

1. **Deploy to Railway** (5 minutes)
2. **Get your Railway URL** (e.g., `https://glamora-ai-production.railway.app`)
3. **Configure ElevenLabs** to send POST requests to your `/api/booking` endpoint
4. **Test with real phone calls**

The system is production-ready and will handle real bookings in your TeamUp calendar! 🎉