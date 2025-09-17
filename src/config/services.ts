import { Service } from '../types';

export const SERVICES: Service[] = [
  // Hair Services
  {
    name: 'Farbenie korienkov',
    duration: 90,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Strihanie, umytie, fúkanie, česanie',
    duration: 60,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Zložitejší účes',
    duration: 90,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Svadobný účes',
    duration: 120,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Zosvetlenie/odfarbovanie',
    duration: 180,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Melír extra dlhé vlasy',
    duration: 240,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Mikro melír',
    duration: 300, // average of 4-6 hours
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Airtouch',
    duration: 330, // average of 5-6 hours
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Balayage',
    duration: 210,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Balayage dlhé vlasy',
    duration: 240,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Úplné odfarbenie',
    duration: 360,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Vyrovnávacia vlasová kúra',
    duration: 420, // average of 6-8 hours
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Predlžovanie vlasov - odpájanie',
    duration: 150,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Predlžovanie vlasov - napájanie',
    duration: 210, // average of 3-4 hours
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Strih + kúra',
    duration: 90,
    category: 'hair',
    staffType: 'hairdresser'
  },

  // Cosmetic Services
  {
    name: 'Klasické kozmetické ošetrenie',
    duration: 75,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Farbenie, úprava a ošetrenie obočia',
    duration: 90,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Samostatné farbenie a úprava obočia',
    duration: 30,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Úprava a farbenie mihalníc',
    duration: 30,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Farbenie a úprava mihalníc + obočia',
    duration: 60,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Laminácia obočia s farbením',
    duration: 45,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Laminácia obočia + lash lift',
    duration: 75,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Samostatný lash lift',
    duration: 45,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Permanentný make-up obočia',
    duration: 180,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Permanentný make-up pier',
    duration: 240,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Permanentný make-up očných liniek',
    duration: 180,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Líčenie štandard',
    duration: 60,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Náročné líčenie',
    duration: 90,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Svadobné líčenie',
    duration: 90,
    category: 'cosmetics',
    staffType: 'cosmetician'
  }
];

export function findService(serviceName: string): Service | undefined {
  return SERVICES.find(s =>
    s.name.toLowerCase().includes(serviceName.toLowerCase()) ||
    serviceName.toLowerCase().includes(s.name.toLowerCase())
  );
}

export function getServicesByStaffType(staffType: 'hairdresser' | 'cosmetician'): Service[] {
  return SERVICES.filter(s => s.staffType === staffType);
}