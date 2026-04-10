import { defineType } from 'sanity';

export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team Member',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'role', title: 'Role', type: 'localeString' },
    { name: 'bio', title: 'Bio', type: 'localePortableText' },
    { name: 'portrait', title: 'Portrait', type: 'image', options: { hotspot: true } },
    { name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 },
  ],
  preview: { select: { title: 'name', subtitle: 'role.de', media: 'portrait' } },
  orderings: [
    { title: 'Sort Order', name: 'sortOrder', by: [{ field: 'sortOrder', direction: 'asc' }] },
  ],
});
