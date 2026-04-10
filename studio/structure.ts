import type { StructureBuilder } from 'sanity/structure';

function singletonItem(S: StructureBuilder, typeName: string, title: string) {
  return S.listItem()
    .title(title)
    .child(
      S.document()
        .schemaType(typeName)
        .documentId(typeName)
    );
}

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Pages')
        .child(
          S.list()
            .title('Pages')
            .items([
              singletonItem(S, 'homepage', 'Homepage'),
              singletonItem(S, 'montagskurs', 'Montagskurs'),
              singletonItem(S, 'bewegungsrevolution', 'Bewegungsrevolution'),
              singletonItem(S, 'mitmachen', 'Mitmachen'),
              singletonItem(S, 'teamPage', 'Team'),
              singletonItem(S, 'kontakt', 'Kontakt'),
              S.divider(),
              S.listItem()
                .title('Legal Pages')
                .child(S.documentTypeList('legalPage').title('Legal Pages')),
            ])
        ),
      S.divider(),
      S.listItem().title('Events').child(S.documentTypeList('event').title('Events')),
      S.listItem().title('Journal').child(S.documentTypeList('journalArticle').title('Journal Articles')),
      S.listItem().title('Team Members').child(S.documentTypeList('teamMember').title('Team Members')),
      S.divider(),
      S.listItem()
        .title('Settings')
        .child(
          S.list()
            .title('Settings')
            .items([
              singletonItem(S, 'navigation', 'Navigation'),
              singletonItem(S, 'siteSettings', 'Site Settings'),
              singletonItem(S, 'donationInfo', 'Donation Info'),
            ])
        ),
    ]);
