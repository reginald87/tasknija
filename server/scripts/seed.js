import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '..', '.env') });

const mockVendors = [
  {
    email: 'obi_plumbing@tasknija.com',
    password: 'password123',
    fullName: 'Gabriel Obi',
    phone: '+2348011223344',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop',
  },
  {
    email: 'okafor_painting@tasknija.com',
    password: 'password123',
    fullName: 'Chinedu Okafor',
    phone: '+2348022334455',
    avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop',
  },
  {
    email: 'bello_cleaning@tasknija.com',
    password: 'password123',
    fullName: 'Fatima Bello',
    phone: '+2348033445566',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop',
  },
  {
    email: 'soyinka_autos@tasknija.com',
    password: 'password123',
    fullName: 'Babajide Soyinka',
    phone: '+2348044556677',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop',
  },
  {
    email: 'nwachukwu_tutor@tasknija.com',
    password: 'password123',
    fullName: 'Dr. Chioma Nwachukwu',
    phone: '+2348055667788',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
  }
];

const businesses = [
  {
    owner_email: 'obi_plumbing@tasknija.com',
    category_slug: 'plumbing',
    name: 'Obi Express Plumbing Services',
    slug: 'obi-express-plumbing-services',
    description: 'Leaking pipe repairs, bathroom plumbing installations, water pump repairs, and emergency water system services. Fully equipped team, 24/7 emergency service in Ikeja and surroundings.',
    address: '12 Joel Ogunnaike St, Ikeja',
    city: 'Lagos',
    state: 'Lagos State',
    latitude: 6.6018,
    longitude: 3.3515,
    phone: '+2348011223344',
    email: 'plumbing@obi.co',
    website: 'https://obiplumbing.com.ng',
    images: ['https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&auto=format&fit=crop'],
    certifications: ['Licensed Plumbers Association of Nigeria (LPAN)', 'Safety First Certified'],
    is_featured: true,
    is_recommended: true,
    rating_avg: 4.90,
    rating_count: 14
  },
  {
    owner_email: 'okafor_painting@tasknija.com',
    category_slug: 'painting',
    name: 'Colors of Okafor (Premium Painting)',
    slug: 'colors-of-okafor-premium-painting',
    description: 'High-quality interior and exterior painting services for residential houses, commercial complexes, and offices. Wall scraping, priming, damp curing, and decorative textured finishes.',
    address: '45 Chime Avenue, New Haven',
    city: 'Enugu',
    state: 'Enugu State',
    latitude: 6.4418,
    longitude: 7.5027,
    phone: '+2348022334455',
    email: 'info@colorsofokafor.ng',
    website: 'https://colorsofokafor.ng',
    images: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop'],
    certifications: ['Enugu Decorators Guild', 'Dulux Approved Partner'],
    is_featured: false,
    is_recommended: true,
    rating_avg: 4.70,
    rating_count: 8
  },
  {
    owner_email: 'bello_cleaning@tasknija.com',
    category_slug: 'cleaning',
    name: 'Bello Home & Office Sparkle',
    slug: 'bello-home-office-sparkle',
    description: 'Professional deep cleaning services for apartments, duplexes, corporate offices, and warehouses. Post-construction cleanup, upholstery sanitization, and detailed disinfection. Eco-friendly cleaning products.',
    address: 'Aminu Kano Crescent, Wuse II',
    city: 'Abuja',
    state: 'FCT',
    latitude: 9.0765,
    longitude: 7.3986,
    phone: '+2348033445566',
    email: 'clean@bellosparkle.com',
    website: 'https://bellosparkle.com',
    images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop'],
    certifications: ['ISSA Cleaning Standard Certification'],
    is_featured: true,
    is_recommended: true,
    rating_avg: 4.85,
    rating_count: 22
  },
  {
    owner_email: 'soyinka_autos@tasknija.com',
    category_slug: 'mechanic',
    name: 'Soyinka Auto Clinic & Diagnostics',
    slug: 'soyinka-auto-clinic-diagnostics',
    description: 'Advanced diagnostic scanning, engine repairs and overhauls, gearbox repairs, suspension overhaul, and regular car servicing. Experts in Toyota, Honda, Mercedes, and Ford models.',
    address: 'Arapasopo Close, Gbagada Phase 2',
    city: 'Lagos',
    state: 'Lagos State',
    latitude: 6.5244,
    longitude: 3.3792,
    phone: '+2348044556677',
    email: 'care@soyinkaautos.com',
    images: ['https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop'],
    certifications: ['ASE Master Technician Certified', 'Computer Diagnostics Expert'],
    is_featured: true,
    is_recommended: false,
    rating_avg: 4.60,
    rating_count: 19
  },
  {
    owner_email: 'nwachukwu_tutor@tasknija.com',
    category_slug: 'tutoring',
    name: 'Nwachukwu Premium Science Academy',
    slug: 'nwachukwu-premium-science-academy',
    description: 'One-on-one and group tutoring for students preparing for WAEC, JAMB, NECO, IGCSE, and A-Levels. Specializing in Mathematics, Physics, Chemistry, and Biology. Excellent track record of student success.',
    address: 'Garrison Junction, Aba Road',
    city: 'Port Harcourt',
    state: 'Rivers State',
    latitude: 4.8156,
    longitude: 7.0498,
    phone: '+2348055667788',
    email: 'lessons@nwachukwupremium.com',
    images: ['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop'],
    certifications: ['Ph.D. in Chemistry education', 'Teachers Registration Council of Nigeria'],
    is_featured: false,
    is_recommended: true,
    rating_avg: 5.00,
    rating_count: 11
  },
  {
    owner_email: 'obi_plumbing@tasknija.com',
    category_slug: 'electronics-repair',
    name: 'TechGenius Mobile & Laptop Center',
    slug: 'techgenius-mobile-laptop-center',
    description: 'Immediate repairs for iPhones, iPads, MacBooks, Hp/Dell laptops, and other home electronics. Screen replacement, keyboard fixes, power surge repairs, and micro-soldering.',
    address: 'Suite 14, Otigba St, Computer Village, Ikeja',
    city: 'Lagos',
    state: 'Lagos State',
    latitude: 6.6018,
    longitude: 3.3515,
    phone: '+2348011223344',
    email: 'repair@techgenius.com',
    images: ['https://images.unsplash.com/photo-1597740985671-2a8a3b80f02e?w=800&auto=format&fit=crop'],
    certifications: ['Apple Certified Macintosh Technician (ACMT)', 'Certified Electronic Repair Specialist'],
    is_featured: true,
    is_recommended: true,
    rating_avg: 4.80,
    rating_count: 31
  },
  {
    owner_email: 'soyinka_autos@tasknija.com',
    category_slug: 'carpentry',
    name: 'Creative Woodworks & Furniture',
    slug: 'creative-woodworks-furniture',
    description: 'Design and fabrication of modern royal and minimalist beds, sofa sets, TV consoles, modular kitchen cabinets, and corporate office desks. High-durability Nigerian hardwood and imported materials.',
    address: 'Ring Road, Oyo Road Bypass',
    city: 'Ibadan',
    state: 'Oyo State',
    latitude: 7.3775,
    longitude: 3.9470,
    phone: '+2348044556677',
    email: 'wood@creativefurn.ng',
    images: ['https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?w=800&auto=format&fit=crop'],
    certifications: ['Ibadan Carpenters Association (ICA)', 'Master Craftsman Certificate'],
    is_featured: false,
    is_recommended: false,
    rating_avg: 4.50,
    rating_count: 6
  }
];

async function seed() {
  console.log('Starting TaskNija database seed process...');

  // Ensure base categories exist (the businesses below reference these slugs).
  const seedCategories = [
    { slug: 'plumbing', name: 'Plumbing', description: 'Plumbers, water system repairs and installations.' },
    { slug: 'painting', name: 'Painting', description: 'Interior and exterior painting services.' },
    { slug: 'cleaning', name: 'Cleaning', description: 'Home and office cleaning services.' },
    { slug: 'mechanic', name: 'Auto Mechanic', description: 'Vehicle repairs, diagnostics and servicing.' },
    { slug: 'electronics-repair', name: 'Electronics Repair', description: 'Phone, laptop and electronics repairs.' },
    { slug: 'carpentry', name: 'Carpentry', description: 'Furniture and woodwork services.' },
    { slug: 'tutoring', name: 'Tutoring', description: 'Academic and skill tutoring.' },
  ];
  for (const c of seedCategories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }

  const categories = await prisma.category.findMany();
  console.log(`Found ${categories.length} categories.`);
  const catMap = {};
  categories.forEach((cat) => { catMap[cat.slug] = cat.id; });

  const vendorProfiles = [];
  for (const mv of mockVendors) {
    const existing = await prisma.profile.findUnique({ where: { email: mv.email } });

    if (existing) {
      console.log(`User ${mv.email} already exists. Skipping auth creation.`);
      await prisma.profile.update({
        where: { id: existing.id },
        data: { role: 'vendor', phone: mv.phone, avatar_url: mv.avatarUrl, full_name: mv.fullName },
      });
      vendorProfiles.push({ id: existing.id, fullName: mv.fullName, email: mv.email });
      continue;
    }

    const passwordHash = await bcrypt.hash(mv.password, 10);
    const profile = await prisma.profile.create({
      data: {
        email: mv.email,
        full_name: mv.fullName,
        phone: mv.phone,
        avatar_url: mv.avatarUrl,
        role: 'vendor',
        is_verified: true,
        authUser: { create: { email: mv.email, passwordHash } },
      },
    });
    console.log(`Created auth user for ${mv.fullName} with ID: ${profile.id}`);
    vendorProfiles.push({ id: profile.id, fullName: mv.fullName, email: mv.email });
  }

  console.log(`Successfully prepared ${vendorProfiles.length} vendor profiles.`);

  const getOwnerId = (email) => {
    const found = vendorProfiles.find((vp) => vp.email === email);
    return found ? found.id : null;
  };

  for (const b of businesses) {
    const ownerId = getOwnerId(b.owner_email);
    const catId = catMap[b.category_slug];

    if (!ownerId || !catId) {
      console.error(`Skipping business ${b.name}: Owner or Category not found. Owner ID: ${ownerId}, Cat ID: ${catId}`);
      continue;
    }

    const existingBus = await prisma.business.findUnique({ where: { slug: b.slug } });

    if (existingBus) {
      console.log(`Business ${b.name} already exists. Updating properties.`);
      await prisma.business.update({
        where: { id: existingBus.id },
        data: {
          owner_id: ownerId,
          category_id: catId,
          name: b.name,
          description: b.description,
          address: b.address,
          city: b.city,
          state: b.state,
          latitude: b.latitude,
          longitude: b.longitude,
          phone: b.phone,
          email: b.email,
          website: b.website,
          images: JSON.stringify(b.images),
          certifications: JSON.stringify(b.certifications),
          is_featured: b.is_featured,
          is_recommended: b.is_recommended,
          rating_avg: b.rating_avg,
          rating_count: b.rating_count,
        },
      });
    } else {
      await prisma.business.create({
        data: {
          owner_id: ownerId,
          category_id: catId,
          name: b.name,
          slug: b.slug,
          description: b.description,
          address: b.address,
          city: b.city,
          state: b.state,
          latitude: b.latitude,
          longitude: b.longitude,
          phone: b.phone,
          email: b.email,
          website: b.website,
          images: JSON.stringify(b.images),
          certifications: JSON.stringify(b.certifications),
          is_featured: b.is_featured,
          is_recommended: b.is_recommended,
          rating_avg: b.rating_avg,
          rating_count: b.rating_count,
        },
      });
      console.log(`Inserted business ${b.name}`);
    }
  }

  console.log('TaskNija database seeding completed successfully!');
  await prisma.$disconnect();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
