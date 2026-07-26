"use strict";
const { formatIcsLocal } = require("./datetime");

function googleUrl({ title, details, location, start_local, end_local }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatIcsLocal(start_local)}/${formatIcsLocal(end_local)}`,
    ctz: "Europe/Vienna",
  });
  if (details) params.set("details", details);
  if (location) params.set("location", location);
  return "https://calendar.google.com/calendar/render?" + params.toString();
}

module.exports = { googleUrl };
