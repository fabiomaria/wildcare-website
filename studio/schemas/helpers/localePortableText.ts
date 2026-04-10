import { defineType, defineArrayMember } from 'sanity';

const portableTextFields = [
  defineArrayMember({
    type: 'block',
    styles: [
      { title: 'Normal', value: 'normal' },
      { title: 'H2', value: 'h2' },
      { title: 'H3', value: 'h3' },
    ],
    marks: {
      decorators: [
        { title: 'Bold', value: 'strong' },
        { title: 'Italic', value: 'em' },
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Link',
          fields: [
            { name: 'href', type: 'url', title: 'URL' },
            { name: 'blank', type: 'boolean', title: 'Open in new tab', initialValue: false },
          ],
        },
      ],
    },
  }),
  defineArrayMember({
    type: 'image',
    options: { hotspot: true },
    fields: [
      { name: 'alt', type: 'string', title: 'Alt text', validation: (Rule) => Rule.required() },
    ],
  }),
];

export const localePortableText = defineType({
  name: 'localePortableText',
  title: 'Localized Rich Text',
  type: 'object',
  fields: [
    { name: 'de', title: 'Deutsch', type: 'array', of: portableTextFields, validation: (Rule) => Rule.required() },
    { name: 'en', title: 'English', type: 'array', of: portableTextFields },
  ],
});
