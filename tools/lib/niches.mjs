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
  'pest-control': {
    label: 'Pest Control', plural: 'pest control companies', osm: ['craft=pest_control', 'shop=pest_control'], color: '#6b8e23',
    services: ['General Pest Control', 'Termites', 'Rodents', 'Mosquitoes', 'Bed Bugs', 'Free Inspections'],
    pain: 'homeowners searching for pest control on their phone',
  },
  cleaning: {
    label: 'Cleaning', plural: 'cleaning companies', osm: ['craft=cleaning', 'office=cleaning'], color: '#1aa39a',
    services: ['House Cleaning', 'Deep Cleaning', 'Move-In / Move-Out', 'Office Cleaning', 'Recurring Service', 'Free Quotes'],
    pain: 'busy families comparing cleaners online',
  },
  salon: {
    label: 'Hair & Beauty', plural: 'salons', osm: ['shop=hairdresser', 'shop=beauty'], color: '#c2185b',
    services: ['Haircuts', 'Color', 'Styling', 'Treatments', 'Nails', 'Book an Appointment'],
    pain: 'people looking for a new salon on their phone',
  },
  barber: {
    label: 'Barber', plural: 'barbershops', osm: ['shop=barber'], color: '#283593',
    services: ['Haircuts', 'Fades', 'Beard Trims', 'Hot Towel Shaves', 'Kids Cuts', 'Walk-Ins Welcome'],
    pain: 'people searching "barber near me"',
  },
  'car-wash': {
    label: 'Car Wash & Detailing', plural: 'car washes', osm: ['amenity=car_wash'], color: '#0277bd',
    services: ['Exterior Wash', 'Interior Detailing', 'Full Detail', 'Waxing', 'Ceramic Coating', 'Fleet Service'],
    pain: 'drivers searching for a car wash nearby',
  },
  vet: {
    label: 'Veterinary', plural: 'vet clinics', osm: ['amenity=veterinary'], color: '#2e7d32',
    services: ['Wellness Exams', 'Vaccinations', 'Dental Care', 'Surgery', 'Urgent Care', 'New Patients Welcome'],
    pain: 'pet owners looking for a new vet',
  },
  'pet-grooming': {
    label: 'Pet Grooming', plural: 'pet groomers', osm: ['shop=pet_grooming'], color: '#8e24aa',
    services: ['Baths', 'Full Grooms', 'Nail Trims', 'De-Shedding', 'Puppy Grooms', 'Book an Appointment'],
    pain: 'pet owners searching for a groomer',
  },
  florist: {
    label: 'Florist', plural: 'florists', osm: ['shop=florist'], color: '#d81b60',
    services: ['Bouquets', 'Same-Day Delivery', 'Weddings', 'Events', 'Sympathy Flowers', 'Custom Arrangements'],
    pain: 'people ordering flowers on their phone',
  },
  fitness: {
    label: 'Fitness', plural: 'gyms', osm: ['leisure=fitness_centre'], color: '#e65100',
    services: ['Memberships', 'Personal Training', 'Group Classes', 'Strength Training', 'Cardio', 'Free First Visit'],
    pain: 'people searching for a gym nearby',
  },
  'tire-shop': {
    label: 'Tires', plural: 'tire shops', osm: ['shop=tyres'], color: '#37474f',
    services: ['New Tires', 'Used Tires', 'Flat Repair', 'Rotation & Balance', 'Alignment', 'Roadside Help'],
    pain: 'drivers with a flat searching on their phone',
  },
  'body-shop': {
    label: 'Collision & Body Repair', plural: 'body shops', osm: ['shop=car_repair'], color: '#ad1457',
    services: ['Collision Repair', 'Dent Repair', 'Paint', 'Insurance Claims', 'Bumper Repair', 'Free Estimates'],
    pain: 'drivers after an accident searching on their phone',
    skipInAll: true, // same OSM tag as auto-repair
  },
  accountant: {
    label: 'Accounting & Tax', plural: 'accountants', osm: ['office=accountant', 'office=tax_advisor'], color: '#00695c',
    services: ['Tax Preparation', 'Bookkeeping', 'Payroll', 'Small Business Accounting', 'IRS Help', 'Free Consultation'],
    pain: 'small business owners looking for an accountant',
  },
  lawyer: {
    label: 'Legal', plural: 'law offices', osm: ['office=lawyer'], color: '#3e2723',
    services: ['Free Consultation', 'Personal Injury', 'Family Law', 'Criminal Defense', 'Estate Planning', 'Business Law'],
    pain: 'people searching for a lawyer on their phone',
  },
  insurance: {
    label: 'Insurance', plural: 'insurance agencies', osm: ['office=insurance'], color: '#1565c0',
    services: ['Auto Insurance', 'Home Insurance', 'Business Insurance', 'Life Insurance', 'Free Quotes', 'Policy Reviews'],
    pain: 'people comparing insurance agents online',
  },
  restaurant: {
    label: 'Restaurant', plural: 'restaurants', osm: ['amenity=restaurant'], color: '#bf360c',
    services: ['Dine-In', 'Takeout', 'Catering', 'Daily Specials', 'Private Events', 'Call Ahead'],
    pain: 'hungry people searching on their phone',
  },
};

// Niches included by `--niche all`.
export const ALL_NICHES = Object.keys(NICHES).filter((k) => !NICHES[k].skipInAll);

export function getNiche(key) {
  const n = NICHES[key];
  if (!n) {
    console.error(`Unknown niche "${key}". Options: ${Object.keys(NICHES).join(', ')}`);
    process.exit(1);
  }
  return n;
}
