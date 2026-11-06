/* Presentation adapter for the pinned Sveltia CMS 0.171.1 list markup.
 * Never removes, reorders or writes content: hidden rows stay in the CMS draft.
 * Keep these selectors covered when upgrading Sveltia.
 */
(function () {
  "use strict";
  const states = new WeakMap();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  function nowLocal() {
    return formatter.format(new Date()).replace(" ", "T");
  }
  function endOfItem(item, key) {
    const isSession = key.endsWith(".sessions");
    const suffix = isSession ? ".end_local" : ".id";
    const input = item.querySelector(`[data-key-path$="${suffix}"] input`)
      || (!isSession && item.querySelector('input[type="date"]'));
    // Expanded fields are authoritative, including empty/unfinished edits.
    if (input) return input.value;
    const summary = item.querySelector(".item-body .summary");
    const dates = summary?.textContent.match(/\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?/g) || [];
    return isSession ? dates[1] : dates[0];
  }
  function refresh() {
    const now = nowLocal();
    document.querySelectorAll('[data-field-type="list"][data-key-path]').forEach((field) => {
      const key = field.dataset.keyPath;
      if (!/^global\.schedule\.(sessions|featured_occurrences|recurrence\.except)$/.test(key)) return;
      const list = field.querySelector('.item-list[id^="list-"]');
      if (!list) return;
      let state = states.get(field);
      if (!state) {
        const toolbar = document.createElement("div");
        toolbar.setAttribute("role", "group");
        toolbar.setAttribute("aria-label", "Event view");
        const upcoming = document.createElement("button");
        const past = document.createElement("button");
        upcoming.type = past.type = "button";
        toolbar.append(upcoming, document.createTextNode(" "), past);
        list.before(toolbar);
        state = { view: "upcoming", upcoming, past };
        states.set(field, state);
        for (const [button, view] of [[upcoming, "upcoming"], [past, "past"]]) {
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            state.view = view;
            refresh();
          });
        }
      }
      let pastCount = 0;
      let upcomingCount = 0;
      list.querySelectorAll(":scope > .item").forEach((item) => {
        const end = endOfItem(item, key);
        const valid = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(end || "");
        const past = valid && (end.length === 10 ? end < now.slice(0, 10) : end <= now);
        past ? pastCount++ : upcomingCount++;
        // Incomplete new rows stay visible in either view. Do not interrupt typing.
        item.hidden = valid && past !== (state.view === "past") && !item.contains(document.activeElement);
      });
      for (const [button, label, count, view] of [
        [state.upcoming, "Upcoming", upcomingCount, "upcoming"],
        [state.past, "Past events", pastCount, "past"],
      ]) {
        const text = `${label} (${count})`;
        if (button.textContent !== text) button.textContent = text;
        button.setAttribute("aria-pressed", String(state.view === view));
      }
    });
  }
  let queued = false;
  function queueRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; refresh(); });
  }
  new MutationObserver(queueRefresh).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener("input", queueRefresh);
  document.addEventListener("focusout", queueRefresh);
  setInterval(queueRefresh, 60000);
  queueRefresh();
})();
