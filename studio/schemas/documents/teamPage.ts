import { defineType } from 'sanity';

export const teamPage = defineType({
  name: 'teamPage',
  title: 'Team Page',
  type: 'document',
  fields: [
    {
      name: 'hero', title: 'Hero', type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
        { name: 'image', title: 'Hero Image', type: 'image', options: { hotspot: true } },
      ],
    },
    {
      name: 'philosophy', title: 'Philosophy', type: 'object',
      fields: [
        { name: 'intro', title: 'Intro Text', type: 'localePortableText' },
        {
          name: 'pillars', title: 'Pillar Cards', type: 'array',
          of: [{ type: 'object', fields: [
            { name: 'title', title: 'Title', type: 'localeString' },
            { name: 'description', title: 'Description', type: 'localeText' },
          ], preview: { select: { title: 'title.de' } } }],
        },
      ],
    },
    {
      name: 'manifestBox', title: 'Manifest Quote', type: 'object',
      fields: [{ name: 'quote', title: 'Quote Text', type: 'localeText' }],
    },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: { prepare: () => ({ title: 'Team Page' }) },
});
