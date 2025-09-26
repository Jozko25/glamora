import { Staff } from '../types';

export const STAFF: Staff[] = [
  {
    name: 'Janka',
    role: 'hairdresser',
    schedule: {
      monday: [2],     // afternoon
      tuesday: [2],    // afternoon
      wednesday: [1],  // morning
      thursday: [1],   // morning
      friday: [1]      // morning
    }
  },
  {
    name: 'Nika',
    role: 'hairdresser',
    schedule: {
      monday: [1],     // morning
      tuesday: [1],    // morning
      wednesday: [2],  // afternoon
      thursday: [2],   // afternoon
      friday: [1]      // morning
    }
  },
  {
    name: 'Livia',
    role: 'hairdresser',
    schedule: {
      monday: [2],     // afternoon
      tuesday: [0],    // custom 10:00-18:00 (handled separately)
      wednesday: [1],  // morning
      thursday: [1],   // morning
      friday: [1]      // morning
    }
  },
  {
    name: 'Dominika',
    role: 'cosmetician',
    schedule: {
      monday: [1],     // morning
      tuesday: [1],    // morning
      wednesday: [2],  // afternoon
      thursday: [2],   // afternoon
      friday: [1]      // morning
    }
  }
];

export const SHIFT_TIMES = {
  1: { start: '09:00', end: '15:00' }, // morning shift
  2: { start: '12:00', end: '18:00' }  // afternoon shift
};

export const SPECIAL_SHIFTS: { [key: string]: { [day: string]: { start: string; end: string } } } = {
  'Livia': {
    tuesday: { start: '10:00', end: '18:00' }
  },
  // Support legacy name for backward compatibility
  'Lívia': {
    tuesday: { start: '10:00', end: '18:00' }
  }
};

export function getStaffWorkingHours(staffName: string, dayOfWeek: string): { start: string; end: string } | null {
  const staff = STAFF.find(s => s.name === staffName);
  if (!staff) return null;

  // Check for special shifts first
  if (SPECIAL_SHIFTS[staffName]?.[dayOfWeek]) {
    return SPECIAL_SHIFTS[staffName][dayOfWeek];
  }

  const shifts = staff.schedule[dayOfWeek];
  if (!shifts || shifts.length === 0 || shifts[0] === 0) {
    return null;
  }

  return SHIFT_TIMES[shifts[0] as 1 | 2];
}