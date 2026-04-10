import { defineType } from 'sanity';

const sectionBlocks = [
  { type: 'heroVideo' }, { type: 'heroImage' }, { type: 'richText' },
  { type: 'imageTextSplit' }, { type: 'valueCards' }, { type: 'quoteBand' },
  { type: 'ctaBanner' }, { type: 'testimonials' }, { type: 'embedForm' },
  { type: 'mapEmbed' }, { type: 'htmlEmbed' }, { type: 'contactInfo' },
];

export const homepage = defineType({
  name: 'homepage',
  title: 'Homepage',
  type: 'document',
  fields: [
    { name: 'sections', title: 'Page Sections', type: 'array', of: sectionBlocks },
    {
      name: 'eventBanner', title: 'Event Banner', type: 'object',
      description: 'Auto-populated from next upcoming event. Override text below if needed.',
      fields: [{ name: 'overrideText', title: 'Override Text', type: 'localeString' }],
    },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: { prepare: () => ({ title: 'Homepage' }) },
});
