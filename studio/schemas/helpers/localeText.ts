import { defineType } from 'sanity';

export const localeText = defineType({
  name: 'localeText',
  title: 'Localized Text',
  type: 'object',
  fields: [
    { name: 'de', title: 'Deutsch', type: 'text', validation: (Rule) => Rule.required() },
    { name: 'en', title: 'English', type: 'text' },
  ],
});
