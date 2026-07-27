# Wild Care content schema v2

<!-- Generated from schema/content-schema-v2.registry.json. Do not edit. -->

Registry revision: 2

Supported locales: `de`, `en`

## event

Source: `content/events/*.yaml`

Templates: `event`

| Field ID | Class | Storage path | Type | Required | CMS |
| --- | --- | --- | --- | --- | --- |
| `event.g.global.event_type` | G | `global.event_type` | string | no | yes |
| `event.g.global.id` | G | `global.id` | string | yes | yes |
| `event.g.global.intended_locales.item` | G | `global.intended_locales[]` | string | no | yes |
| `event.g.global.page_mode` | G | `global.page_mode` | string | no | yes |
| `event.g.global.registration.availability` | G | `global.registration.availability` | string | no | yes |
| `event.g.global.registration.url` | G | `global.registration.url` | string | no | yes |
| `event.g.global.route` | G | `global.route` | string | no | yes |
| `event.g.global.schedule.event_status` | G | `global.schedule.event_status` | string | no | yes |
| `event.g.global.schedule.featured_occurrences.item.id` | G | `global.schedule.featured_occurrences[].id` | string | yes | yes |
| `event.g.global.schedule.featured_occurrences.item.teacher` | G | `global.schedule.featured_occurrences[].teacher` | string | no | yes |
| `event.g.global.schedule.mode` | G | `global.schedule.mode` | string | no | yes |
| `event.g.global.schedule.previous_start_local` | G | `global.schedule.previous_start_local` | null | no | yes |
| `event.g.global.schedule.recurrence.anchor` | G | `global.schedule.recurrence.anchor` | string | yes | yes |
| `event.g.global.schedule.recurrence.end_time` | G | `global.schedule.recurrence.end_time` | string | yes | yes |
| `event.g.global.schedule.recurrence.except.item` | G | `global.schedule.recurrence.except[]` | array | no | yes |
| `event.g.global.schedule.recurrence.horizon_months` | G | `global.schedule.recurrence.horizon_months` | integer | yes | yes |
| `event.g.global.schedule.recurrence.start_time` | G | `global.schedule.recurrence.start_time` | string | yes | yes |
| `event.g.global.schedule.recurrence.weekday` | G | `global.schedule.recurrence.weekday` | string | yes | yes |
| `event.g.global.schedule.sessions.item.end_local` | G | `global.schedule.sessions[].end_local` | string | no | yes |
| `event.g.global.schedule.sessions.item.id` | G | `global.schedule.sessions[].id` | string | no | yes |
| `event.g.global.schedule.sessions.item.start_local` | G | `global.schedule.sessions[].start_local` | string | no | yes |
| `event.g.global.schedule.sessions.item.status` | G | `global.schedule.sessions[].status` | string | no | yes |
| `event.g.global.sort_order` | G | `global.sort_order` | integer | no | yes |
| `event.g.global.start_at` | G | `global.start_at` | datetime | no | yes |
| `event.g.global.status` | G | `global.status` | string | yes | yes |
| `event.g.global.updated_at` | G | `global.updated_at` | datetime | no | yes |
| `event.g.global.venue` | G | `global.venue` | string | no | yes |
| `event.l.summary` | L | `locales.{locale}.summary` | string | no | yes |
| `event.l.title` | L | `locales.{locale}.title` | string | no | yes |

## fixed_page

Source: `content/pages/*.yaml`

Templates: `index`, `kontakt`, `team`, `journal`, `programm`, `montagskurs`, `mitmachen`

| Field ID | Class | Storage path | Type | Required | CMS |
| --- | --- | --- | --- | --- | --- |
| `fixed_page.g.global.hero.image` | G | `global.hero.image` | string | no | yes |
| `fixed_page.g.global.id` | G | `global.id` | string | yes | yes |
| `fixed_page.g.global.intended_locales.item` | G | `global.intended_locales[]` | string | no | yes |
| `fixed_page.g.global.meta.og_image` | G | `global.meta.og_image` | string | no | yes |
| `fixed_page.g.global.meta.og_image_height` | G | `global.meta.og_image_height` | integer | no | yes |
| `fixed_page.g.global.meta.og_image_width` | G | `global.meta.og_image_width` | integer | no | yes |
| `fixed_page.g.global.outlook.show_links` | G | `global.outlook.show_links` | boolean | no | yes |
| `fixed_page.g.global.practice.poster` | G | `global.practice.poster` | string | no | yes |
| `fixed_page.g.global.practice.video` | G | `global.practice.video` | string | no | yes |
| `fixed_page.g.global.route` | G | `global.route` | string | no | yes |
| `fixed_page.g.global.schedule.event_status` | G | `global.schedule.event_status` | string | no | yes |
| `fixed_page.g.global.schedule.featured_occurrences.item.id` | G | `global.schedule.featured_occurrences[].id` | string | no | yes |
| `fixed_page.g.global.schedule.featured_occurrences.item.teacher` | G | `global.schedule.featured_occurrences[].teacher` | string | no | yes |
| `fixed_page.g.global.schedule.mode` | G | `global.schedule.mode` | string | no | yes |
| `fixed_page.g.global.schedule.previous_start_local` | G | `global.schedule.previous_start_local` | null | no | yes |
| `fixed_page.g.global.schedule.recurrence.anchor` | G | `global.schedule.recurrence.anchor` | string | no | yes |
| `fixed_page.g.global.schedule.recurrence.end_time` | G | `global.schedule.recurrence.end_time` | string | no | yes |
| `fixed_page.g.global.schedule.recurrence.except.item` | G | `global.schedule.recurrence.except[]` | array | no | yes |
| `fixed_page.g.global.schedule.recurrence.horizon_months` | G | `global.schedule.recurrence.horizon_months` | integer | no | yes |
| `fixed_page.g.global.schedule.recurrence.start_time` | G | `global.schedule.recurrence.start_time` | string | no | yes |
| `fixed_page.g.global.schedule.recurrence.weekday` | G | `global.schedule.recurrence.weekday` | string | no | yes |
| `fixed_page.g.global.status` | G | `global.status` | string | yes | yes |
| `fixed_page.g.global.updated_at` | G | `global.updated_at` | datetime | no | yes |
| `fixed_page.g.global.venue` | G | `global.venue` | string | no | yes |
| `fixed_page.l.article.back` | L | `locales.{locale}.article.back` | string | no | yes |
| `fixed_page.l.article.related_heading` | L | `locales.{locale}.article.related_heading` | string | no | yes |
| `fixed_page.l.article.related_label` | L | `locales.{locale}.article.related_label` | string | no | yes |
| `fixed_page.l.breadcrumb` | L | `locales.{locale}.breadcrumb` | string | no | yes |
| `fixed_page.l.card.coming_soon` | L | `locales.{locale}.card.coming_soon` | string | no | yes |
| `fixed_page.l.card.read_more` | L | `locales.{locale}.card.read_more` | string | no | yes |
| `fixed_page.l.circles.heading` | L | `locales.{locale}.circles.heading` | string | no | yes |
| `fixed_page.l.circles.inner.desc` | L | `locales.{locale}.circles.inner.desc` | string | no | yes |
| `fixed_page.l.circles.inner.label` | L | `locales.{locale}.circles.inner.label` | string | no | yes |
| `fixed_page.l.circles.inner.p1` | L | `locales.{locale}.circles.inner.p1` | string | no | yes |
| `fixed_page.l.circles.inner.p2` | L | `locales.{locale}.circles.inner.p2` | string | no | yes |
| `fixed_page.l.circles.inner.tags.item.tag` | L | `locales.{locale}.circles.inner.tags[].tag` | string | no | yes |
| `fixed_page.l.circles.inner.title` | L | `locales.{locale}.circles.inner.title` | string | no | yes |
| `fixed_page.l.circles.label` | L | `locales.{locale}.circles.label` | string | no | yes |
| `fixed_page.l.circles.outer.desc` | L | `locales.{locale}.circles.outer.desc` | string | no | yes |
| `fixed_page.l.circles.outer.label` | L | `locales.{locale}.circles.outer.label` | string | no | yes |
| `fixed_page.l.circles.outer.p1` | L | `locales.{locale}.circles.outer.p1` | string | no | yes |
| `fixed_page.l.circles.outer.p2` | L | `locales.{locale}.circles.outer.p2` | string | no | yes |
| `fixed_page.l.circles.outer.tags.item.tag` | L | `locales.{locale}.circles.outer.tags[].tag` | string | no | yes |
| `fixed_page.l.circles.outer.title` | L | `locales.{locale}.circles.outer.title` | string | no | yes |
| `fixed_page.l.core_message` | L | `locales.{locale}.core_message` | string | no | yes |
| `fixed_page.l.core.description_heading` | L | `locales.{locale}.core.description_heading` | string | no | yes |
| `fixed_page.l.core.heading` | L | `locales.{locale}.core.heading` | string | no | yes |
| `fixed_page.l.core.info_title` | L | `locales.{locale}.core.info_title` | string | no | yes |
| `fixed_page.l.core.label` | L | `locales.{locale}.core.label` | string | no | yes |
| `fixed_page.l.core.more_label` | L | `locales.{locale}.core.more_label` | string | no | yes |
| `fixed_page.l.core.paragraphs.item.text` | L | `locales.{locale}.core.paragraphs[].text` | string | no | yes |
| `fixed_page.l.core.quote` | L | `locales.{locale}.core.quote` | string | no | yes |
| `fixed_page.l.core.register_label` | L | `locales.{locale}.core.register_label` | string | no | yes |
| `fixed_page.l.core.rows.item.icon` | L | `locales.{locale}.core.rows[].icon` | string | no | yes |
| `fixed_page.l.core.rows.item.label` | L | `locales.{locale}.core.rows[].label` | string | no | yes |
| `fixed_page.l.core.rows.item.value` | L | `locales.{locale}.core.rows[].value` | string | no | yes |
| `fixed_page.l.crosslink.button` | L | `locales.{locale}.crosslink.button` | string | no | yes |
| `fixed_page.l.crosslink.heading` | L | `locales.{locale}.crosslink.heading` | string | no | yes |
| `fixed_page.l.crosslink.label` | L | `locales.{locale}.crosslink.label` | string | no | yes |
| `fixed_page.l.crosslink.text` | L | `locales.{locale}.crosslink.text` | string | no | yes |
| `fixed_page.l.cta.button` | L | `locales.{locale}.cta.button` | string | no | yes |
| `fixed_page.l.cta.consent_link` | L | `locales.{locale}.cta.consent_link` | string | no | yes |
| `fixed_page.l.cta.consent_post` | L | `locales.{locale}.cta.consent_post` | string | no | yes |
| `fixed_page.l.cta.consent_pre` | L | `locales.{locale}.cta.consent_pre` | string | no | yes |
| `fixed_page.l.cta.email_label` | L | `locales.{locale}.cta.email_label` | string | no | yes |
| `fixed_page.l.cta.email_placeholder` | L | `locales.{locale}.cta.email_placeholder` | string | no | yes |
| `fixed_page.l.cta.error` | L | `locales.{locale}.cta.error` | string | no | yes |
| `fixed_page.l.cta.first_name_label` | L | `locales.{locale}.cta.first_name_label` | string | no | yes |
| `fixed_page.l.cta.first_name_placeholder` | L | `locales.{locale}.cta.first_name_placeholder` | string | no | yes |
| `fixed_page.l.cta.heading` | L | `locales.{locale}.cta.heading` | string | no | yes |
| `fixed_page.l.cta.label` | L | `locales.{locale}.cta.label` | string | no | yes |
| `fixed_page.l.cta.submit` | L | `locales.{locale}.cta.submit` | string | no | yes |
| `fixed_page.l.cta.submitted` | L | `locales.{locale}.cta.submitted` | string | no | yes |
| `fixed_page.l.cta.submitting` | L | `locales.{locale}.cta.submitting` | string | no | yes |
| `fixed_page.l.cta.success` | L | `locales.{locale}.cta.success` | string | no | yes |
| `fixed_page.l.cta.text` | L | `locales.{locale}.cta.text` | string | no | yes |
| `fixed_page.l.event_banner.address` | L | `locales.{locale}.event_banner.address` | string | no | yes |
| `fixed_page.l.event_banner.basis` | L | `locales.{locale}.event_banner.basis` | string | no | yes |
| `fixed_page.l.event_banner.day` | L | `locales.{locale}.event_banner.day` | string | no | yes |
| `fixed_page.l.event_banner.tag` | L | `locales.{locale}.event_banner.tag` | string | no | yes |
| `fixed_page.l.event_banner.time` | L | `locales.{locale}.event_banner.time` | string | no | yes |
| `fixed_page.l.faq.heading` | L | `locales.{locale}.faq.heading` | string | no | yes |
| `fixed_page.l.faq.items.item.a` | L | `locales.{locale}.faq.items[].a` | string | no | yes |
| `fixed_page.l.faq.items.item.q` | L | `locales.{locale}.faq.items[].q` | string | no | yes |
| `fixed_page.l.faq.label` | L | `locales.{locale}.faq.label` | string | no | yes |
| `fixed_page.l.footer.connect_heading` | L | `locales.{locale}.footer.connect_heading` | string | no | yes |
| `fixed_page.l.form.email_label` | L | `locales.{locale}.form.email_label` | string | no | yes |
| `fixed_page.l.form.email_placeholder` | L | `locales.{locale}.form.email_placeholder` | string | no | yes |
| `fixed_page.l.form.error_message` | L | `locales.{locale}.form.error_message` | string | no | yes |
| `fixed_page.l.form.heading` | L | `locales.{locale}.form.heading` | string | no | yes |
| `fixed_page.l.form.message_label` | L | `locales.{locale}.form.message_label` | string | no | yes |
| `fixed_page.l.form.message_placeholder` | L | `locales.{locale}.form.message_placeholder` | string | no | yes |
| `fixed_page.l.form.name_label` | L | `locales.{locale}.form.name_label` | string | no | yes |
| `fixed_page.l.form.name_placeholder` | L | `locales.{locale}.form.name_placeholder` | string | no | yes |
| `fixed_page.l.form.note` | L | `locales.{locale}.form.note` | string | no | yes |
| `fixed_page.l.form.submit_label` | L | `locales.{locale}.form.submit_label` | string | no | yes |
| `fixed_page.l.form.submitted_label` | L | `locales.{locale}.form.submitted_label` | string | no | yes |
| `fixed_page.l.form.submitting_label` | L | `locales.{locale}.form.submitting_label` | string | no | yes |
| `fixed_page.l.form.success_message` | L | `locales.{locale}.form.success_message` | string | no | yes |
| `fixed_page.l.hero.address` | L | `locales.{locale}.hero.address` | string | no | yes |
| `fixed_page.l.hero.basis` | L | `locales.{locale}.hero.basis` | string | no | yes |
| `fixed_page.l.hero.cta` | L | `locales.{locale}.hero.cta` | string | no | yes |
| `fixed_page.l.hero.cta_ghost` | L | `locales.{locale}.hero.cta_ghost` | string | no | yes |
| `fixed_page.l.hero.cta_primary` | L | `locales.{locale}.hero.cta_primary` | string | no | yes |
| `fixed_page.l.hero.cta_secondary` | L | `locales.{locale}.hero.cta_secondary` | string | no | yes |
| `fixed_page.l.hero.heading` | L | `locales.{locale}.hero.heading` | string | no | yes |
| `fixed_page.l.hero.heading_html` | L | `locales.{locale}.hero.heading_html` | string | no | yes |
| `fixed_page.l.hero.image_alt` | L | `locales.{locale}.hero.image_alt` | string | no | yes |
| `fixed_page.l.hero.intro` | L | `locales.{locale}.hero.intro` | string | no | yes |
| `fixed_page.l.hero.label` | L | `locales.{locale}.hero.label` | string | no | yes |
| `fixed_page.l.hero.schedule` | L | `locales.{locale}.hero.schedule` | string | no | yes |
| `fixed_page.l.hero.subtitle` | L | `locales.{locale}.hero.subtitle` | string | no | yes |
| `fixed_page.l.hero.tagline` | L | `locales.{locale}.hero.tagline` | string | no | yes |
| `fixed_page.l.info.address_label` | L | `locales.{locale}.info.address_label` | string | no | yes |
| `fixed_page.l.info.email_label` | L | `locales.{locale}.info.email_label` | string | no | yes |
| `fixed_page.l.info.highlight` | L | `locales.{locale}.info.highlight` | string | no | yes |
| `fixed_page.l.info.when_label` | L | `locales.{locale}.info.when_label` | string | no | yes |
| `fixed_page.l.info.when_value` | L | `locales.{locale}.info.when_value` | string | no | yes |
| `fixed_page.l.invitation.cta` | L | `locales.{locale}.invitation.cta` | string | no | yes |
| `fixed_page.l.invitation.heading` | L | `locales.{locale}.invitation.heading` | string | no | yes |
| `fixed_page.l.invitation.label` | L | `locales.{locale}.invitation.label` | string | no | yes |
| `fixed_page.l.invitation.p1` | L | `locales.{locale}.invitation.p1` | string | no | yes |
| `fixed_page.l.invitation.p2` | L | `locales.{locale}.invitation.p2` | string | no | yes |
| `fixed_page.l.journal.all_posts` | L | `locales.{locale}.journal.all_posts` | string | no | yes |
| `fixed_page.l.journal.heading` | L | `locales.{locale}.journal.heading` | string | no | yes |
| `fixed_page.l.learn.cards.item.text` | L | `locales.{locale}.learn.cards[].text` | string | no | yes |
| `fixed_page.l.learn.cards.item.title` | L | `locales.{locale}.learn.cards[].title` | string | no | yes |
| `fixed_page.l.learn.donation_note` | L | `locales.{locale}.learn.donation_note` | string | no | yes |
| `fixed_page.l.learn.heading` | L | `locales.{locale}.learn.heading` | string | no | yes |
| `fixed_page.l.learn.label` | L | `locales.{locale}.learn.label` | string | no | yes |
| `fixed_page.l.manifest.label` | L | `locales.{locale}.manifest.label` | string | no | yes |
| `fixed_page.l.manifest.quote` | L | `locales.{locale}.manifest.quote` | string | no | yes |
| `fixed_page.l.manifest.source` | L | `locales.{locale}.manifest.source` | string | no | yes |
| `fixed_page.l.map.caption` | L | `locales.{locale}.map.caption` | string | no | yes |
| `fixed_page.l.map.heading` | L | `locales.{locale}.map.heading` | string | no | yes |
| `fixed_page.l.map.label` | L | `locales.{locale}.map.label` | string | no | yes |
| `fixed_page.l.membership.choose_label` | L | `locales.{locale}.membership.choose_label` | string | no | yes |
| `fixed_page.l.membership.heading` | L | `locales.{locale}.membership.heading` | string | no | yes |
| `fixed_page.l.membership.label` | L | `locales.{locale}.membership.label` | string | no | yes |
| `fixed_page.l.membership.note` | L | `locales.{locale}.membership.note` | string | no | yes |
| `fixed_page.l.membership.p1` | L | `locales.{locale}.membership.p1` | string | no | yes |
| `fixed_page.l.membership.p2` | L | `locales.{locale}.membership.p2` | string | no | yes |
| `fixed_page.l.membership.tiers.item.amount` | L | `locales.{locale}.membership.tiers[].amount` | string | no | yes |
| `fixed_page.l.membership.tiers.item.aria` | L | `locales.{locale}.membership.tiers[].aria` | string | no | yes |
| `fixed_page.l.membership.tiers.item.button` | L | `locales.{locale}.membership.tiers[].button` | string | no | yes |
| `fixed_page.l.membership.tiers.item.desc` | L | `locales.{locale}.membership.tiers[].desc` | string | no | yes |
| `fixed_page.l.membership.tiers.item.icon` | L | `locales.{locale}.membership.tiers[].icon` | string | no | yes |
| `fixed_page.l.membership.tiers.item.name` | L | `locales.{locale}.membership.tiers[].name` | string | no | yes |
| `fixed_page.l.membership.tiers.item.quote` | L | `locales.{locale}.membership.tiers[].quote` | string | no | yes |
| `fixed_page.l.membership.tiers.item.tier_arg` | L | `locales.{locale}.membership.tiers[].tier_arg` | string | no | yes |
| `fixed_page.l.meta.description` | L | `locales.{locale}.meta.description` | string | no | yes |
| `fixed_page.l.meta.og_description` | L | `locales.{locale}.meta.og_description` | string | no | yes |
| `fixed_page.l.meta.og_image_alt` | L | `locales.{locale}.meta.og_image_alt` | string | no | yes |
| `fixed_page.l.meta.og_title` | L | `locales.{locale}.meta.og_title` | string | no | yes |
| `fixed_page.l.meta.title` | L | `locales.{locale}.meta.title` | string | no | yes |
| `fixed_page.l.outlook.heading` | L | `locales.{locale}.outlook.heading` | string | no | yes |
| `fixed_page.l.outlook.intro` | L | `locales.{locale}.outlook.intro` | string | no | yes |
| `fixed_page.l.outlook.label` | L | `locales.{locale}.outlook.label` | string | no | yes |
| `fixed_page.l.philosophy.heading` | L | `locales.{locale}.philosophy.heading` | string | no | yes |
| `fixed_page.l.philosophy.label` | L | `locales.{locale}.philosophy.label` | string | no | yes |
| `fixed_page.l.philosophy.p1` | L | `locales.{locale}.philosophy.p1` | string | no | yes |
| `fixed_page.l.philosophy.p2` | L | `locales.{locale}.philosophy.p2` | string | no | yes |
| `fixed_page.l.philosophy.pillars.item.text` | L | `locales.{locale}.philosophy.pillars[].text` | string | no | yes |
| `fixed_page.l.philosophy.pillars.item.title` | L | `locales.{locale}.philosophy.pillars[].title` | string | no | yes |
| `fixed_page.l.practice.heading` | L | `locales.{locale}.practice.heading` | string | no | yes |
| `fixed_page.l.practice.label` | L | `locales.{locale}.practice.label` | string | no | yes |
| `fixed_page.l.practice.p1` | L | `locales.{locale}.practice.p1` | string | no | yes |
| `fixed_page.l.practice.p2` | L | `locales.{locale}.practice.p2` | string | no | yes |
| `fixed_page.l.practice.poster` | L | `locales.{locale}.practice.poster` | string | no | yes |
| `fixed_page.l.projects.heading` | L | `locales.{locale}.projects.heading` | string | no | yes |
| `fixed_page.l.projects.label` | L | `locales.{locale}.projects.label` | string | no | yes |
| `fixed_page.l.quote` | L | `locales.{locale}.quote` | string | no | yes |
| `fixed_page.l.quote_band.quote` | L | `locales.{locale}.quote_band.quote` | string | no | yes |
| `fixed_page.l.quote_band.source` | L | `locales.{locale}.quote_band.source` | string | no | yes |
| `fixed_page.l.schedule.featured_occurrences.2026_11_16.note` | L | `locales.{locale}.schedule.featured_occurrences.2026-11-16.note` | string | no | yes |
| `fixed_page.l.team.heading` | L | `locales.{locale}.team.heading` | string | no | yes |
| `fixed_page.l.team.label` | L | `locales.{locale}.team.label` | string | no | yes |
| `fixed_page.l.team.members.item.alt` | L | `locales.{locale}.team.members[].alt` | string | no | yes |
| `fixed_page.l.team.members.item.bio` | L | `locales.{locale}.team.members[].bio` | string | no | yes |
| `fixed_page.l.team.members.item.image` | L | `locales.{locale}.team.members[].image` | string | no | yes |
| `fixed_page.l.team.members.item.name` | L | `locales.{locale}.team.members[].name` | string | no | yes |
| `fixed_page.l.team.members.item.role` | L | `locales.{locale}.team.members[].role` | string | no | yes |
| `fixed_page.l.testimonials.heading` | L | `locales.{locale}.testimonials.heading` | string | no | yes |
| `fixed_page.l.testimonials.items.item.author` | L | `locales.{locale}.testimonials.items[].author` | string | no | yes |
| `fixed_page.l.testimonials.items.item.quote` | L | `locales.{locale}.testimonials.items[].quote` | string | no | yes |
| `fixed_page.l.testimonials.label` | L | `locales.{locale}.testimonials.label` | string | no | yes |
| `fixed_page.l.values.cards.item.text` | L | `locales.{locale}.values.cards[].text` | string | no | yes |
| `fixed_page.l.values.cards.item.title` | L | `locales.{locale}.values.cards[].title` | string | no | yes |
| `fixed_page.l.values.heading` | L | `locales.{locale}.values.heading` | string | no | yes |
| `fixed_page.l.values.label` | L | `locales.{locale}.values.label` | string | no | yes |

## journal

Source: `content/journal/records/*.yaml`

Templates: `journal-post`

| Field ID | Class | Storage path | Type | Required | CMS |
| --- | --- | --- | --- | --- | --- |
| `journal.g.global.hero.image.src` | G | `global.hero.image.src` | string | no | yes |
| `journal.g.global.hero.variant` | G | `global.hero.variant` | string | no | yes |
| `journal.g.global.id` | G | `global.id` | string | yes | yes |
| `journal.g.global.image.src` | G | `global.image.src` | string | no | yes |
| `journal.g.global.intended_locales.item` | G | `global.intended_locales[]` | string | no | yes |
| `journal.g.global.meta.og_image` | G | `global.meta.og_image` | string | no | yes |
| `journal.g.global.meta.og_image_height` | G | `global.meta.og_image_height` | integer | no | yes |
| `journal.g.global.meta.og_image_width` | G | `global.meta.og_image_width` | integer | no | yes |
| `journal.g.global.published_at` | G | `global.published_at` | datetime | no | yes |
| `journal.g.global.route` | G | `global.route` | string | no | yes |
| `journal.g.global.sort_order` | G | `global.sort_order` | integer | no | yes |
| `journal.g.global.status` | G | `global.status` | string | yes | yes |
| `journal.g.global.tally` | G | `global.tally` | boolean | no | yes |
| `journal.l.body` | L | `locales.{locale}.body` | string / markdown_file | no | no |
| `journal.l.cta.buttons.item.href` | L | `locales.{locale}.cta.buttons[].href` | string | no | yes |
| `journal.l.cta.buttons.item.kind` | L | `locales.{locale}.cta.buttons[].kind` | string | no | yes |
| `journal.l.cta.buttons.item.label` | L | `locales.{locale}.cta.buttons[].label` | string | no | yes |
| `journal.l.cta.buttons.item.style` | L | `locales.{locale}.cta.buttons[].style` | string | no | yes |
| `journal.l.cta.buttons.item.tally_open` | L | `locales.{locale}.cta.buttons[].tally_open` | string | no | yes |
| `journal.l.cta.heading` | L | `locales.{locale}.cta.heading` | string | no | yes |
| `journal.l.cta.text` | L | `locales.{locale}.cta.text` | string | no | yes |
| `journal.l.excerpt` | L | `locales.{locale}.excerpt` | string | no | yes |
| `journal.l.hero_alt` | L | `locales.{locale}.hero_alt` | string | no | yes |
| `journal.l.homepage_excerpt` | L | `locales.{locale}.homepage_excerpt` | string | no | yes |
| `journal.l.homepage_image_alt` | L | `locales.{locale}.homepage_image_alt` | string | no | yes |
| `journal.l.homepage_title` | L | `locales.{locale}.homepage_title` | string | no | yes |
| `journal.l.image_alt` | L | `locales.{locale}.image_alt` | string | no | yes |
| `journal.l.meta.description` | L | `locales.{locale}.meta.description` | string | no | yes |
| `journal.l.meta.og_description` | L | `locales.{locale}.meta.og_description` | string | no | yes |
| `journal.l.meta.og_image_alt` | L | `locales.{locale}.meta.og_image_alt` | string | no | yes |
| `journal.l.meta.og_title` | L | `locales.{locale}.meta.og_title` | string | no | yes |
| `journal.l.meta.title` | L | `locales.{locale}.meta.title` | string | no | yes |
| `journal.l.title` | L | `locales.{locale}.title` | string | no | yes |
| `journal.l.title_html` | L | `locales.{locale}.title_html` | string | no | yes |

## legal_page

Source: `content/legal/records/*.yaml`

Templates: `legal`

| Field ID | Class | Storage path | Type | Required | CMS |
| --- | --- | --- | --- | --- | --- |
| `legal_page.g.global.id` | G | `global.id` | string | yes | yes |
| `legal_page.g.global.intended_locales.item` | G | `global.intended_locales[]` | string | no | yes |
| `legal_page.g.global.meta.og_image` | G | `global.meta.og_image` | string | no | yes |
| `legal_page.g.global.meta.og_image_height` | G | `global.meta.og_image_height` | integer | no | yes |
| `legal_page.g.global.meta.og_image_width` | G | `global.meta.og_image_width` | integer | no | yes |
| `legal_page.g.global.route` | G | `global.route` | string | no | yes |
| `legal_page.g.global.status` | G | `global.status` | string | yes | yes |
| `legal_page.l.body` | L | `locales.{locale}.body` | string / markdown_file | no | no |
| `legal_page.l.heading` | L | `locales.{locale}.heading` | string | no | yes |
| `legal_page.l.meta.description` | L | `locales.{locale}.meta.description` | string | no | yes |
| `legal_page.l.meta.og_description` | L | `locales.{locale}.meta.og_description` | string | no | yes |
| `legal_page.l.meta.og_image_alt` | L | `locales.{locale}.meta.og_image_alt` | string | no | yes |
| `legal_page.l.meta.og_title` | L | `locales.{locale}.meta.og_title` | string | no | yes |
| `legal_page.l.meta.title` | L | `locales.{locale}.meta.title` | string | no | yes |

## site_settings

Source: `content/site.yaml`

Templates: `site`

| Field ID | Class | Storage path | Type | Required | CMS |
| --- | --- | --- | --- | --- | --- |
| `site_settings.g.global.id` | G | `global.id` | string | yes | yes |
| `site_settings.g.global.intended_locales.item` | G | `global.intended_locales[]` | string | no | yes |
| `site_settings.g.global.nav.about_url` | G | `global.nav.about_url` | string | no | yes |
| `site_settings.g.global.nav.cta_url` | G | `global.nav.cta_url` | string | no | yes |
| `site_settings.g.global.nav.home_url` | G | `global.nav.home_url` | string | no | yes |
| `site_settings.g.global.nav.join_url` | G | `global.nav.join_url` | string | no | yes |
| `site_settings.g.global.nav.journal_url` | G | `global.nav.journal_url` | string | no | yes |
| `site_settings.g.global.nav.program_url` | G | `global.nav.program_url` | string | no | yes |
| `site_settings.g.global.seo.default_og_image` | G | `global.seo.default_og_image` | string | no | yes |
| `site_settings.g.global.seo.default_og_image_height` | G | `global.seo.default_og_image_height` | integer | no | yes |
| `site_settings.g.global.seo.default_og_image_width` | G | `global.seo.default_og_image_width` | integer | no | yes |
| `site_settings.g.global.status` | G | `global.status` | string | yes | yes |
| `site_settings.l.footer.brand_text` | L | `locales.{locale}.footer.brand_text` | string | no | yes |
| `site_settings.l.footer.connect_heading` | L | `locales.{locale}.footer.connect_heading` | string | no | yes |
| `site_settings.l.footer.contact_label` | L | `locales.{locale}.footer.contact_label` | string | no | yes |
| `site_settings.l.footer.pages_heading` | L | `locales.{locale}.footer.pages_heading` | string | no | yes |
| `site_settings.l.footer.tagline` | L | `locales.{locale}.footer.tagline` | string | no | yes |
| `site_settings.l.nav.about` | L | `locales.{locale}.nav.about` | string | no | yes |
| `site_settings.l.nav.cta` | L | `locales.{locale}.nav.cta` | string | no | yes |
| `site_settings.l.nav.home` | L | `locales.{locale}.nav.home` | string | no | yes |
| `site_settings.l.nav.join` | L | `locales.{locale}.nav.join` | string | no | yes |
| `site_settings.l.nav.journal` | L | `locales.{locale}.nav.journal` | string | no | yes |
| `site_settings.l.nav.program` | L | `locales.{locale}.nav.program` | string | no | yes |
| `site_settings.l.seo.default_og_image_alt` | L | `locales.{locale}.seo.default_og_image_alt` | string | no | yes |
| `site_settings.l.workshop_ui.detail_label` | L | `locales.{locale}.workshop_ui.detail_label` | string | no | yes |
| `site_settings.l.workshop_ui.facilitators_label` | L | `locales.{locale}.workshop_ui.facilitators_label` | string | no | yes |
| `site_settings.l.workshop_ui.faq_label` | L | `locales.{locale}.workshop_ui.faq_label` | string | no | yes |
| `site_settings.l.workshop_ui.format_label` | L | `locales.{locale}.workshop_ui.format_label` | string | no | yes |
| `site_settings.l.workshop_ui.info_title` | L | `locales.{locale}.workshop_ui.info_title` | string | no | yes |
| `site_settings.l.workshop_ui.location_label` | L | `locales.{locale}.workshop_ui.location_label` | string | no | yes |
| `site_settings.l.workshop_ui.price_label` | L | `locales.{locale}.workshop_ui.price_label` | string | no | yes |
| `site_settings.l.workshop_ui.schedule_label` | L | `locales.{locale}.workshop_ui.schedule_label` | string | no | yes |
| `site_settings.l.workshop_ui.testimonials_label` | L | `locales.{locale}.workshop_ui.testimonials_label` | string | no | yes |

## venue

Source: `content/venues/*.yaml`

Templates:

| Field ID | Class | Storage path | Type | Required | CMS |
| --- | --- | --- | --- | --- | --- |
| `venue.g.global.city` | G | `global.city` | string | yes | yes |
| `venue.g.global.country` | G | `global.country` | string | yes | yes |
| `venue.g.global.geo_lat` | G | `global.geo_lat` | number | no | yes |
| `venue.g.global.geo_lng` | G | `global.geo_lng` | number | no | yes |
| `venue.g.global.id` | G | `global.id` | string | yes | yes |
| `venue.g.global.name` | G | `global.name` | string | yes | yes |
| `venue.g.global.postal_code` | G | `global.postal_code` | string | yes | yes |
| `venue.g.global.street` | G | `global.street` | string | yes | yes |
| `venue.g.global.url` | G | `global.url` | string | no | yes |

## workshop

Source: `content/workshops/*.yaml`

Templates: `workshop`

| Field ID | Class | Storage path | Type | Required | CMS |
| --- | --- | --- | --- | --- | --- |
| `workshop.g.global.description.show_info` | G | `global.description.show_info` | boolean | no | yes |
| `workshop.g.global.detail_page` | G | `global.detail_page` | boolean | no | yes |
| `workshop.g.global.hero.inset_image` | G | `global.hero.inset_image` | string | no | yes |
| `workshop.g.global.hero.inset_image_focus` | G | `global.hero.inset_image_focus` | string | no | yes |
| `workshop.g.global.hero.main_image` | G | `global.hero.main_image` | string | no | yes |
| `workshop.g.global.hero.main_image_focus` | G | `global.hero.main_image_focus` | string | no | yes |
| `workshop.g.global.hero.show_details` | G | `global.hero.show_details` | boolean | no | yes |
| `workshop.g.global.hero.video` | G | `global.hero.video` | string | no | yes |
| `workshop.g.global.hero.video_poster` | G | `global.hero.video_poster` | string | no | yes |
| `workshop.g.global.id` | G | `global.id` | string | yes | yes |
| `workshop.g.global.image_band.image` | G | `global.image_band.image` | string | no | yes |
| `workshop.g.global.image_band.image_focus` | G | `global.image_band.image_focus` | string | no | yes |
| `workshop.g.global.intended_locales.item` | G | `global.intended_locales[]` | string | no | yes |
| `workshop.g.global.meta.og_image` | G | `global.meta.og_image` | string | no | yes |
| `workshop.g.global.meta.og_image_height` | G | `global.meta.og_image_height` | integer | no | yes |
| `workshop.g.global.meta.og_image_width` | G | `global.meta.og_image_width` | integer | no | yes |
| `workshop.g.global.registration.availability` | G | `global.registration.availability` | string | no | yes |
| `workshop.g.global.registration.url` | G | `global.registration.url` | string | no | yes |
| `workshop.g.global.route` | G | `global.route` | string | no | yes |
| `workshop.g.global.schedule.event_status` | G | `global.schedule.event_status` | string | no | yes |
| `workshop.g.global.schedule.featured_occurrences.item.id` | G | `global.schedule.featured_occurrences[].id` | string | yes | yes |
| `workshop.g.global.schedule.featured_occurrences.item.teacher` | G | `global.schedule.featured_occurrences[].teacher` | string | no | yes |
| `workshop.g.global.schedule.mode` | G | `global.schedule.mode` | string | no | yes |
| `workshop.g.global.schedule.previous_start_local` | G | `global.schedule.previous_start_local` | null | no | yes |
| `workshop.g.global.schedule.recurrence.anchor` | G | `global.schedule.recurrence.anchor` | string | yes | yes |
| `workshop.g.global.schedule.recurrence.end_time` | G | `global.schedule.recurrence.end_time` | string | yes | yes |
| `workshop.g.global.schedule.recurrence.except.item` | G | `global.schedule.recurrence.except[]` | array | no | yes |
| `workshop.g.global.schedule.recurrence.horizon_months` | G | `global.schedule.recurrence.horizon_months` | integer | yes | yes |
| `workshop.g.global.schedule.recurrence.start_time` | G | `global.schedule.recurrence.start_time` | string | yes | yes |
| `workshop.g.global.schedule.recurrence.weekday` | G | `global.schedule.recurrence.weekday` | string | yes | yes |
| `workshop.g.global.schedule.sessions.item.end_local` | G | `global.schedule.sessions[].end_local` | string | no | yes |
| `workshop.g.global.schedule.sessions.item.id` | G | `global.schedule.sessions[].id` | string | no | yes |
| `workshop.g.global.schedule.sessions.item.start_local` | G | `global.schedule.sessions[].start_local` | string | no | yes |
| `workshop.g.global.schedule.sessions.item.status` | G | `global.schedule.sessions[].status` | string | no | yes |
| `workshop.g.global.sort_order` | G | `global.sort_order` | integer | no | yes |
| `workshop.g.global.start_at` | G | `global.start_at` | datetime | no | yes |
| `workshop.g.global.status` | G | `global.status` | string | yes | yes |
| `workshop.g.global.updated_at` | G | `global.updated_at` | datetime | no | yes |
| `workshop.g.global.venue` | G | `global.venue` | string | no | yes |
| `workshop.l.card.detail_label` | L | `locales.{locale}.card.detail_label` | string | no | yes |
| `workshop.l.card.subtitle` | L | `locales.{locale}.card.subtitle` | string | no | yes |
| `workshop.l.card.summary` | L | `locales.{locale}.card.summary` | string | no | yes |
| `workshop.l.card.tags.item.label` | L | `locales.{locale}.card.tags[].label` | string | no | yes |
| `workshop.l.card.tags.item.style` | L | `locales.{locale}.card.tags[].style` | string | no | yes |
| `workshop.l.closing_cta.button_label` | L | `locales.{locale}.closing_cta.button_label` | string | no | yes |
| `workshop.l.closing_cta.heading` | L | `locales.{locale}.closing_cta.heading` | string | no | yes |
| `workshop.l.closing_cta.text` | L | `locales.{locale}.closing_cta.text` | string | no | yes |
| `workshop.l.description.body` | L | `locales.{locale}.description.body` | string | no | yes |
| `workshop.l.description.heading` | L | `locales.{locale}.description.heading` | string | no | yes |
| `workshop.l.description.info_title` | L | `locales.{locale}.description.info_title` | string | no | yes |
| `workshop.l.description.label` | L | `locales.{locale}.description.label` | string | no | yes |
| `workshop.l.facilitators.heading` | L | `locales.{locale}.facilitators.heading` | string | no | yes |
| `workshop.l.facilitators.label` | L | `locales.{locale}.facilitators.label` | string | no | yes |
| `workshop.l.facilitators.members.item.alt` | L | `locales.{locale}.facilitators.members[].alt` | string | no | yes |
| `workshop.l.facilitators.members.item.bio` | L | `locales.{locale}.facilitators.members[].bio` | string | no | yes |
| `workshop.l.facilitators.members.item.image` | L | `locales.{locale}.facilitators.members[].image` | string | no | yes |
| `workshop.l.facilitators.members.item.image_focus` | L | `locales.{locale}.facilitators.members[].image_focus` | string | no | yes |
| `workshop.l.facilitators.members.item.name` | L | `locales.{locale}.facilitators.members[].name` | string | no | yes |
| `workshop.l.facilitators.members.item.role` | L | `locales.{locale}.facilitators.members[].role` | string | no | yes |
| `workshop.l.facilitators.quotes.item.author` | L | `locales.{locale}.facilitators.quotes[].author` | string | no | yes |
| `workshop.l.facilitators.quotes.item.quote` | L | `locales.{locale}.facilitators.quotes[].quote` | string | no | yes |
| `workshop.l.facts.date` | L | `locales.{locale}.facts.date` | string | no | yes |
| `workshop.l.facts.duration` | L | `locales.{locale}.facts.duration` | string | no | yes |
| `workshop.l.facts.format.item` | L | `locales.{locale}.facts.format[]` | array | no | yes |
| `workshop.l.facts.format.item.value` | L | `locales.{locale}.facts.format[].value` | string | no | yes |
| `workshop.l.facts.location` | L | `locales.{locale}.facts.location` | string | no | yes |
| `workshop.l.facts.price` | L | `locales.{locale}.facts.price` | string | no | yes |
| `workshop.l.facts.price_details.item` | L | `locales.{locale}.facts.price_details[]` | array | no | yes |
| `workshop.l.facts.price_details.item.value` | L | `locales.{locale}.facts.price_details[].value` | string | no | yes |
| `workshop.l.facts.schedule.item` | L | `locales.{locale}.facts.schedule[]` | array | no | yes |
| `workshop.l.facts.schedule.item.value` | L | `locales.{locale}.facts.schedule[].value` | string | no | yes |
| `workshop.l.facts.time` | L | `locales.{locale}.facts.time` | string | no | yes |
| `workshop.l.faq.heading` | L | `locales.{locale}.faq.heading` | string | no | yes |
| `workshop.l.faq.items.item.a` | L | `locales.{locale}.faq.items[].a` | string | no | yes |
| `workshop.l.faq.items.item.q` | L | `locales.{locale}.faq.items[].q` | string | no | yes |
| `workshop.l.faq.label` | L | `locales.{locale}.faq.label` | string | no | yes |
| `workshop.l.hero.badge` | L | `locales.{locale}.hero.badge` | string | no | yes |
| `workshop.l.hero.headline` | L | `locales.{locale}.hero.headline` | string | no | yes |
| `workshop.l.hero.headline_accent` | L | `locales.{locale}.hero.headline_accent` | string | no | yes |
| `workshop.l.hero.inset_alt` | L | `locales.{locale}.hero.inset_alt` | string | no | yes |
| `workshop.l.hero.main_alt` | L | `locales.{locale}.hero.main_alt` | string | no | yes |
| `workshop.l.hero.note_text` | L | `locales.{locale}.hero.note_text` | string | no | yes |
| `workshop.l.hero.note_title` | L | `locales.{locale}.hero.note_title` | string | no | yes |
| `workshop.l.hero.subtitle` | L | `locales.{locale}.hero.subtitle` | string | no | yes |
| `workshop.l.hero.video_poster` | L | `locales.{locale}.hero.video_poster` | string | no | yes |
| `workshop.l.hero.visual_aria` | L | `locales.{locale}.hero.visual_aria` | string | no | yes |
| `workshop.l.image_band.alt` | L | `locales.{locale}.image_band.alt` | string | no | yes |
| `workshop.l.image_band.body` | L | `locales.{locale}.image_band.body` | string | no | yes |
| `workshop.l.image_band.heading` | L | `locales.{locale}.image_band.heading` | string | no | yes |
| `workshop.l.image_band.label` | L | `locales.{locale}.image_band.label` | string | no | yes |
| `workshop.l.meta.description` | L | `locales.{locale}.meta.description` | string | no | yes |
| `workshop.l.meta.og_description` | L | `locales.{locale}.meta.og_description` | string | no | yes |
| `workshop.l.meta.og_image_alt` | L | `locales.{locale}.meta.og_image_alt` | string | no | yes |
| `workshop.l.meta.og_title` | L | `locales.{locale}.meta.og_title` | string | no | yes |
| `workshop.l.meta.title` | L | `locales.{locale}.meta.title` | string | no | yes |
| `workshop.l.registration.label` | L | `locales.{locale}.registration.label` | string | no | yes |
| `workshop.l.registration.note` | L | `locales.{locale}.registration.note` | string | no | yes |
| `workshop.l.research.fields.item.highlighted` | L | `locales.{locale}.research.fields[].highlighted` | boolean | no | yes |
| `workshop.l.research.fields.item.number` | L | `locales.{locale}.research.fields[].number` | string | no | yes |
| `workshop.l.research.fields.item.text` | L | `locales.{locale}.research.fields[].text` | string | no | yes |
| `workshop.l.research.fields.item.title` | L | `locales.{locale}.research.fields[].title` | string | no | yes |
| `workshop.l.research.heading` | L | `locales.{locale}.research.heading` | string | no | yes |
| `workshop.l.research.label` | L | `locales.{locale}.research.label` | string | no | yes |
| `workshop.l.title` | L | `locales.{locale}.title` | string | no | yes |

## Enums

- `availability`: `available`, `sold_out`, `waitlist`, `unavailable`
- `event_status`: `scheduled`, `cancelled`, `postponed`, `rescheduled`, `moved_online`
- `event_type`: `jam`, `performance`, `talk`, `retreat`, `other`
- `focal_point`: `center`, `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, `bottom-right`
- `journal_hero_variant`: `cover`, `contained`
- `page_mode`: `minimal`, `full`
- `pricing_model`: `fixed`, `donation`, `sliding_scale`, `free`
- `schedule_mode`: `dates`, `recurring`
- `status`: `draft`, `published`, `unlisted`, `upcoming`, `current`, `past`, `coming_soon`
- `weekday`: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

