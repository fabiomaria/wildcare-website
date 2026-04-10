import { defineType } from 'sanity';

export const heroImage = defineType({
  name: 'heroImage',
  title: 'Hero (Image)',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'localeString' },
    { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
    { name: 'cta', title: 'CTA Label', type: 'localeString' },
    { name: 'ctaLink', title: 'CTA Link', type: 'string' },
    { name: 'backgroundImage', title: 'Background Image', type: 'image', options: { hotspot: true } },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'Image Hero', subtitle: 'Hero (Image)' }),
  },
});
