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

  constructor() {
    this.initializeSubcalendars();
  }

  private initializeSubcalendars() {
    // Map staff names to subcalendar IDs from fresh calendar
    this.subcalendarMap.set('Janka', 14809606);
    this.subcalendarMap.set('Nika', 14809601);
    this.subcalendarMap.set('Lívia', 14809600);
    this.subcalendarMap.set('Dominika', 14809608);
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
    const response = await axios.post(
      `${TEAMUP_BASE_URL}/${this.calendarKey}/events`,
      event,
      {
        headers: this.getHeaders()
      }
    );

    return response.data.event;
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
    const start = startDate
      ? moment.tz(startDate, TIMEZONE)
      : moment.tz(TIMEZONE).add(1, 'day');
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
        customerPhone,
        service: serviceName,
        confirmed: false
      }
    };

    return await this.createEvent(event);
  }

  getSubcalendarId(staffName: string): number | undefined {
    return this.subcalendarMap.get(staffName);
  }
}

export const teamUpService = new TeamUpService();