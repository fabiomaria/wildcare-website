import { defineType } from 'sanity';

export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal Page',
  type: 'document',
  fields: [
    {
      name: 'pageKey', title: 'Page', type: 'string',
      options: { list: [
        { title: 'Impressum', value: 'impressum' },
        { title: 'Datenschutz', value: 'datenschutz' },
      ]},
      validation: (Rule) => Rule.required(),
    },
    { name: 'heading', title: 'Heading', type: 'localeString' },
    { name: 'legalBody', title: 'Legal Body', type: 'localePortableText' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    select: { title: 'pageKey' },
    prepare: ({ title }) => ({ title: title === 'impressum' ? 'Impressum' : 'Datenschutz' }),
  },
});
