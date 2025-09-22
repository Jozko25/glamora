const config = require('../../config');

function checkSlotAvailability(timeStr, durationMinutes, existingBookings) {
  if (!existingBookings || existingBookings.length === 0) {
    return true;
  }

  const [hour, minute] = timeStr.split(':').map(Number);
  const slotStartMinutes = hour * 60 + minute;
  const slotEndMinutes = slotStartMinutes + durationMinutes;

  for (const booking of existingBookings) {
    if (!booking.start_dt || !booking.end_dt) {
      continue;
    }
    const existingStart = new Date(booking.start_dt);
    const existingEnd = new Date(booking.end_dt);
    const existingStartMinutes = existingStart.getHours() * 60 + existingStart.getMinutes();
    const existingEndMinutes = existingEnd.getHours() * 60 + existingEnd.getMinutes();

    const overlap = (slotStartMinutes < existingEndMinutes && slotEndMinutes > existingStartMinutes);
    if (overlap) {
      return false;
    }
  }
  return true;
}

function generateAvailableSlots(startTime, endTime, existingBookings, serviceDuration, checkDate = null) {
  const slots = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  const timeZone = (config && config.app && config.app.timezone) ? config.app.timezone : 'Europe/Bratislava';
  const minAdvance = (config && config.bookingRules && config.bookingRules.minAdvanceBooking) ? config.bookingRules.minAdvanceBooking : 0;

  const now = new Date();
  const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const formatterTime = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, hour: '2-digit', minute: '2-digit' });
  const nowDateInTz = formatterDate.format(now);
  const isToday = !!checkDate && checkDate === nowDateInTz;

  let thresholdMinutes = 0;
  if (isToday) {
    const parts = formatterTime.formatToParts(now);
    const hourPart = parts.find(p => p.type === 'hour');
    const minutePart = parts.find(p => p.type === 'minute');
    const hour = hourPart ? parseInt(hourPart.value, 10) : now.getHours();
    const minute = minutePart ? parseInt(minutePart.value, 10) : now.getMinutes();
    thresholdMinutes = hour * 60 + minute + minAdvance;
  }

  for (let time = startMinutes; time + serviceDuration <= endMinutes; time += 30) {
    if (isToday && time <= thresholdMinutes) {
      continue;
    }

    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (checkSlotAvailability(timeStr, serviceDuration, existingBookings)) {
      slots.push(timeStr);
    }
  }

  return slots;
}

module.exports = {
  checkSlotAvailability,
  generateAvailableSlots
};


