export function localBusinessSchema(settings: { name: string; address: string; email: string; url: string; zvrZahl?: string; }) {
  return {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: settings.name,
    address: { '@type': 'PostalAddress', streetAddress: 'Orpheumgasse 11', addressLocality: 'Graz', addressCountry: 'AT' },
    email: settings.email, url: settings.url,
    ...(settings.zvrZahl && { identifier: { '@type': 'PropertyValue', name: 'ZVR-Zahl', value: settings.zvrZahl } }),
  };
}

export function eventSchema(event: { name: string; startDate: string; endDate: string; location: string; cost: string; }) {
  return {
    '@context': 'https://schema.org', '@type': 'Event', name: event.name, startDate: event.startDate, endDate: event.endDate,
    location: { '@type': 'Place', name: event.location },
    isAccessibleForFree: event.cost === 'Spendenbasis',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: event.cost },
  };
}

export function articleSchema(article: { headline: string; datePublished: string; imageUrl?: string; }) {
  return {
    '@context': 'https://schema.org', '@type': 'Article', headline: article.headline, datePublished: article.datePublished,
    author: { '@type': 'Organization', name: 'Wild Care' },
    ...(article.imageUrl && { image: article.imageUrl }),
  };
}
