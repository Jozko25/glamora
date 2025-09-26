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
    name: 'Strihanie, umytie, fukanie, cesanie',
    duration: 60,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Zlozitejsi uces',
    duration: 90,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Svadobny uces',
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
    name: 'Melir extra dlhe vlasy',
    duration: 240,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Mikro melir',
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
    name: 'Balayage dlhe vlasy',
    duration: 240,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Uplne odfarbenie',
    duration: 360,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Vyrovnavacia vlasova kura',
    duration: 420, // average of 6-8 hours
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Predlzovanie vlasov - odpajanie',
    duration: 150,
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Predlzovanie vlasov - napajanie',
    duration: 210, // average of 3-4 hours
    category: 'hair',
    staffType: 'hairdresser'
  },
  {
    name: 'Strih + kura',
    duration: 90,
    category: 'hair',
    staffType: 'hairdresser'
  },

  // Cosmetic Services
  {
    name: 'Klasicke kozmeticke osetrenie',
    duration: 75,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Farbenie, uprava a osetrenie oboci',
    duration: 90,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Samostatne farbenie a uprava oboci',
    duration: 30,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Uprava a farbenie mihalnic',
    duration: 30,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Farbenie a uprava mihalnic + oboci',
    duration: 60,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Laminacia oboci s farbenim',
    duration: 45,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Laminacia oboci + lash lift',
    duration: 75,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Samostatny lash lift',
    duration: 45,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Permanentny make-up oboci',
    duration: 180,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Permanentny make-up pier',
    duration: 240,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Permanentny make-up ocnych liniek',
    duration: 180,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Licenie standard',
    duration: 60,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Narocne licenie',
    duration: 90,
    category: 'cosmetics',
    staffType: 'cosmetician'
  },
  {
    name: 'Svadobne licenie',
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