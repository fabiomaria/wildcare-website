import { defineType } from 'sanity';

export const quoteBand = defineType({
  name: 'quoteBand',
  title: 'Quote Band',
  type: 'object',
  fields: [
    { name: 'quote', title: 'Quote', type: 'localeText' },
    { name: 'attribution', title: 'Attribution', type: 'localeString' },
  ],
  preview: {
    select: { title: 'quote.de' },
    prepare: ({ title }) => ({ title: title ? `"${title.substring(0, 50)}..."` : 'Quote Band', subtitle: 'Quote' }),
  },
});
