import { defineType } from 'sanity';

export const bewegungsrevolution = defineType({
  name: 'bewegungsrevolution',
  title: 'Bewegungsrevolution',
  type: 'document',
  fields: [
    {
      name: 'hero', title: 'Hero', type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Badge / Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
        { name: 'image', title: 'Hero Image/Video Poster', type: 'image', options: { hotspot: true } },
        { name: 'videoUrl', title: 'Hero Video URL', type: 'url' },
        {
          name: 'details', title: 'Detail Rows', type: 'array',
          of: [{ type: 'object', fields: [
            { name: 'icon', title: 'Icon (SVG)', type: 'text' },
            { name: 'label', title: 'Label', type: 'localeString' },
            { name: 'value', title: 'Value', type: 'localeString' },
          ]}],
        },
      ],
    },
    {
      name: 'about', title: 'About Section', type: 'object',
      fields: [
        { name: 'text', title: 'Text', type: 'localePortableText' },
        {
          name: 'cards', title: 'Number Cards', type: 'array',
          of: [{ type: 'object', fields: [
            { name: 'number', title: 'Number', type: 'string' },
            { name: 'title', title: 'Title', type: 'localeString' },
            { name: 'description', title: 'Description', type: 'localeText' },
          ]}],
        },
      ],
    },
    {
      name: 'projectCards', title: 'Project Cards', type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'tag', title: 'Tag', type: 'localeString' },
        { name: 'title', title: 'Title', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
        { name: 'description', title: 'Description', type: 'localeText' },
        {
          name: 'details', title: 'Details', type: 'array',
          of: [{ type: 'object', fields: [
            { name: 'label', title: 'Label', type: 'localeString' },
            { name: 'value', title: 'Value', type: 'localeString' },
          ]}],
        },
      ], preview: { select: { title: 'title.de' } } }],
    },
    {
      name: 'previewCards', title: 'Preview Cards', type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'label', title: 'Label', type: 'localeString' },
        { name: 'title', title: 'Title', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
        { name: 'description', title: 'Description', type: 'localeText' },
        { name: 'ctaLabel', title: 'CTA Label', type: 'localeString' },
        { name: 'ctaLink', title: 'CTA Link', type: 'string' },
      ], preview: { select: { title: 'title.de' } } }],
    },
    {
      name: 'testimonials', title: 'Testimonials', type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'quote', title: 'Quote', type: 'localeText' },
        { name: 'author', title: 'Author', type: 'string' },
      ]}],
    },
    {
      name: 'faqList', title: 'FAQ', type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'question', title: 'Question', type: 'localeString' },
        { name: 'answer', title: 'Answer', type: 'localeText' },
      ], preview: { select: { title: 'question.de' } } }],
    },
    { name: 'donationNote', title: 'Donation Note', type: 'localePortableText' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: { prepare: () => ({ title: 'Bewegungsrevolution' }) },
});
