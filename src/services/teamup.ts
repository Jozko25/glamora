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

  // Vacation keywords to check (case-insensitive)
  private readonly VACATION_KEYWORDS = [
    'dovolenka', 'DOVOLENKA', 'Dovolenka',
    'dovoľenka', 'DOVOĽENKA', 'Dovoľenka',
    'vacation', 'VACATION', 'Vacation',
    'holiday', 'HOLIDAY', 'Holiday'
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
    this.subcalendarMap.set('Lívia', 12448216);      // GLAMORA > Lívia
    this.subcalendarMap.set('Dominika', 11754238);   // GLAMORA > Dominika
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
    const events = await this.getEvents(
      startDateTime.format('YYYY-MM-DD'),
      endDateTime.format('YYYY-MM-DD'),
      [subcalendarId]
    );

    // First check if there's ANY vacation event on this day (blocks entire day)
    for (const event of events) {
      if (this.isVacationEvent(event)) {
        return false; // Vacation blocks the entire day
      }
    }

    // Then check for normal appointment conflicts
    for (const event of events) {
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
    maxSlots: number = 10
  ): Promise<TimeSlot[]> {
    const service = findService(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
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

    const currentDate = start.clone();

    while (currentDate.isSameOrBefore(end) && slots.length < maxSlots) {
      const dayOfWeek = currentDate.format('dddd').toLowerCase();
      const workingHours = getStaffWorkingHours(staffName, dayOfWeek);

      if (workingHours) {
        const workStart = moment.tz(
          `${currentDate.format('YYYY-MM-DD')} ${workingHours.start}`,
          'YYYY-MM-DD HH:mm',
          TIMEZONE
        );
        const workEnd = moment.tz(
          `${currentDate.format('YYYY-MM-DD')} ${workingHours.end}`,
          'YYYY-MM-DD HH:mm',
          TIMEZONE
        );

        let slotStart = workStart.clone();

        while (slotStart.clone().add(service.duration, 'minutes').isSameOrBefore(workEnd)) {
          const available = await this.checkAvailability(
            staffName,
            currentDate.format('YYYY-MM-DD'),
            slotStart.format('HH:mm'),
            service.duration
          );

          if (available) {
            slots.push({
              date: currentDate.format('YYYY-MM-DD'),
              time: slotStart.format('HH:mm'),
              endTime: slotStart.clone().add(service.duration, 'minutes').format('HH:mm'),
              staffName,
              available: true
            });
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