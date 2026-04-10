import { defineType } from 'sanity';

export const montagskurs = defineType({
  name: 'montagskurs',
  title: 'Montagskurs',
  type: 'document',
  fields: [
    {
      name: 'hero', title: 'Hero Section', type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
        {
          name: 'details', title: 'Detail Rows', type: 'array',
          of: [{ type: 'object', fields: [
            { name: 'icon', title: 'Icon (SVG)', type: 'text' },
            { name: 'label', title: 'Label', type: 'localeString' },
            { name: 'value', title: 'Value', type: 'localeString' },
          ]}],
        },
        { name: 'image', title: 'Hero Image', type: 'image', options: { hotspot: true } },
        { name: 'ctaLabel', title: 'CTA Button Label', type: 'localeString' },
        { name: 'ctaLink', title: 'CTA Link', type: 'string' },
        { name: 'note', title: 'CTA Note', type: 'localeString' },
      ],
    },
    {
      name: 'infoCard', title: 'Info Card', type: 'object',
      fields: [
        { name: 'title', title: 'Title', type: 'localeString' },
        {
          name: 'rows', title: 'Info Rows', type: 'array',
          of: [{ type: 'object', fields: [
            { name: 'icon', title: 'Icon (SVG)', type: 'text' },
            { name: 'label', title: 'Label', type: 'localeString' },
            { name: 'value', title: 'Value', type: 'localeString' },
          ]}],
        },
        { name: 'ctaLabel', title: 'CTA Label', type: 'localeString' },
        { name: 'ctaLink', title: 'CTA Link', type: 'string' },
      ],
    },
    { name: 'description', title: 'Description', type: 'localePortableText' },
    {
      name: 'quote', title: 'Quote', type: 'object',
      fields: [
        { name: 'text', title: 'Quote Text', type: 'localeText' },
        { name: 'attribution', title: 'Attribution', type: 'localeString' },
      ],
    },
    {
      name: 'learnCards', title: 'What You Learn', type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        {
          name: 'cards', title: 'Cards', type: 'array',
          of: [{ type: 'object', fields: [
            { name: 'title', title: 'Title', type: 'localeString' },
            { name: 'body', title: 'Body', type: 'localeText' },
          ]}],
        },
        { name: 'donationNote', title: 'Donation Note', type: 'localeText' },
      ],
    },
    {
      name: 'testimonials', title: 'Testimonials', type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        {
          name: 'items', title: 'Testimonials', type: 'array',
          of: [{ type: 'object', fields: [
            { name: 'quote', title: 'Quote', type: 'localeText' },
            { name: 'author', title: 'Author', type: 'string' },
          ]}],
        },
      ],
    },
    {
      name: 'faqList', title: 'FAQ', type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'question', title: 'Question', type: 'localeString' },
        { name: 'answer', title: 'Answer', type: 'localeText' },
      ], preview: { select: { title: 'question.de' } } }],
    },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: { prepare: () => ({ title: 'Montagskurs' }) },
});
