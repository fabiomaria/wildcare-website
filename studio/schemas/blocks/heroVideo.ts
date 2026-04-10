import { defineType } from 'sanity';

export const heroVideo = defineType({
  name: 'heroVideo',
  title: 'Hero (Video)',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'localeString' },
    { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
    { name: 'cta', title: 'CTA Label', type: 'localeString' },
    { name: 'ctaLink', title: 'CTA Link', type: 'string' },
    { name: 'videoUrl', title: 'Video URL', type: 'url', description: 'URL to hosted video file' },
    { name: 'poster', title: 'Poster Image', type: 'image', options: { hotspot: true } },
    { name: 'showScrollHint', title: 'Show Scroll Hint', type: 'boolean', initialValue: true },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'Video Hero', subtitle: 'Hero (Video)' }),
  },
});
