import { defineType } from 'sanity';

export const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    {
      name: 'mainMenu', title: 'Main Menu', type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'label_de', title: 'Label (DE)', type: 'string', validation: (Rule) => Rule.required() },
          { name: 'label_en', title: 'Label (EN)', type: 'string' },
          { name: 'href', title: 'Link', type: 'string', validation: (Rule) => Rule.required() },
          {
            name: 'children', title: 'Submenu Items', type: 'array',
            of: [{
              type: 'object',
              fields: [
                { name: 'label_de', title: 'Label (DE)', type: 'string' },
                { name: 'label_en', title: 'Label (EN)', type: 'string' },
                { name: 'href', title: 'Link', type: 'string' },
              ],
            }],
          },
        ],
        preview: { select: { title: 'label_de', subtitle: 'href' } },
      }],
    },
    {
      name: 'footerMenu', title: 'Footer Menu', type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'label_de', title: 'Label (DE)', type: 'string' },
          { name: 'label_en', title: 'Label (EN)', type: 'string' },
          { name: 'href', title: 'Link', type: 'string' },
        ],
        preview: { select: { title: 'label_de', subtitle: 'href' } },
      }],
    },
    {
      name: 'ctaButton', title: 'CTA Button', type: 'object',
      fields: [
        { name: 'label_de', title: 'Label (DE)', type: 'string' },
        { name: 'label_en', title: 'Label (EN)', type: 'string' },
        { name: 'href', title: 'Link', type: 'string' },
      ],
    },
    { name: 'showLanguageSwitcher', title: 'Show Language Switcher', type: 'boolean', initialValue: true },
  ],
  preview: { prepare: () => ({ title: 'Navigation' }) },
});
