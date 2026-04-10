import { defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'vereinName', title: 'Verein Name', type: 'string', initialValue: 'Wild Care — Wilde Fürsorge' },
    { name: 'address', title: 'Address', type: 'text', rows: 3 },
    { name: 'email', title: 'Email', type: 'string' },
    { name: 'phone', title: 'Phone', type: 'string' },
    { name: 'zvrZahl', title: 'ZVR-Zahl', type: 'string', description: 'Austrian association registration number' },
    {
      name: 'socialLinks', title: 'Social Links', type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'platform', title: 'Platform', type: 'string', options: { list: ['instagram', 'facebook', 'youtube', 'tiktok', 'linkedin'] } },
          { name: 'url', title: 'URL', type: 'url' },
        ],
        preview: { select: { title: 'platform', subtitle: 'url' } },
      }],
    },
    { name: 'defaultOgImage', title: 'Default Social Image', type: 'image', description: 'Fallback image for social media sharing.' },
    { name: 'copyrightYear', title: 'Copyright Year', type: 'number', initialValue: 2026 },
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
});
