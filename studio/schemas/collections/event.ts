import { defineType } from 'sanity';

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'localeString', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title.de', maxLength: 96 } },
    { name: 'startDateTime', title: 'Start Date & Time', type: 'datetime', validation: (Rule) => Rule.required() },
    { name: 'endDateTime', title: 'End Date & Time', type: 'datetime', validation: (Rule) => Rule.required() },
    {
      name: 'recurrenceType', title: 'Recurrence', type: 'string',
      options: { list: [
        { title: 'Single Event', value: 'single' },
        { title: 'Weekly Recurring', value: 'weekly' },
        { title: 'Block / Series', value: 'block' },
      ]},
      initialValue: 'single',
    },
    {
      name: 'recurrenceRule', title: 'Weekly Recurrence Rule', type: 'object',
      hidden: ({ parent }) => parent?.recurrenceType !== 'weekly',
      fields: [
        { name: 'dayOfWeek', title: 'Day of Week', type: 'string', options: { list: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] } },
        { name: 'endDate', title: 'Recurrence End Date', type: 'date' },
      ],
    },
    {
      name: 'blockDates', title: 'Block Dates', type: 'array',
      hidden: ({ parent }) => parent?.recurrenceType !== 'block',
      of: [{
        type: 'object',
        fields: [
          { name: 'startDate', title: 'Start Date', type: 'date' },
          { name: 'endDate', title: 'End Date', type: 'date' },
          { name: 'label', title: 'Label', type: 'string' },
        ],
      }],
    },
    { name: 'location', title: 'Location', type: 'string', initialValue: 'Orpheumgasse 11, Graz' },
    { name: 'cost', title: 'Cost', type: 'string', initialValue: 'Spendenbasis' },
    { name: 'description', title: 'Description', type: 'localePortableText' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    select: { title: 'title.de', date: 'startDateTime' },
    prepare: ({ title, date }) => ({
      title: title || 'Untitled Event',
      subtitle: date ? new Date(date).toLocaleDateString('de-AT') : 'No date',
    }),
  },
  orderings: [
    { title: 'Date (Newest)', name: 'dateDesc', by: [{ field: 'startDateTime', direction: 'desc' }] },
    { title: 'Date (Oldest)', name: 'dateAsc', by: [{ field: 'startDateTime', direction: 'asc' }] },
  ],
});
