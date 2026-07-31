import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { NIGERIA_COUNTRY, NIGERIA_STATES } from './locationData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnv = path.resolve(__dirname, '..', '..', '.env');
const serverEnv = path.resolve(__dirname, '.env');

if (existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv });
} else {
  dotenv.config();
}

const prisma = new PrismaClient();

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const PROPERTY_FILTERS = {
  filters: [
    { key: 'listing_type', label: 'Listing Type', type: 'select', options: ['sale', 'rent', 'lease'] },
    { key: 'price_range', label: 'Price Range', type: 'range', min_key: 'min_price', max_key: 'max_price' },
    { key: 'condition', label: 'Condition', type: 'select', options: ['new', 'used', 'refurbished'] },
  ],
};

const HOUSE_FILTERS = {
  filters: [
    { key: 'listing_type', label: 'Listing Type', type: 'select', options: ['sale', 'rent', 'lease'] },
    { key: 'price_range', label: 'Price Range', type: 'range', min_key: 'min_price', max_key: 'max_price' },
    { key: 'property_type', label: 'Property Type', type: 'select', options: ['apartment', 'duplex', 'bungalow', 'terraced', 'detached', 'penthouse', 'land', 'commercial'] },
    { key: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['1', '2', '3', '4', '5', '6+'] },
    { key: 'bathrooms', label: 'Bathrooms', type: 'select', options: ['1', '2', '3', '4', '5+'] },
    { key: 'furnished', label: 'Furnished', type: 'boolean' },
    { key: 'condition', label: 'Condition', type: 'select', options: ['new', 'used', 'refurbished'] },
  ],
};

const CAR_FILTERS = {
  filters: [
    { key: 'listing_type', label: 'Listing Type', type: 'select', options: ['sale', 'rent'] },
    { key: 'price_range', label: 'Price Range', type: 'range', min_key: 'min_price', max_key: 'max_price' },
    { key: 'vehicle_type', label: 'Vehicle Type', type: 'select', options: ['sedan', 'suv', 'truck', 'van', 'motorcycle', 'bus', 'convertible', 'coupe', 'hatchback', 'wagon'] },
    { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['petrol', 'diesel', 'electric', 'hybrid'] },
    { key: 'transmission', label: 'Transmission', type: 'select', options: ['automatic', 'manual'] },
    { key: 'condition', label: 'Condition', type: 'select', options: ['new', 'used'] },
    { key: 'mileage_range', label: 'Mileage', type: 'range', min_key: 'min_mileage', max_key: 'max_mileage' },
    { key: 'year_range', label: 'Year', type: 'range', min_key: 'min_year', max_key: 'max_year' },
  ],
};

const RENTAL_FILTERS = {
  filters: [
    { key: 'price_range', label: 'Yearly Rent', type: 'range', min_key: 'min_price', max_key: 'max_price' },
    { key: 'property_type', label: 'Property Type', type: 'select', options: ['apartment', 'duplex', 'bungalow', 'terraced', 'detached', 'room', 'commercial'] },
    { key: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['1', '2', '3', '4', '5+'] },
    { key: 'furnished', label: 'Furnished', type: 'boolean' },
  ],
};

const LAND_FILTERS = {
  filters: [
    { key: 'listing_type', label: 'Listing Type', type: 'select', options: ['sale', 'lease'] },
    { key: 'price_range', label: 'Price Range', type: 'range', min_key: 'min_price', max_key: 'max_price' },
    { key: 'property_type', label: 'Land Type', type: 'select', options: ['residential', 'commercial', 'agricultural', 'industrial'] },
    { key: 'area_range', label: 'Area (sqm)', type: 'range', min_key: 'min_area', max_key: 'max_area' },
  ],
};

async function main() {
  console.log('Seeding categories...');

  // Update existing service categories to have type='service'
  const existingServiceSlugs = [
    'electronics-repair', 'painting', 'tiling', 'plumbing', 'electrical',
    'carpentry', 'cleaning', 'mechanic', 'welding', 'gardening', 'photography', 'tutoring',
  ];

  for (const slug of existingServiceSlugs) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (cat) {
      await prisma.category.update({
        where: { slug },
        data: { type: 'service' },
      });
    }
  }

  // Add or update property categories
  const propertyCategories = [
    {
      name: 'Houses for Sale',
      slug: 'houses-for-sale',
      description: 'Find your dream home — apartments, duplexes, bungalows and more for sale',
      type: 'property',
      filter_config: HOUSE_FILTERS,
    },
    {
      name: 'Houses for Rent',
      slug: 'houses-for-rent',
      description: 'Browse apartments and homes available for rent',
      type: 'rental',
      filter_config: RENTAL_FILTERS,
    },
    {
      name: 'Cars & Vehicles',
      slug: 'cars-vehicles',
      description: 'New and used cars, trucks, SUVs and motorcycles for sale or rent',
      type: 'property',
      filter_config: CAR_FILTERS,
    },
    {
      name: 'Land & Plots',
      slug: 'land-plots',
      description: 'Residential, commercial and agricultural land for sale or lease',
      type: 'property',
      filter_config: LAND_FILTERS,
    },
    {
      name: 'Commercial Property',
      slug: 'commercial-property',
      description: 'Office spaces, shops, warehouses and commercial buildings',
      type: 'property',
      filter_config: PROPERTY_FILTERS,
    },
  ];

  for (const cat of propertyCategories) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      await prisma.category.update({
        where: { slug: cat.slug },
        data: {
          name: cat.name,
          description: cat.description,
          type: cat.type,
          filter_config: JSON.stringify(cat.filter_config),
        },
      });
      console.log(`  Updated: ${cat.slug}`);
    } else {
      await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          type: cat.type,
          filter_config: JSON.stringify(cat.filter_config),
        },
      });
      console.log(`  Created: ${cat.slug}`);
    }
  }

  await seedLocations();

  console.log('Seed complete!');
}

async function seedLocations() {
  console.log('Seeding locations (Country/State/LGA/City)...');

  const country = await prisma.country.upsert({
    where: { slug: NIGERIA_COUNTRY.slug },
    update: { name: NIGERIA_COUNTRY.name, code: NIGERIA_COUNTRY.code },
    create: { ...NIGERIA_COUNTRY },
  });
  console.log(`  Country: ${country.name}`);

  for (const stateData of NIGERIA_STATES) {
    const state = await prisma.state.upsert({
      where: { slug_country_id: { slug: slugify(stateData.name), country_id: country.id } },
      update: { name: stateData.name },
      create: { name: stateData.name, slug: slugify(stateData.name), country_id: country.id },
    });

    const lgaIds = new Map();
    for (const lgaName of stateData.lgas) {
      const lga = await prisma.lga.upsert({
        where: { slug_state_id: { slug: slugify(lgaName), state_id: state.id } },
        update: { name: lgaName },
        create: { name: lgaName, slug: slugify(lgaName), state_id: state.id },
      });
      lgaIds.set(lgaName, lga.id);
    }

    for (const cityData of stateData.cities || []) {
      const lgaId = cityData.lga ? lgaIds.get(cityData.lga) : null;
      await prisma.city.upsert({
        where: { slug_state_id: { slug: slugify(cityData.name), state_id: state.id } },
        update: {
          name: cityData.name,
          lga_id: lgaId,
          latitude: cityData.lat ?? null,
          longitude: cityData.lng ?? null,
        },
        create: {
          name: cityData.name,
          slug: slugify(cityData.name),
          state_id: state.id,
          lga_id: lgaId,
          latitude: cityData.lat ?? null,
          longitude: cityData.lng ?? null,
        },
      });
    }
  }

  const totalLgas = await prisma.lga.count();
  const totalCities = await prisma.city.count();
  console.log(`  States: ${NIGERIA_STATES.length}, LGAs: ${totalLgas}, Cities: ${totalCities}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
