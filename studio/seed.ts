import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2026-04-10',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

async function seed() {
  // Site Settings
  await client.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    vereinName: 'Wild Care — Wilde Fürsorge',
    address: 'Fabio Maria Gerhold\nFroschaugasse 7\n8010 Graz\nÖsterreich',
    email: 'hello@wildcare.space',
    socialLinks: [
      { _key: 'ig', platform: 'instagram', url: 'https://instagram.com/wildcare.space' },
    ],
    copyrightYear: 2026,
  });

  // Navigation
  await client.createOrReplace({
    _id: 'navigation',
    _type: 'navigation',
    mainMenu: [
      { _key: 'home', label_de: 'Startseite', label_en: 'Home', href: '/' },
      { _key: 'about', label_de: 'Über uns', label_en: 'About', href: '/team/' },
      { _key: 'prog', label_de: 'Programm', label_en: 'Programme', href: '/programm/' },
      { _key: 'journal', label_de: 'Journal', label_en: 'Journal', href: '/journal/' },
      { _key: 'join', label_de: 'Mitmachen', label_en: 'Get Involved', href: '/mitmachen/' },
      { _key: 'contact', label_de: 'Komm vorbei', label_en: 'Visit Us', href: '/kontakt/' },
    ],
    ctaButton: { label_de: 'Komm vorbei', label_en: 'Visit Us', href: '/kontakt/' },
    showLanguageSwitcher: true,
  });

  // Team Members
  await client.createOrReplace({
    _id: 'member-fabio',
    _type: 'teamMember',
    name: 'Fabio Maria Gerhold',
    role: { de: 'Gründer', en: 'Founder' },
    sortOrder: 1,
  });

  await client.createOrReplace({
    _id: 'member-verena',
    _type: 'teamMember',
    name: 'Verena',
    sortOrder: 2,
  });

  console.log('Seed complete!');
}

seed().catch(console.error);
