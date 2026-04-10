import { defineType } from 'sanity';

export const mapEmbed = defineType({
  name: 'mapEmbed',
  title: 'Map Embed',
  type: 'object',
  fields: [
    { name: 'address', title: 'Address', type: 'string', initialValue: 'Orpheumgasse 11, Graz' },
    {
      name: 'coordinates', title: 'Coordinates', type: 'object',
      fields: [
        { name: 'lat', title: 'Latitude', type: 'number' },
        { name: 'lng', title: 'Longitude', type: 'number' },
      ],
    },
  ],
  preview: {
    select: { title: 'address' },
    prepare: ({ title }) => ({ title: title || 'Map', subtitle: 'Google Maps' }),
  },
});
