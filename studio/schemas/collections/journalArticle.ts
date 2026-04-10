import { defineType } from 'sanity';

export const journalArticle = defineType({
  name: 'journalArticle',
  title: 'Journal Article',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'localeString', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title.de', maxLength: 96 } },
    { name: 'publishedAt', title: 'Published At', type: 'datetime' },
    {
      name: 'status', title: 'Status', type: 'string',
      options: { list: [
        { title: 'Draft', value: 'draft' },
        { title: 'Scheduled', value: 'scheduled' },
        { title: 'Published', value: 'published' },
      ]},
      initialValue: 'draft',
    },
    {
      name: 'image', title: 'Cover Image', type: 'image',
      options: { hotspot: true },
      description: 'Please upload landscape images, min 1200px wide, max 1MB.',
      fields: [{ name: 'alt', title: 'Alt Text', type: 'string', validation: (Rule) => Rule.required() }],
    },
    { name: 'excerpt', title: 'Excerpt', type: 'localeText', description: 'Short summary. Max 200 chars.' },
    { name: 'body', title: 'Body', type: 'localePortableText' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    select: { title: 'title.de', status: 'status', date: 'publishedAt', media: 'image' },
    prepare: ({ title, status, date, media }) => ({
      title: title || 'Untitled Article',
      subtitle: `${status || 'draft'} — ${date ? new Date(date).toLocaleDateString('de-AT') : 'No date'}`,
      media,
    }),
  },
  orderings: [
    { title: 'Published (Newest)', name: 'dateDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
});
