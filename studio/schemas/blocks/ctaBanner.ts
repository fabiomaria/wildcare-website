import { defineType } from 'sanity';

export const ctaBanner = defineType({
  name: 'ctaBanner',
  title: 'CTA Banner',
  type: 'object',
  fields: [
    { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
    { name: 'heading', title: 'Heading', type: 'localeString' },
    { name: 'description', title: 'Description', type: 'localeText' },
    { name: 'buttonLabel', title: 'Button Label', type: 'localeString' },
    { name: 'buttonLink', title: 'Button Link', type: 'string' },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'CTA Banner', subtitle: 'Call to Action' }),
  },
});
