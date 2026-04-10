import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: import.meta.env.SANITY_API_VERSION || '2026-04-10',
  useCdn: true,
});

// ---- Singletons ----
export async function getNavigation() { return sanityClient.fetch(`*[_type == "navigation"][0]`); }
export async function getSiteSettings() { return sanityClient.fetch(`*[_type == "siteSettings"][0]`); }
export async function getDonationInfo() { return sanityClient.fetch(`*[_type == "donationInfo"][0]`); }

// ---- Page Documents ----
export async function getHomepage() { return sanityClient.fetch(`*[_type == "homepage"][0]`); }
export async function getMontagskurs() { return sanityClient.fetch(`*[_type == "montagskurs"][0]`); }
export async function getBewegungsrevolution() { return sanityClient.fetch(`*[_type == "bewegungsrevolution"][0]`); }
export async function getMitmachen() { return sanityClient.fetch(`*[_type == "mitmachen"][0]`); }
export async function getTeamPage() { return sanityClient.fetch(`*[_type == "teamPage"][0]`); }
export async function getKontakt() { return sanityClient.fetch(`*[_type == "kontakt"][0]`); }
export async function getLegalPage(pageKey: string) { return sanityClient.fetch(`*[_type == "legalPage" && pageKey == $pageKey][0]`, { pageKey }); }

// ---- Collections ----
export async function getNextEvent() { return sanityClient.fetch(`*[_type == "event" && startDateTime > now()] | order(startDateTime asc)[0]`); }
export async function getAllEvents() { return sanityClient.fetch(`*[_type == "event"] | order(startDateTime desc)`); }
export async function getPublishedArticles(locale: string) {
  const localeFilter = locale === 'en' ? `&& defined(title.en)` : '';
  return sanityClient.fetch(`*[_type == "journalArticle" && status == "published" ${localeFilter}] | order(publishedAt desc)`);
}
export async function getArticleBySlug(slug: string) { return sanityClient.fetch(`*[_type == "journalArticle" && slug.current == $slug][0]`, { slug }); }
export async function getAllArticleSlugs() { return sanityClient.fetch(`*[_type == "journalArticle" && status == "published"]{ "slug": slug.current, title }`); }
export async function getTeamMembers() { return sanityClient.fetch(`*[_type == "teamMember"] | order(sortOrder asc)`); }

// ---- Shared data fetcher ----
export async function getSharedData() {
  const [navigation, siteSettings] = await Promise.all([getNavigation(), getSiteSettings()]);
  return { navigation, siteSettings };
}
