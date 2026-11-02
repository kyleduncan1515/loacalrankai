// Business types we target. `osm` = OpenStreetMap tag filters used by find-leads.
// `services` feed the demo site; keep them generic so we never invent claims about a business.
export const NICHES = {
  roofer: {
    label: 'Roofing', plural: 'roofers', osm: ['craft=roofer'], color: '#b4532a',
    services: ['Roof Repair', 'Roof Replacement', 'Storm Damage Inspections', 'Leak Repair', 'Gutters', 'Free Estimates'],
    pain: 'homeowners searching for a roofer after a storm',
  },
  plumber: {
    label: 'Plumbing', plural: 'plumbers', osm: ['craft=plumber'], color: '#1d6fb8',
    services: ['Leak Repair', 'Drain Cleaning', 'Water Heaters', 'Toilet & Faucet Repair', 'Pipe Replacement', 'Emergency Service'],
    pain: 'people with a burst pipe searching on their phone',
  },
  electrician: {
    label: 'Electrical', plural: 'electricians', osm: ['craft=electrician'], color: '#d49b00',
    services: ['Panel Upgrades', 'Wiring & Rewiring', 'Lighting Installation', 'Outlets & Switches', 'EV Charger Install', 'Troubleshooting'],
    pain: 'homeowners searching for an electrician on their phone',
  },
  hvac: {
    label: 'Heating & Cooling', plural: 'HVAC companies', osm: ['craft=hvac'], color: '#0f8a8a',
    services: ['AC Repair', 'Furnace Repair', 'New System Installation', 'Maintenance Plans', 'Duct Cleaning', 'Thermostats'],
    pain: 'people whose AC just died searching on their phone',
  },
  landscaper: {
    label: 'Landscaping', plural: 'landscapers', osm: ['craft=gardener', 'shop=garden_centre'], color: '#3d8b37',
    services: ['Lawn Care', 'Landscape Design', 'Tree & Shrub Trimming', 'Mulch & Planting', 'Hardscaping', 'Seasonal Cleanup'],
    pain: 'homeowners comparing landscapers online',
  },
  painter: {
    label: 'Painting', plural: 'painters', osm: ['craft=painter'], color: '#7a4bc2',
    services: ['Interior Painting', 'Exterior Painting', 'Cabinet Painting', 'Deck Staining', 'Drywall Repair', 'Free Quotes'],
    pain: 'homeowners comparing painters online',
  },
  'auto-repair': {
    label: 'Auto Repair', plural: 'auto repair shops', osm: ['shop=car_repair'], color: '#c0392b',
    services: ['Brakes', 'Oil Changes', 'Engine Diagnostics', 'Tires & Alignment', 'AC Service', 'State Inspections'],
    pain: 'drivers searching for a mechanic nearby',
  },
  dentist: {
    label: 'Dental', plural: 'dental offices', osm: ['amenity=dentist'], color: '#2a7fb4',
    services: ['Cleanings & Exams', 'Fillings', 'Crowns', 'Teeth Whitening', 'Emergency Visits', 'New Patients Welcome'],
    pain: 'families looking for a new dentist on their phone',
  },
  locksmith: {
    label: 'Locksmith', plural: 'locksmiths', osm: ['shop=locksmith', 'craft=locksmith'], color: '#5b6470',
    services: ['Lockouts', 'Rekeying', 'Lock Installation', 'Car Keys', 'Safes', 'Commercial Locks'],
    pain: 'people locked out searching on their phone',
  },
  carpenter: {
    label: 'Carpentry', plural: 'carpenters', osm: ['craft=carpenter'], color: '#8a5a2b',
    services: ['Custom Cabinets', 'Decks', 'Trim & Molding', 'Framing', 'Repairs', 'Remodels'],
    pain: 'homeowners comparing contractors online',
  },
};

export function getNiche(key) {
  const n = NICHES[key];
  if (!n) {
    console.error(`Unknown niche "${key}". Options: ${Object.keys(NICHES).join(', ')}`);
    process.exit(1);
  }
  return n;
}
