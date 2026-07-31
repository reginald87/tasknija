// Nigerian reference location data (Country > State > LGA > City).
// Seeded by prisma/seed.js so the location endpoints are DB-driven rather than
// derived from business records at request time.
//
// Each state entry:
//   lgas   — the official local government areas for the state (774 total).
//   cities — major cities with their primary LGA and approximate coordinates
//            (used by /api/locations/nearest-city).

export const NIGERIA_COUNTRY = {
  name: 'Nigeria',
  slug: 'nigeria',
  code: 'NG',
};

export const NIGERIA_STATES = [
  {
    name: 'Abia',
    lgas: ['Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano', 'Isiala Ngwa North', 'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa', 'Ohafia', 'Osisioma', 'Ngwa North', 'Ngwa South', 'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South'],
    cities: [
      { name: 'Aba', lga: 'Aba South', lat: 5.1066, lng: 7.3667 },
      { name: 'Umuahia', lga: 'Umuahia North', lat: 5.5249, lng: 7.5272 },
    ],
  },
  {
    name: 'Adamawa',
    lgas: ['Demsa', 'Fufore', 'Ganye', 'Gayuk', 'Gombi', 'Grie', 'Hong', 'Jada', 'Lamurde', 'Madagali', 'Maiha', 'Mayo Belwa', 'Michika', 'Mubi North', 'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South'],
    cities: [
      { name: 'Yola', lga: 'Yola North', lat: 9.2035, lng: 12.4954 },
      { name: 'Jimeta', lga: 'Yola South', lat: 9.2792, lng: 12.4580 },
      { name: 'Mubi', lga: 'Mubi North', lat: 10.2696, lng: 13.2670 },
      { name: 'Numan', lga: 'Numan', lat: 9.4674, lng: 12.0307 },
    ],
  },
  {
    name: 'Akwa Ibom',
    lgas: ['Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo', 'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono-Ibom', 'Ika', 'Ikono', 'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat-Enin', 'Nsit-Atai', 'Nsit-Ibom', 'Nsit-Ubium', 'Obot-Akara', 'Okobo', 'Onna', 'Oron', 'Oruk Anam', 'Udung-Uko', 'Ukanafun', 'Uruan', 'Urue-Offong/Oruko', 'Uyo'],
    cities: [
      { name: 'Uyo', lga: 'Uyo', lat: 5.0333, lng: 7.9167 },
      { name: 'Ikot Ekpene', lga: 'Ikot Ekpene', lat: 5.1800, lng: 7.7100 },
      { name: 'Eket', lga: 'Eket', lat: 4.6500, lng: 7.9300 },
      { name: 'Oron', lga: 'Oron', lat: 4.8156, lng: 8.2346 },
    ],
  },
  {
    name: 'Anambra',
    lgas: ['Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North', 'Awka South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North', 'Idemili South', 'Ihiala', 'Njikoka', 'Nnewi North', 'Nnewi South', 'Ogbaru', 'Onitsha North', 'Onitsha South', 'Orumba North', 'Orumba South', 'Oyi'],
    cities: [
      { name: 'Awka', lga: 'Awka South', lat: 6.2100, lng: 7.0700 },
      { name: 'Onitsha', lga: 'Onitsha North', lat: 6.1667, lng: 6.7833 },
      { name: 'Nnewi', lga: 'Nnewi North', lat: 6.0167, lng: 6.9167 },
    ],
  },
  {
    name: 'Bauchi',
    lgas: ['Alkaleri', 'Bauchi', 'Bogoro', 'Damban', 'Darazo', 'Dass', 'Gamawa', 'Ganjuwa', 'Giade', 'Itas/Gadau', "Jama'are", 'Katagum', 'Kirfi', 'Misau', 'Ningi', 'Shira', 'Tafawa Balewa', 'Toro', 'Warji', 'Zaki'],
    cities: [
      { name: 'Bauchi', lga: 'Bauchi', lat: 10.3103, lng: 9.8439 },
      { name: 'Azare', lga: 'Katagum', lat: 11.6740, lng: 10.1955 },
      { name: 'Misau', lga: 'Misau', lat: 11.3139, lng: 10.4666 },
    ],
  },
  {
    name: 'Bayelsa',
    lgas: ['Brass', 'Ekeremor', 'Kolokuma/Opokuma', 'Nembe', 'Ogbia', 'Sagbama', 'Southern Ijaw', 'Yenagoa'],
    cities: [
      { name: 'Yenagoa', lga: 'Yenagoa', lat: 4.9247, lng: 6.2643 },
      { name: 'Brass', lga: 'Brass', lat: 4.3123, lng: 6.2410 },
      { name: 'Sagbama', lga: 'Sagbama', lat: 5.0167, lng: 6.0833 },
    ],
  },
  {
    name: 'Benue',
    lgas: ['Ado', 'Agatu', 'Apa', 'Buruku', 'Gboko', 'Guma', 'Gwer East', 'Gwer West', 'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi', 'Obi', 'Ogbadibo', 'Ohimini', 'Oju', 'Okpokwu', 'Otukpo', 'Tarka', 'Ukum', 'Ushongo', 'Vandeikya'],
    cities: [
      { name: 'Makurdi', lga: 'Makurdi', lat: 7.7337, lng: 8.5214 },
      { name: 'Gboko', lga: 'Gboko', lat: 7.3264, lng: 9.0067 },
      { name: 'Otukpo', lga: 'Otukpo', lat: 7.1916, lng: 8.1386 },
      { name: 'Katsina-Ala', lga: 'Katsina-Ala', lat: 7.1700, lng: 9.2800 },
    ],
  },
  {
    name: 'Borno',
    lgas: ['Abadam', 'Askira/Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa', 'Dikwa', 'Gubio', 'Guzamala', 'Gwoza', 'Hawul', 'Jere', 'Kaga', 'Kala/Balge', 'Konduga', 'Kukawa', 'Kwaya Kusar', 'Mafa', 'Magumeri', 'Maiduguri', 'Marte', 'Mobbar', 'Monguno', 'Ngala', 'Nganzai', 'Shani'],
    cities: [
      { name: 'Maiduguri', lga: 'Maiduguri', lat: 11.8311, lng: 13.1511 },
      { name: 'Biu', lga: 'Biu', lat: 10.6120, lng: 12.1952 },
      { name: 'Bama', lga: 'Bama', lat: 11.5183, lng: 13.6836 },
    ],
  },
  {
    name: 'Cross River',
    lgas: ['Abi', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki', 'Calabar Municipal', 'Calabar South', 'Etung', 'Ikom', 'Obanliku', 'Obubra', 'Obudu', 'Odukpani', 'Ogoja', 'Yakurr', 'Yala'],
    cities: [
      { name: 'Calabar', lga: 'Calabar Municipal', lat: 4.9757, lng: 8.3417 },
      { name: 'Ikom', lga: 'Ikom', lat: 5.9667, lng: 8.7167 },
      { name: 'Ogoja', lga: 'Ogoja', lat: 6.6540, lng: 8.7970 },
      { name: 'Obudu', lga: 'Obudu', lat: 6.6667, lng: 9.1667 },
    ],
  },
  {
    name: 'Delta',
    lgas: ['Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East', 'Ethiope West', 'Ika North East', 'Ika South', 'Isoko North', 'Isoko South', 'Ndokwa East', 'Ndokwa West', 'Okpe', 'Oshimili North', 'Oshimili South', 'Patani', 'Sapele', 'Udu', 'Ughelli North', 'Ughelli South', 'Ukwuani', 'Uvwie', 'Warri North', 'Warri South', 'Warri South West'],
    cities: [
      { name: 'Asaba', lga: 'Oshimili South', lat: 6.1984, lng: 6.7334 },
      { name: 'Warri', lga: 'Warri South', lat: 5.5174, lng: 5.7506 },
      { name: 'Sapele', lga: 'Sapele', lat: 5.9000, lng: 5.6833 },
      { name: 'Ughelli', lga: 'Ughelli North', lat: 5.4996, lng: 6.0142 },
      { name: 'Agbor', lga: 'Ika South', lat: 6.2525, lng: 6.2000 },
    ],
  },
  {
    name: 'Ebonyi',
    lgas: ['Abakaliki', 'Afikpo North', 'Afikpo South', 'Ebonyi', 'Ezza North', 'Ezza South', 'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohaozara', 'Ohaukwu', 'Onicha'],
    cities: [
      { name: 'Abakaliki', lga: 'Abakaliki', lat: 6.3230, lng: 8.1138 },
      { name: 'Afikpo', lga: 'Afikpo North', lat: 5.8925, lng: 7.9353 },
    ],
  },
  {
    name: 'Edo',
    lgas: ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba-Okha', 'Oredo', 'Orhionmwon', 'Ovia North-East', 'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde'],
    cities: [
      { name: 'Benin City', lga: 'Egor', lat: 6.3350, lng: 5.6037 },
      { name: 'Auchi', lga: 'Etsako West', lat: 7.0667, lng: 6.2667 },
      { name: 'Uromi', lga: 'Esan North-East', lat: 6.7000, lng: 6.3333 },
      { name: 'Ekpoma', lga: 'Esan West', lat: 6.7500, lng: 6.1333 },
    ],
  },
  {
    name: 'Ekiti',
    lgas: ['Ado Ekiti', 'Efon', 'Ekiti East', 'Ekiti South-West', 'Ekiti West', 'Emure', 'Gbonyin', 'Ido Osi', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje', 'Irepodun/Ifelodun', 'Ise/Orun', 'Moba', 'Oye'],
    cities: [
      { name: 'Ado-Ekiti', lga: 'Ado Ekiti', lat: 7.6211, lng: 5.2214 },
      { name: 'Ikere-Ekiti', lga: 'Ikere', lat: 7.5000, lng: 5.2333 },
      { name: 'Ijero-Ekiti', lga: 'Ijero', lat: 7.8167, lng: 5.0833 },
    ],
  },
  {
    name: 'Enugu',
    lgas: ['Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu', 'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo', 'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi', 'Uzo-Uwani'],
    cities: [
      { name: 'Enugu', lga: 'Enugu North', lat: 6.5244, lng: 7.5186 },
      { name: 'Nsukka', lga: 'Nsukka', lat: 6.8580, lng: 7.3925 },
      { name: 'Awgu', lga: 'Awgu', lat: 6.0744, lng: 7.4769 },
      { name: 'Udi', lga: 'Udi', lat: 6.3159, lng: 7.4206 },
    ],
  },
  {
    name: 'Gombe',
    lgas: ['Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo', 'Kwami', 'Nafada', 'Shongom', 'Yamaltu/Deba'],
    cities: [
      { name: 'Gombe', lga: 'Gombe', lat: 10.2897, lng: 11.1673 },
      { name: 'Kaltungo', lga: 'Kaltungo', lat: 10.0167, lng: 11.3000 },
      { name: 'Billiri', lga: 'Billiri', lat: 9.8657, lng: 11.2221 },
    ],
  },
  {
    name: 'Imo',
    lgas: ['Aboh Mbaise', 'Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte Mbaise', 'Ideato North', 'Ideato South', 'Ihitte/Uboma', 'Ikeduru', 'Isiala Mbano', 'Isu', 'Mbaitoli', 'Ngor Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Onuimo', 'Orlu', 'Orsu', 'Oru East', 'Oru West', 'Owerri Municipal', 'Owerri North', 'Owerri West'],
    cities: [
      { name: 'Owerri', lga: 'Owerri Municipal', lat: 5.4833, lng: 7.0333 },
      { name: 'Orlu', lga: 'Orlu', lat: 5.7954, lng: 7.0350 },
      { name: 'Okigwe', lga: 'Okigwe', lat: 5.8333, lng: 7.3500 },
    ],
  },
  {
    name: 'Jigawa',
    lgas: ['Auyo', 'Babura', 'Biriniwa', 'Birnin Kudu', 'Buji', 'Dutse', 'Gagarawa', 'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia', 'Jahun', 'Kafin Hausa', 'Kaugama', 'Kazaure', 'Kiri Kasama', 'Kiyawa', 'Maigatari', 'Malam Madori', 'Miga', 'Ringim', 'Roni', 'Sule Tankarkar', 'Taura', 'Yankwashi'],
    cities: [
      { name: 'Dutse', lga: 'Dutse', lat: 11.7000, lng: 9.3500 },
      { name: 'Hadejia', lga: 'Hadejia', lat: 12.4489, lng: 10.0412 },
      { name: 'Gumel', lga: 'Gumel', lat: 12.6323, lng: 9.3912 },
      { name: 'Kazaure', lga: 'Kazaure', lat: 12.6463, lng: 8.4171 },
    ],
  },
  {
    name: 'Kaduna',
    lgas: ['Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', "Jema'a", 'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga', 'Soba', 'Zangon Kataf', 'Zaria'],
    cities: [
      { name: 'Kaduna', lga: 'Kaduna North', lat: 10.5105, lng: 7.4165 },
      { name: 'Zaria', lga: 'Zaria', lat: 11.1112, lng: 7.7227 },
      { name: 'Kafanchan', lga: "Jema'a", lat: 9.5817, lng: 8.2910 },
    ],
  },
  {
    name: 'Kano',
    lgas: ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'],
    cities: [
      { name: 'Kano', lga: 'Kano Municipal', lat: 12.0022, lng: 8.5920 },
      { name: 'Wudil', lga: 'Wudil', lat: 11.8034, lng: 8.8490 },
      { name: 'Rano', lga: 'Rano', lat: 11.5569, lng: 8.5827 },
      { name: 'Bichi', lga: 'Bichi', lat: 12.2333, lng: 8.2333 },
    ],
  },
  {
    name: 'Katsina',
    lgas: ['Bakori', 'Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi', 'Dan Musa', 'Dandume', 'Danja', 'Daura', 'Dutsi', 'Dutsin Ma', 'Faskari', 'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia', 'Katsina', 'Kurfi', 'Kusada', "Mai'Adua", 'Malumfashi', 'Mani', 'Mashi', 'Matazu', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango'],
    cities: [
      { name: 'Katsina', lga: 'Katsina', lat: 12.9908, lng: 7.6008 },
      { name: 'Daura', lga: 'Daura', lat: 13.0333, lng: 8.3167 },
      { name: 'Funtua', lga: 'Funtua', lat: 11.5235, lng: 7.3117 },
      { name: 'Malumfashi', lga: 'Malumfashi', lat: 11.7833, lng: 7.6167 },
    ],
  },
  {
    name: 'Kebbi',
    lgas: ['Aleiro', 'Arewa Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin Kebbi', 'Bunza', 'Dandi', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse', 'Maiyama', 'Ngaski', 'Sakaba', 'Shanga', 'Suru', 'Wasagu/Danko', 'Yauri', 'Zuru'],
    cities: [
      { name: 'Birnin Kebbi', lga: 'Birnin Kebbi', lat: 12.4539, lng: 4.1975 },
      { name: 'Argungu', lga: 'Argungu', lat: 12.7448, lng: 4.5274 },
      { name: 'Yauri', lga: 'Yauri', lat: 10.7167, lng: 4.8167 },
    ],
  },
  {
    name: 'Kogi',
    lgas: ['Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela Odolu', 'Ijumu', 'Kabba/Bunu', 'Kogi', 'Lokoja', 'Mopa Muro', 'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala', 'Yagba East', 'Yagba West'],
    cities: [
      { name: 'Lokoja', lga: 'Lokoja', lat: 7.8022, lng: 6.7397 },
      { name: 'Okene', lga: 'Okene', lat: 7.5500, lng: 6.2333 },
      { name: 'Idah', lga: 'Idah', lat: 7.1134, lng: 6.7383 },
      { name: 'Kabba', lga: 'Kabba/Bunu', lat: 7.8293, lng: 6.0752 },
    ],
  },
  {
    name: 'Kwara',
    lgas: ['Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin East', 'Ilorin South', 'Ilorin West', 'Irepodun', 'Isin', 'Kaiama', 'Moro', 'Offa', 'Oke Ero', 'Oyun', 'Pategi'],
    cities: [
      { name: 'Ilorin', lga: 'Ilorin West', lat: 8.4966, lng: 4.5421 },
      { name: 'Offa', lga: 'Offa', lat: 8.1489, lng: 4.7208 },
      { name: 'Pategi', lga: 'Pategi', lat: 8.7177, lng: 5.7686 },
      { name: 'Lafiagi', lga: 'Edu', lat: 8.8687, lng: 5.4066 },
    ],
  },
  {
    name: 'Lagos',
    lgas: ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
    cities: [
      { name: 'Lagos', lga: 'Lagos Mainland', lat: 6.5244, lng: 3.3792 },
      { name: 'Ikeja', lga: 'Ikeja', lat: 6.6018, lng: 3.3515 },
      { name: 'Epe', lga: 'Epe', lat: 6.5842, lng: 3.9834 },
      { name: 'Badagry', lga: 'Badagry', lat: 6.4150, lng: 2.8850 },
      { name: 'Ikorodu', lga: 'Ikorodu', lat: 6.6152, lng: 3.5054 },
      { name: 'Surulere', lga: 'Surulere', lat: 6.5000, lng: 3.3500 },
    ],
  },
  {
    name: 'Nasarawa',
    lgas: ['Akwanga', 'Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia', 'Nasarawa', 'Nasarawa Egon', 'Obi', 'Toto', 'Wamba'],
    cities: [
      { name: 'Lafia', lga: 'Lafia', lat: 8.4932, lng: 8.5154 },
      { name: 'Keffi', lga: 'Keffi', lat: 8.8456, lng: 7.8719 },
      { name: 'Nasarawa', lga: 'Nasarawa', lat: 8.5387, lng: 7.7083 },
      { name: 'Akwanga', lga: 'Akwanga', lat: 8.9167, lng: 8.4000 },
    ],
  },
  {
    name: 'Niger',
    lgas: ['Agaie', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati', 'Gbako', 'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama', 'Mariga', 'Mashegu', 'Mokwa', 'Munya', 'Paikoro', 'Rafi', 'Rijau', 'Shiroro', 'Suleja', 'Tafa', 'Wushishi'],
    cities: [
      { name: 'Minna', lga: 'Chanchaga', lat: 9.6135, lng: 6.5569 },
      { name: 'Bida', lga: 'Bida', lat: 9.0808, lng: 6.0099 },
      { name: 'Suleja', lga: 'Suleja', lat: 9.1806, lng: 7.1798 },
      { name: 'Kontagora', lga: 'Kontagora', lat: 10.4000, lng: 5.4667 },
    ],
  },
  {
    name: 'Ogun',
    lgas: ['Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Ewekoro', 'Ifo', 'Ijebu East', 'Ijebu North', 'Ijebu North East', 'Ijebu Ode', 'Ikenne', 'Imeko Afon', 'Ipokia', 'Obafemi Owode', 'Odeda', 'Odogbolu', 'Ogun Waterside', 'Remo North', 'Sagamu', 'Yewa North', 'Yewa South'],
    cities: [
      { name: 'Abeokuta', lga: 'Abeokuta South', lat: 7.1557, lng: 3.3451 },
      { name: 'Sagamu', lga: 'Sagamu', lat: 6.8458, lng: 3.6501 },
      { name: 'Ijebu-Ode', lga: 'Ijebu Ode', lat: 6.8195, lng: 3.9175 },
      { name: 'Otta', lga: 'Ado-Odo/Ota', lat: 6.7000, lng: 3.2333 },
    ],
  },
  {
    name: 'Ondo',
    lgas: ['Akoko North-East', 'Akoko North-West', 'Akoko South-East', 'Akoko South-West', 'Akure North', 'Akure South', 'Ese Odo', 'Idanre', 'Ifedore', 'Ilaje', 'Ile Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa', 'Ondo East', 'Ondo West', 'Ose', 'Owo'],
    cities: [
      { name: 'Akure', lga: 'Akure South', lat: 7.2571, lng: 5.2058 },
      { name: 'Ondo', lga: 'Ondo West', lat: 7.0833, lng: 4.8333 },
      { name: 'Owo', lga: 'Owo', lat: 7.1978, lng: 5.5887 },
      { name: 'Okitipupa', lga: 'Okitipupa', lat: 6.5054, lng: 4.7796 },
    ],
  },
  {
    name: 'Osun',
    lgas: ['Aiyedade', 'Aiyedire', 'Atakumosa East', 'Atakumosa West', 'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Egbedore', 'Ejigbo', 'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ifedayo', 'Ifelodun', 'Ila', 'Ilesa East', 'Ilesa West', 'Irepodun', 'Irewole', 'Isokan', 'Iwo', 'Obokun', 'Odo Otin', 'Ola Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo'],
    cities: [
      { name: 'Osogbo', lga: 'Osogbo', lat: 7.7667, lng: 4.5667 },
      { name: 'Ile-Ife', lga: 'Ife Central', lat: 7.4800, lng: 4.5600 },
      { name: 'Ilesa', lga: 'Ilesa West', lat: 7.6167, lng: 4.7333 },
      { name: 'Iwo', lga: 'Iwo', lat: 7.6333, lng: 4.1833 },
      { name: 'Ede', lga: 'Ede North', lat: 7.7333, lng: 4.4333 },
    ],
  },
  {
    name: 'Oyo',
    lgas: ['Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomosho North', 'Ogbomosho South', 'Ogo Oluwa', 'Olorunsogo', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo East', 'Oyo West', 'Saki East', 'Saki West', 'Surulere'],
    cities: [
      { name: 'Ibadan', lga: 'Ibadan North', lat: 7.3775, lng: 3.9470 },
      { name: 'Ogbomosho', lga: 'Ogbomosho North', lat: 8.1337, lng: 4.2400 },
      { name: 'Oyo', lga: 'Oyo West', lat: 7.8526, lng: 3.9312 },
      { name: 'Iseyin', lga: 'Iseyin', lat: 7.9833, lng: 3.5833 },
      { name: 'Saki', lga: 'Saki West', lat: 8.6667, lng: 3.4000 },
    ],
  },
  {
    name: 'Plateau',
    lgas: ['Barkin Ladi', 'Bassa', 'Bokkos', 'Jos East', 'Jos North', 'Jos South', 'Kanam', 'Kanke', 'Langtang North', 'Langtang South', 'Mangu', 'Mikang', 'Pankshin', "Qua'an Pan", 'Riyom', 'Shendam', 'Wase'],
    cities: [
      { name: 'Jos', lga: 'Jos North', lat: 9.8965, lng: 8.8583 },
      { name: 'Pankshin', lga: 'Pankshin', lat: 9.3333, lng: 9.4500 },
      { name: 'Shendam', lga: 'Shendam', lat: 8.8833, lng: 9.5333 },
      { name: 'Langtang', lga: 'Langtang North', lat: 9.1333, lng: 9.7833 },
    ],
  },
  {
    name: 'Rivers',
    lgas: ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai'],
    cities: [
      { name: 'Port Harcourt', lga: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
      { name: 'Bonny', lga: 'Bonny', lat: 4.4256, lng: 7.1676 },
      { name: 'Ahoada', lga: 'Ahoada East', lat: 5.0833, lng: 6.6500 },
      { name: 'Okrika', lga: 'Okrika', lat: 4.7398, lng: 7.0883 },
    ],
  },
  {
    name: 'Sokoto',
    lgas: ['Binji', 'Bodinga', 'Dange Shuni', 'Gada', 'Goronyo', 'Gudu', 'Gwadabawa', 'Illela', 'Isa', 'Kebbe', 'Kware', 'Rabah', 'Sabon Birni', 'Shagari', 'Silame', 'Sokoto North', 'Sokoto South', 'Tambuwal', 'Tangaza', 'Tureta', 'Wamako', 'Wurno', 'Yabo'],
    cities: [
      { name: 'Sokoto', lga: 'Sokoto North', lat: 13.0622, lng: 5.2333 },
      { name: 'Tambuwal', lga: 'Tambuwal', lat: 12.4055, lng: 4.6608 },
      { name: 'Gwadabawa', lga: 'Gwadabawa', lat: 13.3578, lng: 5.2358 },
    ],
  },
  {
    name: 'Taraba',
    lgas: ['Ardo Kola', 'Bali', 'Donga', 'Gashaka', 'Gassol', 'Ibi', 'Jalingo', 'Karim Lamido', 'Kumi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari', 'Yorro', 'Zing'],
    cities: [
      { name: 'Jalingo', lga: 'Jalingo', lat: 8.8816, lng: 11.3735 },
      { name: 'Wukari', lga: 'Wukari', lat: 7.8628, lng: 9.7794 },
      { name: 'Gembu', lga: 'Sardauna', lat: 6.7053, lng: 11.2605 },
      { name: 'Bali', lga: 'Bali', lat: 7.8500, lng: 10.0167 },
    ],
  },
  {
    name: 'Yobe',
    lgas: ['Bade', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba', 'Gulani', 'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru', 'Potiskum', 'Tarmuwa', 'Yunusari', 'Yusufari'],
    cities: [
      { name: 'Damaturu', lga: 'Damaturu', lat: 11.7449, lng: 11.9650 },
      { name: 'Potiskum', lga: 'Potiskum', lat: 11.7129, lng: 11.0791 },
      { name: 'Gashua', lga: 'Bade', lat: 12.8747, lng: 11.0333 },
    ],
  },
  {
    name: 'Zamfara',
    lgas: ['Anka', 'Bakura', 'Birnin Magaji/Kiyaw', 'Bukkuyum', 'Bungudu', 'Gummi', 'Gusau', 'Kaura Namoda', 'Maradun', 'Maru', 'Shinkafi', 'Talata Mafara', 'Tsafe', 'Zurmi'],
    cities: [
      { name: 'Gusau', lga: 'Gusau', lat: 12.1630, lng: 6.6618 },
      { name: 'Kaura Namoda', lga: 'Kaura Namoda', lat: 12.5833, lng: 6.6000 },
      { name: 'Gummi', lga: 'Gummi', lat: 12.1309, lng: 5.1208 },
    ],
  },
  {
    name: 'Federal Capital Territory',
    lgas: ['Abaji', 'Abuja Municipal', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali'],
    cities: [
      { name: 'Abuja', lga: 'Abuja Municipal', lat: 9.0765, lng: 7.3986 },
      { name: 'Gwagwalada', lga: 'Gwagwalada', lat: 8.9407, lng: 7.0984 },
      { name: 'Kuje', lga: 'Kuje', lat: 8.8789, lng: 7.2319 },
      { name: 'Bwari', lga: 'Bwari', lat: 9.2806, lng: 7.3966 },
    ],
  },
];
