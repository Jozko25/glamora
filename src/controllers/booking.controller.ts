import { Request, Response } from 'express';
import { BookingRequest, BookingResponse } from '../types';
import { teamUpService } from '../services/teamup';
import { verificationService } from '../services/verification';
import { findService } from '../config/services';
import { STAFF } from '../config/staff';
import moment from 'moment-timezone';

export class BookingController {
  async handleBookingRequest(req: Request, res: Response) {
    try {
      const bookingRequest: BookingRequest = req.body;
      console.log('Received booking request:', bookingRequest);

      // Validate required fields
      if (!bookingRequest.action) {
        return res.status(400).json({
          success: false,
          error: 'Action is required'
        });
      }

      let response: BookingResponse;

      switch (bookingRequest.action) {
        case 'book':
          response = await this.handleBooking(bookingRequest);
          break;

        case 'check_availability':
          response = await this.handleAvailabilityCheck(bookingRequest);
          break;

        case 'find_next_available':
          response = await this.handleFindNextAvailable(bookingRequest);
          break;

        case 'human_request':
          response = await this.handleHumanRequest(bookingRequest);
          break;

        default:
          response = {
            success: false,
            message: 'Invalid action',
            error: 'Unknown action type'
          };
      }

      return res.json(response);
    } catch (error) {
      console.error('Error handling booking request:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async handleVerification(req: Request, res: Response) {
    try {
      const { sessionId, action } = req.body;

      if (!sessionId || !action) {
        return res.status(400).json({
          success: false,
          error: 'Session ID and action are required'
        });
      }

      const session = verificationService.getSession(sessionId);

      if (!session) {
        return res.json({
          success: false,
          message: 'Session expired or not found',
          error: 'INVALID_SESSION'
        });
      }

      if (action === 'confirm') {
        if (session.status !== 'pending') {
          return res.json({
            success: false,
            message: 'Booking already processed',
            error: 'ALREADY_PROCESSED'
          });
        }

        // Confirm the session
        verificationService.confirmSession(sessionId);

        // Create the actual booking
        const booking = await teamUpService.bookAppointment(
          session.bookingDetails.staff,
          session.bookingDetails.customerName,
          session.bookingDetails.customerPhone,
          session.bookingDetails.service,
          session.bookingDetails.date,
          session.bookingDetails.time
        );

        return res.json({
          success: true,
          message: 'Booking confirmed successfully',
          data: {
            bookingId: booking.id,
            sessionId
          }
        });
      } else if (action === 'cancel') {
        verificationService.cancelSession(sessionId);

        return res.json({
          success: true,
          message: 'Booking cancelled',
          data: { sessionId }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
      }
    } catch (error) {
      console.error('Error handling verification:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleBooking(request: BookingRequest): Promise<BookingResponse> {
    // Validate required fields for booking
    if (!request.customerName || !request.customerPhone || !request.serviceName) {
      return {
        success: false,
        message: 'Missing required information for booking',
        error: 'MISSING_FIELDS'
      };
    }

    // Find the service
    const service = findService(request.serviceName);
    if (!service) {
      return {
        success: false,
        message: `Service "${request.serviceName}" not found`,
        error: 'SERVICE_NOT_FOUND'
      };
    }

    // Determine staff member
    let staffName = request.preferredStaff;
    if (!staffName) {
      // Auto-assign based on service type
      const availableStaff = STAFF.filter(s => s.role === service.staffType);
      if (availableStaff.length === 0) {
        return {
          success: false,
          message: 'No staff available for this service',
          error: 'NO_STAFF_AVAILABLE'
        };
      }
      staffName = availableStaff[0].name;
    }

    // Validate staff member
    const staff = STAFF.find(s => s.name === staffName);
    if (!staff) {
      return {
        success: false,
        message: `Staff member "${staffName}" not found`,
        error: 'STAFF_NOT_FOUND'
      };
    }

    if (staff.role !== service.staffType) {
      return {
        success: false,
        message: `${staffName} cannot perform this service`,
        error: 'STAFF_SERVICE_MISMATCH'
      };
    }

    // Handle date and time
    const date = request.preferredDate || moment().tz('Europe/Bratislava').add(1, 'day').format('YYYY-MM-DD');
    const time = request.preferredTime || '10:00';

    // Calculate end time
    const endTime = moment(time, 'HH:mm').add(service.duration, 'minutes').format('HH:mm');

    // Check for existing pending sessions that might block this slot
    const hasConflict = verificationService.checkForConflicts(staffName, date, time, endTime);
    if (hasConflict) {
      return {
        success: false,
        message: 'This time slot is currently being processed by another customer',
        error: 'SLOT_LOCKED'
      };
    }

    // Check availability with TeamUp
    const isAvailable = await teamUpService.checkAvailability(staffName, date, time, service.duration);
    if (!isAvailable) {
      // Find alternative slots
      const alternatives = await teamUpService.findAvailableSlots(
        staffName,
        request.serviceName,
        date,
        undefined,
        3
      );

      return {
        success: false,
        message: 'Requested time is not available',
        data: {
          availableSlots: alternatives
        },
        error: 'TIME_NOT_AVAILABLE'
      };
    }

    // Create verification session
    const session = verificationService.createSession({
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      service: request.serviceName,
      staff: staffName,
      date,
      time,
      endTime
    });

    // Book immediately since this is during a phone call
    try {
      const booking = await teamUpService.bookAppointment(
        staffName,
        request.customerName,
        request.customerPhone,
        request.serviceName,
        date,
        time
      );

      // Mark session as confirmed
      verificationService.confirmSession(session.sessionId);

      return {
        success: true,
        message: `Your appointment has been booked for ${date} at ${time} with ${staffName} for ${request.serviceName}`,
        data: {
          bookingId: booking.id,
          sessionId: session.sessionId,
          confirmationRequired: false,
          bookedSlot: {
            date,
            time,
            endTime,
            staffName,
            service: request.serviceName
          }
        }
      };
    } catch (error) {
      // If booking fails, cancel the session
      verificationService.cancelSession(session.sessionId);

      return {
        success: false,
        message: 'Failed to book the appointment. The slot may no longer be available.',
        error: 'BOOKING_FAILED'
      };
    }
  }

  private async handleAvailabilityCheck(request: BookingRequest): Promise<BookingResponse> {
    if (!request.serviceName) {
      return {
        success: false,
        message: 'Service name is required',
        error: 'MISSING_SERVICE'
      };
    }

    const service = findService(request.serviceName);
    if (!service) {
      return {
        success: false,
        message: `Service "${request.serviceName}" not found`,
        error: 'SERVICE_NOT_FOUND'
      };
    }

    let staffName = request.preferredStaff;
    if (!staffName) {
      const availableStaff = STAFF.filter(s => s.role === service.staffType);
      if (availableStaff.length === 0) {
        return {
          success: false,
          message: 'No staff available for this service',
          error: 'NO_STAFF_AVAILABLE'
        };
      }
      staffName = availableStaff[0].name;
    }

    const startDate = request.preferredDate || moment().tz('Europe/Bratislava').format('YYYY-MM-DD');
    const endDate = moment(startDate).add(7, 'days').format('YYYY-MM-DD');

    const availableSlots = await teamUpService.findAvailableSlots(
      staffName,
      request.serviceName,
      startDate,
      endDate,
      10
    );

    return {
      success: true,
      message: `Found ${availableSlots.length} available slots`,
      data: {
        availableSlots
      }
    };
  }

  private async handleFindNextAvailable(request: BookingRequest): Promise<BookingResponse> {
    if (!request.serviceName) {
      return {
        success: false,
        message: 'Service name is required',
        error: 'MISSING_SERVICE'
      };
    }

    const service = findService(request.serviceName);
    if (!service) {
      return {
        success: false,
        message: `Service "${request.serviceName}" not found`,
        error: 'SERVICE_NOT_FOUND'
      };
    }

    // Try all staff members who can perform this service
    const availableStaff = STAFF.filter(s => s.role === service.staffType);
    let earliestSlot: any = null;

    for (const staff of availableStaff) {
      const slots = await teamUpService.findAvailableSlots(
        staff.name,
        request.serviceName,
        undefined,
        undefined,
        1
      );

      if (slots.length > 0) {
        if (!earliestSlot || moment(`${slots[0].date} ${slots[0].time}`).isBefore(
          moment(`${earliestSlot.date} ${earliestSlot.time}`)
        )) {
          earliestSlot = slots[0];
        }
      }
    }

    if (!earliestSlot) {
      return {
        success: false,
        message: 'No available slots found in the next 2 weeks',
        error: 'NO_AVAILABILITY'
      };
    }

    return {
      success: true,
      message: `Next available slot found with ${earliestSlot.staffName}`,
      data: {
        suggestedSlot: earliestSlot
      }
    };
  }

  private async handleHumanRequest(request: BookingRequest): Promise<BookingResponse> {
    if (!request.customerName || !request.customerPhone) {
      return {
        success: false,
        message: 'Customer name and phone are required',
        error: 'MISSING_CUSTOMER_INFO'
      };
    }

    // In a real implementation, this would trigger a notification to staff
    // For now, just log the request and return success
    console.log('Human assistance requested:', {
      customer: request.customerName,
      phone: request.customerPhone,
      service: request.serviceName,
      preferredStaff: request.preferredStaff,
      preferredDate: request.preferredDate
    });

    return {
      success: true,
      message: 'Our staff will assist you shortly. Please hold on.',
      requiresHuman: true
    };
  }
}