import { localeString } from './helpers/localeString';
import { localeText } from './helpers/localeText';
import { localePortableText } from './helpers/localePortableText';
import { seoFields } from './helpers/seoFields';

import { heroVideo } from './blocks/heroVideo';
import { heroImage } from './blocks/heroImage';
import { richText } from './blocks/richText';
import { imageTextSplit } from './blocks/imageTextSplit';
import { valueCards } from './blocks/valueCards';
import { quoteBand } from './blocks/quoteBand';
import { ctaBanner } from './blocks/ctaBanner';
import { testimonials } from './blocks/testimonials';
import { embedForm } from './blocks/embedForm';
import { mapEmbed } from './blocks/mapEmbed';
import { htmlEmbed } from './blocks/htmlEmbed';
import { contactInfo } from './blocks/contactInfo';

import { navigation } from './singletons/navigation';
import { siteSettings } from './singletons/siteSettings';
import { donationInfo } from './singletons/donationInfo';

import { event } from './collections/event';
import { journalArticle } from './collections/journalArticle';
import { teamMember } from './collections/teamMember';

import { homepage } from './documents/homepage';
import { montagskurs } from './documents/montagskurs';
import { bewegungsrevolution } from './documents/bewegungsrevolution';
import { mitmachen } from './documents/mitmachen';
import { teamPage } from './documents/teamPage';
import { kontakt } from './documents/kontakt';
import { legalPage } from './documents/legalPage';

export const schemaTypes = [
  // Helpers
  localeString, localeText, localePortableText, seoFields,
  // Blocks
  heroVideo, heroImage, richText, imageTextSplit, valueCards, quoteBand,
  ctaBanner, testimonials, embedForm, mapEmbed, htmlEmbed, contactInfo,
  // Singletons
  navigation, siteSettings, donationInfo,
  // Collections
  event, journalArticle, teamMember,
  // Page Documents
  homepage, montagskurs, bewegungsrevolution, mitmachen, teamPage, kontakt, legalPage,
];
