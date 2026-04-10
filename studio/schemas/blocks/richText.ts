import { defineType } from 'sanity';

export const richText = defineType({
  name: 'richText',
  title: 'Rich Text',
  type: 'object',
  fields: [
    { name: 'body', title: 'Body', type: 'localePortableText' },
  ],
  preview: { prepare: () => ({ title: 'Rich Text Block' }) },
});
