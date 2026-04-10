import { defineType } from 'sanity';

export const valueCards = defineType({
  name: 'valueCards',
  title: 'Value Cards',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Section Heading', type: 'localeString' },
    { name: 'eyebrow', title: 'Eyebrow Label', type: 'localeString' },
    {
      name: 'cards', title: 'Cards', type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'icon', title: 'Icon (SVG)', type: 'text', description: 'Paste inline SVG code' },
          { name: 'title', title: 'Title', type: 'localeString' },
          { name: 'description', title: 'Description', type: 'localeText' },
        ],
        preview: { select: { title: 'title.de' } },
      }],
    },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'Value Cards', subtitle: 'Card Grid' }),
  },
});
