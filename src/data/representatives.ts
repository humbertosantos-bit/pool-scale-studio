export interface Representative {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export const representatives: Representative[] = [
  {
    id: '1',
    name: 'Humberto Santos',
    email: 'hsantos@piscinesriviera.com',
    phone: '514-998-8965',
    address: '2275 boul. des entreprises, Terrebonne',
  },
  {
    id: '2',
    name: 'Andre Houle',
    email: 'ahoule@piscinesriviera.com',
    phone: '514-245-8382',
    address: '2275 boul. des entreprises, Terrebonne',
  },
  {
    id: '3',
    name: 'Nathalie Tardif',
    email: 'ntardif@piscinesriviera.com',
    phone: '514-245-8124',
    address: '2275 boul. des entreprises, Terrebonne',
  },
  {
    id: '4',
    name: 'Guy Boisvert',
    email: 'gboisvert@piscinesriviera.com',
    phone: '514-919-2473',
    address: '2275 boul. des entreprises, Terrebonne',
  },
  {
    id: '5',
    name: 'Stephanie Gendron',
    email: 'sgrendron@piscinesriviera.com',
    phone: '514-610-1910',
    address: '2275 boul. des entreprises, Terrebonne',
  },
];
