import { defineType } from 'sanity';

export const testimonials = defineType({
  name: 'testimonials',
  title: 'Testimonials',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Section Heading', type: 'localeString' },
    { name: 'eyebrow', title: 'Eyebrow Label', type: 'localeString' },
    {
      name: 'items', title: 'Testimonials', type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'quote', title: 'Quote', type: 'localeText' },
          { name: 'author', title: 'Author', type: 'string' },
        ],
        preview: { select: { title: 'author', subtitle: 'quote.de' } },
      }],
    },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'Testimonials', subtitle: 'Testimonial Grid' }),
  },
});
