"use strict";
const ORIGIN = "https://wildcare.space";
const SCHEMA = "https://schema.org/";

const STATUS = { scheduled: "EventScheduled", cancelled: "EventCancelled", postponed: "EventPostponed", rescheduled: "EventRescheduled", moved_online: "EventMovedOnline" };
const AVAIL = { available: "InStock", sold_out: "SoldOut", waitlist: "PreOrder", unavailable: "OutOfStock" };
const BYDAY = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

function statusUrl(s) { return SCHEMA + (STATUS[s] || "EventScheduled"); }
function availUrl(a) { return SCHEMA + (AVAIL[a] || "InStock"); }
function placeOf(v) {
  return { "@type": "Place", name: v.name, address: { "@type": "PostalAddress", streetAddress: v.street, postalCode: v.postal_code, addressLocality: v.city, addressCountry: v.country } };
}
function organizer() { return { "@type": "Organization", name: "Wild Care", url: ORIGIN }; }

function base(def, locale) {
  const l = def.locales[locale] || {};
  const obj = {
    "@context": "https://schema.org", "@type": "Event",
    name: l.title,
    eventStatus: statusUrl(def.eventStatus),
    eventAttendanceMode: SCHEMA + "OfflineEventAttendanceMode",
    location: placeOf(def.venue),
    organizer: organizer(),
    url: ORIGIN + def.route,
  };
  if (l.summary) obj.description = l.summary;
  if (def.image) obj.image = def.image;
  return obj;
}

function eventJsonLd(def, { locale }) {
  const obj = base(def, locale);
  obj.startDate = def.span.start;
  obj.endDate = def.span.end;
  if (def.eventStatus === "rescheduled" && def.previousStart) obj.previousStartDate = def.previousStart;
  if (def.registrationUrl) obj.offers = { "@type": "Offer", url: def.registrationUrl, availability: availUrl(def.availability) };
  return obj;
}

function recurringJsonLd(def, { locale }) {
  const obj = base(def, locale);
  obj.eventSchedule = {
    "@type": "Schedule", repeatFrequency: "P1W",
    byDay: SCHEMA + BYDAY[def.recurrence.weekday],
    startTime: def.recurrence.start_time, endTime: def.recurrence.end_time,
  };
  return obj;
}

module.exports = { eventJsonLd, recurringJsonLd };
