import { defineType } from 'sanity';

const sectionBlocks = [
  { type: 'heroImage' }, { type: 'richText' }, { type: 'contactInfo' },
  { type: 'embedForm' }, { type: 'mapEmbed' }, { type: 'htmlEmbed' }, { type: 'ctaBanner' },
];

export const kontakt = defineType({
  name: 'kontakt',
  title: 'Kontakt',
  type: 'document',
  fields: [
    { name: 'sections', title: 'Page Sections', type: 'array', of: sectionBlocks },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: { prepare: () => ({ title: 'Kontakt' }) },
});
