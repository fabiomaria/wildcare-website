import { defineType } from 'sanity';

export const embedForm = defineType({
  name: 'embedForm',
  title: 'Embedded Form',
  type: 'object',
  fields: [
    { name: 'title', title: 'Title', type: 'localeString' },
    { name: 'description', title: 'Description', type: 'localeText' },
    { name: 'embedUrl', title: 'Embed URL', type: 'url', description: 'Tally form URL or similar' },
  ],
  preview: {
    select: { title: 'title.de' },
    prepare: ({ title }) => ({ title: title || 'Embedded Form', subtitle: 'Form Embed' }),
  },
});
