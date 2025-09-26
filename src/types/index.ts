export interface Staff {
  name: string;
  role: 'hairdresser' | 'cosmetician';
  schedule: {
    [day: string]: number[]; // 1 = morning (9-15), 2 = afternoon (12-18)
  };
}

export interface Service {
  name: string;
  duration: number; // in minutes
  category: 'hair' | 'cosmetics';
  staffType: 'hairdresser' | 'cosmetician';
}

export interface BookingRequest {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  preferredStaff?: string;
  preferredDate?: string;
  preferredTime?: string;
  action: 'book' | 'check_availability' | 'find_next_available' | 'human_request';
  sessionId?: string;
  conversationContext?: any;
  excludeSlots?: Array<{
    date: string;
    time: string;
    staffName?: string;
  }> | string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  data?: {
    bookingId?: string;
    availableSlots?: TimeSlot[];
    suggestedSlot?: TimeSlot;
    suggestedSlots?: TimeSlot[];
    bookedSlot?: {
      date: string;
      time: string;
      endTime: string;
      staffName: string;
      service: string;
    };
    available?: boolean;
    slot?: TimeSlot;
    confirmationRequired?: boolean;
    sessionId?: string;
  };
  error?: string;
  requiresHuman?: boolean;
}

export interface TimeSlot {
  date: string;
  time: string;
  endTime: string;
  staffName: string;
  available: boolean;
}

export interface TeamUpEvent {
  id?: string;
  subcalendar_id?: number;
  subcalendar_ids?: number[];
  start_dt: string;
  end_dt: string;
  title: string;
  who?: string;
  notes?: string;
  custom?: {
    customerPhone?: string;
    service?: string;
    confirmed?: boolean;
  };
}

export interface VerificationSession {
  sessionId: string;
  bookingDetails: {
    customerName: string;
    customerPhone: string;
    service: string;
    staff: string;
    date: string;
    time: string;
    endTime: string;
  };
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
}