import { defineType } from 'sanity';

export const seoFields = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    { name: 'metaTitle', title: 'Meta Title', type: 'string', description: 'Max 60 characters.', validation: (Rule) => Rule.max(60) },
    { name: 'metaDescription', title: 'Meta Description', type: 'text', rows: 3, description: 'Max 160 characters.', validation: (Rule) => Rule.max(160) },
    { name: 'ogImage', title: 'Social Image', type: 'image', description: 'Image shown when shared on social media.' },
  ],
});
