import { defineType } from 'sanity';

export const imageTextSplit = defineType({
  name: 'imageTextSplit',
  title: 'Image + Text Split',
  type: 'object',
  fields: [
    { name: 'image', title: 'Image', type: 'image', options: { hotspot: true } },
    { name: 'imageAlt', title: 'Image Alt Text', type: 'string' },
    { name: 'text', title: 'Text', type: 'localePortableText' },
    {
      name: 'layout', title: 'Layout', type: 'string',
      options: { list: [{ title: 'Image Left', value: 'image-left' }, { title: 'Image Right', value: 'image-right' }] },
      initialValue: 'image-left',
    },
  ],
  preview: {
    select: { layout: 'layout' },
    prepare: ({ layout }) => ({ title: `Image + Text (${layout || 'image-left'})` }),
  },
});
