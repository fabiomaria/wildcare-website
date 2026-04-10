import { defineType } from 'sanity';

export const contactInfo = defineType({
  name: 'contactInfo',
  title: 'Contact Info',
  type: 'object',
  fields: [
    {
      name: 'items', title: 'Contact Details', type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'icon', title: 'Icon (SVG)', type: 'text' },
          { name: 'label', title: 'Label', type: 'localeString' },
          { name: 'value', title: 'Value', type: 'localeString' },
          { name: 'link', title: 'Link URL', type: 'string' },
        ],
        preview: { select: { title: 'label.de', subtitle: 'value.de' } },
      }],
    },
  ],
  preview: { prepare: () => ({ title: 'Contact Info' }) },
});
