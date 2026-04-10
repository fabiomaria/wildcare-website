import { defineType } from 'sanity';

export const mitmachen = defineType({
  name: 'mitmachen',
  title: 'Mitmachen',
  type: 'document',
  fields: [
    {
      name: 'hero', title: 'Hero', type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
      ],
    },
    {
      name: 'circlesVisual', title: 'Circles Visual', type: 'object',
      fields: [
        {
          name: 'outerCircle', title: 'Outer Circle', type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'localeString' },
            { name: 'description', title: 'Description', type: 'localeText' },
            { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'localeString' }] },
          ],
        },
        {
          name: 'innerCircle', title: 'Inner Circle', type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'localeString' },
            { name: 'description', title: 'Description', type: 'localeText' },
            { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'localeString' }] },
          ],
        },
      ],
    },
    {
      name: 'circleCards', title: 'Circle Detail Cards', type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'title', title: 'Title', type: 'localeString' },
        { name: 'description', title: 'Description', type: 'localeText' },
        { name: 'icon', title: 'Icon (SVG)', type: 'text' },
      ], preview: { select: { title: 'title.de' } } }],
    },
    { name: 'coreMessage', title: 'Core Message', type: 'localePortableText' },
    {
      name: 'membershipTiers', title: 'Membership Tiers', type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'icon', title: 'Icon (SVG)', type: 'text' },
        { name: 'name', title: 'Name', type: 'localeString' },
        { name: 'amount', title: 'Amount', type: 'string' },
        { name: 'description', title: 'Description', type: 'localeText' },
        { name: 'note', title: 'Note', type: 'localeText' },
      ], preview: { select: { title: 'name.de', subtitle: 'amount' } } }],
    },
    { name: 'membershipFormEmbed', title: 'Membership Form URL', type: 'url' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: { prepare: () => ({ title: 'Mitmachen' }) },
});
