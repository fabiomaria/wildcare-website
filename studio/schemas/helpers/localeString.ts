import { defineType } from 'sanity';

export const localeString = defineType({
  name: 'localeString',
  title: 'Localized String',
  type: 'object',
  fields: [
    { name: 'de', title: 'Deutsch', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'en', title: 'English', type: 'string' },
  ],
});
