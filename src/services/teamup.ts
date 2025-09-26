import axios from 'axios';
import moment from 'moment-timezone';
import { TeamUpEvent, TimeSlot } from '../types';
import { STAFF, getStaffWorkingHours } from '../config/staff';
import { findService } from '../config/services';

const TEAMUP_BASE_URL = 'https://api.teamup.com';
const TIMEZONE = 'Europe/Bratislava';

class TeamUpService {

  private get calendarKey(): string {
    return process.env.TEAMUP_CALENDAR_KEY || '';
  }

  private get apiKey(): string {
    return process.env.TEAMUP_API_KEY || '';
  }
  private subcalendarMap: Map<string, number> = new Map();

  // Vacation and blocking keywords to check (case-insensitive)
  private readonly VACATION_KEYWORDS = [
    'dovolenka', 'DOVOLENKA', 'Dovolenka',
    'dovoľenka', 'DOVOĽENKA', 'Dovoľenka',
    'vacation', 'VACATION', 'Vacation',
    'holiday', 'HOLIDAY', 'Holiday',
    'školenie', 'ŠKOLENIE', 'Školenie',
    'training', 'TRAINING', 'Training',
    'workshop', 'WORKSHOP', 'Workshop'
  ];

  /**
   * Check if customer already has an appointment in the near future
   * Search by phone number in custom.kontakt field
   */
  async checkExistingBooking(customerPhone: string): Promise<TeamUpEvent | null> {
    const futureDate = moment.tz(TIMEZONE).add(30, 'days').format('YYYY-MM-DD');
    const today = moment.tz(TIMEZONE).format('YYYY-MM-DD');

    try {
      // Search all subcalendars for existing bookings
      const events = await this.getEvents(today, futureDate);

      for (const event of events) {
        // Check if phone number matches in custom fields, notes, or who field
        if ((event as any).custom?.kontakt?.includes(customerPhone) ||
            event.notes?.includes(customerPhone) ||
            event.who?.includes(customerPhone)) {
          return event;
        }
      }
    } catch (error) {
      console.log('Error checking existing bookings:', error);
    }

    return null;
  }

  constructor() {
    this.initializeSubcalendars();
  }

  private initializeSubcalendars() {
    // CLIENT PRODUCTION SUBCALENDAR IDs for calendar ksxtixzt14gusrox5d
    this.subcalendarMap.set('Janka', 11754111);      // GLAMORA > Janka
    this.subcalendarMap.set('Nika', 11754110);       // GLAMORA > Nika
    this.subcalendarMap.set('Livia', 12448216);      // GLAMORA > Livia
    this.subcalendarMap.set('Dominika', 11754238);   // GLAMORA > Dominika
    // Support both versions for backward compatibility
    this.subcalendarMap.set('Lívia', 12448216);      // GLAMORA > Lívia (legacy)
    // Additional staff members available in calendar:
    // this.subcalendarMap.set('Katka', 11754354);   // GLAMORA > Katka
    // this.subcalendarMap.set('Margarita', 11787096); // GLAMORA > Margarita
  }

  private getHeaders() {
    return {
      'Teamup-Token': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  async getEvents(startDate: string, endDate: string, subcalendarIds?: number[]): Promise<TeamUpEvent[]> {
    const params: any = {
      startDate,
      endDate
    };

    if (subcalendarIds && subcalendarIds.length > 0) {
      params.subcalendarId = subcalendarIds;
    }

    const response = await axios.get(
      `${TEAMUP_BASE_URL}/${this.calendarKey}/events`,
      {
        headers: this.getHeaders(),
        params
      }
    );

    return response.data.events || [];
  }

  async createEvent(event: TeamUpEvent): Promise<TeamUpEvent> {
    try {
      const response = await axios.post(
        `${TEAMUP_BASE_URL}/${this.calendarKey}/events`,
        event,
        {
          headers: this.getHeaders()
        }
      );

      return response.data.event;
    } catch (error: any) {
      console.error('Event creation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateEvent(eventId: string, event: Partial<TeamUpEvent>): Promise<TeamUpEvent> {
    const response = await axios.put(
      `${TEAMUP_BASE_URL}/${this.calendarKey}/events/${eventId}`,
      event,
      {
        headers: this.getHeaders()
      }
    );

    return response.data.event;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await axios.delete(
      `${TEAMUP_BASE_URL}/${this.calendarKey}/events/${eventId}`,
      {
        headers: this.getHeaders()
      }
    );
  }

  private isVacationEvent(event: TeamUpEvent): boolean {
    // Check all relevant fields for vacation keywords
    // This blocks entire day for training, vacations, workshops etc.
    const fieldsToCheck = [
      event.who || '',
      event.title || '',
      event.notes || ''
    ];

    for (const field of fieldsToCheck) {
      // Convert to lowercase for case-insensitive comparison
      const fieldLower = field.toLowerCase();

      // Check if any vacation keyword is present
      for (const keyword of this.VACATION_KEYWORDS) {
        if (fieldLower.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  async checkAvailability(
    staffName: string,
    date: string,
    startTime: string,
    duration: number
  ): Promise<boolean> {
    const subcalendarId = this.subcalendarMap.get(staffName);
    if (!subcalendarId) {
      throw new Error(`Staff member ${staffName} not found`);
    }

    const startDateTime = moment.tz(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', TIMEZONE);
    const endDateTime = startDateTime.clone().add(duration, 'minutes');

    // Check if within working hours
    const dayOfWeek = startDateTime.format('dddd').toLowerCase();
    const workingHours = getStaffWorkingHours(staffName, dayOfWeek);

    if (!workingHours) {
      return false; // Staff doesn't work this day
    }

    const workStart = moment.tz(`${date} ${workingHours.start}`, 'YYYY-MM-DD HH:mm', TIMEZONE);
    const workEnd = moment.tz(`${date} ${workingHours.end}`, 'YYYY-MM-DD HH:mm', TIMEZONE);

    if (startDateTime.isBefore(workStart) || endDateTime.isAfter(workEnd)) {
      return false; // Outside working hours
    }

    // Check for conflicts with existing appointments
    // First, get ALL events for the day to check for training/vacation events
    const allDayEvents = await this.getEvents(
      startDateTime.format('YYYY-MM-DD'),
      endDateTime.format('YYYY-MM-DD')
    );


    // Check if there's ANY vacation/training event that includes this staff member
    for (const event of allDayEvents) {
      if (this.isVacationEvent(event)) {
        // Only block if the event specifically involves this staff member's subcalendar
        if (event.subcalendar_ids?.includes(subcalendarId) ||
            event.subcalendar_id === subcalendarId) {
          return false; // Training/vacation blocks the entire day for this staff
        }
      }
    }

    // Now get events specific to this staff member's subcalendar for regular appointments
    const staffEvents = await this.getEvents(
      startDateTime.format('YYYY-MM-DD'),
      endDateTime.format('YYYY-MM-DD'),
      [subcalendarId]
    );

    // Then check for normal appointment conflicts
    for (const event of staffEvents) {
      const eventStart = moment.tz(event.start_dt, TIMEZONE);
      const eventEnd = moment.tz(event.end_dt, TIMEZONE);

      // Check for overlap
      if (
        (startDateTime.isSameOrAfter(eventStart) && startDateTime.isBefore(eventEnd)) ||
        (endDateTime.isAfter(eventStart) && endDateTime.isSameOrBefore(eventEnd)) ||
        (startDateTime.isSameOrBefore(eventStart) && endDateTime.isSameOrAfter(eventEnd))
      ) {
        return false; // Time slot conflicts with existing event
      }
    }

    return true;
  }

  async findAvailableSlots(
    staffName: string,
    serviceName: string,
    startDate?: string,
    endDate?: string,
    maxSlots: number = 10,
    excludeSlots?: Array<{ date: string; time: string; staffName?: string }>
  ): Promise<TimeSlot[]> {
    const service = findService(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const subcalendarId = this.subcalendarMap.get(staffName);
    if (!subcalendarId) {
      throw new Error(`Staff member ${staffName} not found`);
    }

    const slots: TimeSlot[] = [];
    const now = moment.tz(TIMEZONE);

    // Ensure start date is not in the past
    let start = startDate
      ? moment.tz(startDate, TIMEZONE)
      : moment.tz(TIMEZONE).add(1, 'day');

    // If requested start date is in the past, start from tomorrow
    if (start.isBefore(now, 'day')) {
      start = now.clone().add(1, 'day').startOf('day');
    }

    const end = endDate
      ? moment.tz(endDate, TIMEZONE)
      : start.clone().add(14, 'days');

    // Fetch ALL events for the entire date range at once
    const allEvents = await this.getEvents(
      start.format('YYYY-MM-DD'),
      end.format('YYYY-MM-DD')
    );

    // Fetch staff-specific events
    const staffEvents = await this.getEvents(
      start.format('YYYY-MM-DD'),
      end.format('YYYY-MM-DD'),
      [subcalendarId]
    );

    // Check for vacation/training events that block this staff member
    const vacationDays = new Set<string>();
    for (const event of allEvents) {
      if (this.isVacationEvent(event)) {
        if (event.subcalendar_ids?.includes(subcalendarId) ||
            event.subcalendar_id === subcalendarId) {
          const eventDate = moment.tz(event.start_dt, TIMEZONE).format('YYYY-MM-DD');
          vacationDays.add(eventDate);
        }
      }
    }

    const currentDate = start.clone();

    while (currentDate.isSameOrBefore(end) && slots.length < maxSlots) {
      const dateStr = currentDate.format('YYYY-MM-DD');

      // Skip vacation days
      if (vacationDays.has(dateStr)) {
        currentDate.add(1, 'day');
        continue;
      }

      const dayOfWeek = currentDate.format('dddd').toLowerCase();
      const workingHours = getStaffWorkingHours(staffName, dayOfWeek);

      if (workingHours) {
        const workStart = moment.tz(
          `${dateStr} ${workingHours.start}`,
          'YYYY-MM-DD HH:mm',
          TIMEZONE
        );
        const workEnd = moment.tz(
          `${dateStr} ${workingHours.end}`,
          'YYYY-MM-DD HH:mm',
          TIMEZONE
        );

        // Get events for this specific day
        const dayEvents = staffEvents.filter(event => {
          const eventStart = moment.tz(event.start_dt, TIMEZONE);
          return eventStart.format('YYYY-MM-DD') === dateStr;
        });

        let slotStart = workStart.clone();

        // For same-day bookings, skip past current time + 15 minute buffer
        const now = moment.tz(TIMEZONE);
        const isToday = currentDate.format('YYYY-MM-DD') === now.format('YYYY-MM-DD');
        if (isToday) {
          const minBookingTime = now.add(15, 'minutes');
          if (slotStart.isBefore(minBookingTime)) {
            slotStart = minBookingTime.clone();
            // Round up to next 30-minute interval
            const minutes = slotStart.minutes();
            if (minutes % 30 !== 0) {
              slotStart.add(30 - (minutes % 30), 'minutes');
            }
          }
        }

        while (slotStart.clone().add(service.duration, 'minutes').isSameOrBefore(workEnd)) {
          const slotEnd = slotStart.clone().add(service.duration, 'minutes');

          // Check if this slot conflicts with any existing appointments
          const hasConflict = dayEvents.some(event => {
            const eventStart = moment.tz(event.start_dt, TIMEZONE);
            const eventEnd = moment.tz(event.end_dt, TIMEZONE);

            return (
              (slotStart.isSameOrAfter(eventStart) && slotStart.isBefore(eventEnd)) ||
              (slotEnd.isAfter(eventStart) && slotEnd.isSameOrBefore(eventEnd)) ||
              (slotStart.isSameOrBefore(eventStart) && slotEnd.isSameOrAfter(eventEnd))
            );
          });

          if (!hasConflict) {
            const slot = {
              date: dateStr,
              time: slotStart.format('HH:mm'),
              endTime: slotEnd.format('HH:mm'),
              staffName,
              available: true
            };

            // Check if this slot should be excluded
            const shouldExclude = excludeSlots?.some(excludeSlot =>
              excludeSlot.date === slot.date &&
              excludeSlot.time === slot.time &&
              (!excludeSlot.staffName || excludeSlot.staffName === slot.staffName)
            );

            if (!shouldExclude) {
              slots.push(slot);
            }
          }

          slotStart.add(30, 'minutes'); // Check every 30 minutes
        }
      }

      currentDate.add(1, 'day');
    }

    return slots;
  }

  async bookAppointment(
    staffName: string,
    customerName: string,
    customerPhone: string,
    serviceName: string,
    date: string,
    time: string
  ): Promise<TeamUpEvent> {
    const service = findService(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const subcalendarId = this.subcalendarMap.get(staffName);
    if (!subcalendarId) {
      throw new Error(`Staff member ${staffName} not found`);
    }

    const startDateTime = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', TIMEZONE);
    const endDateTime = startDateTime.clone().add(service.duration, 'minutes');

    // Check availability first
    const isAvailable = await this.checkAvailability(staffName, date, time, service.duration);

    if (!isAvailable) {
      throw new Error('Time slot is not available');
    }

    const event: TeamUpEvent = {
      subcalendar_id: subcalendarId,
      start_dt: startDateTime.format(),
      end_dt: endDateTime.format(),
      title: `${customerName} - ${serviceName}`,
      who: customerName,
      notes: `Telefón: ${customerPhone}\nSlužba: ${serviceName}\nTrvanie: ${service.duration} min`,
      custom: {
        kontakt: customerPhone,  // Required field for this calendar
        customerPhone,
        service: serviceName,
        confirmed: false
      } as any
    };

    return await this.createEvent(event);
  }

  getSubcalendarId(staffName: string): number | undefined {
    return this.subcalendarMap.get(staffName);
  }
}

export const teamUpService = new TeamUpService();