import { defineType } from 'sanity';

export const htmlEmbed = defineType({
  name: 'htmlEmbed',
  title: 'HTML Embed',
  type: 'object',
  fields: [
    { name: 'code', title: 'Embed Code', type: 'text', rows: 6, description: 'Paste iframe or embed code from trusted sources only.' },
    { name: 'caption', title: 'Caption', type: 'localeString' },
  ],
  preview: { prepare: () => ({ title: 'HTML Embed' }) },
});
