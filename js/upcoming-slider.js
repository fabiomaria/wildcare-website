/* ============================================
   Wild Care — Upcoming events slider
   Scroll-snap horizontal track: prev/next arrows scroll by one card
   width, dots reflect scroll position and jump to a card on click.
   Supports multiple .upcoming-slider instances on one page (there
   currently aren't, but the homepage and programme page each load
   this script independently).
   ============================================ */

(function () {
    var CARD_GAP_PX = 16; // matches --space-md in css/styles.css

    var tracks = document.querySelectorAll('[data-upcoming-track]');

    tracks.forEach(function (track) {
        var section = track.closest('.upcoming-slider');
        if (!section) return;

        var prevBtn = section.querySelector('[data-upcoming-prev]');
        var nextBtn = section.querySelector('[data-upcoming-next]');
        var dotsWrap = section.querySelector('[data-upcoming-dots]');
        var cards = Array.prototype.slice.call(track.children);
        if (!cards.length || !dotsWrap) return;

        var dots = [];
        cards.forEach(function (card, index) {
            var dot = document.createElement('button');
            dot.className = 'upcoming-dot' + (index === 0 ? ' is-active' : '');
            dot.setAttribute('aria-label', 'Item ' + (index + 1));
            dot.addEventListener('click', function () {
                card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
            });
            dotsWrap.appendChild(dot);
            dots.push(dot);
        });

        function updateActive() {
            var trackLeft = track.scrollLeft;
            var closest = 0;
            var closestDist = Infinity;
            cards.forEach(function (card, index) {
                var dist = Math.abs(card.offsetLeft - trackLeft);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = index;
                }
            });
            dots.forEach(function (dot, index) {
                dot.classList.toggle('is-active', index === closest);
            });
            if (prevBtn) prevBtn.disabled = closest === 0;
            if (nextBtn) nextBtn.disabled = closest === cards.length - 1;
        }

        var cardWidth = cards[0].getBoundingClientRect().width + CARD_GAP_PX;
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                track.scrollBy({ left: -cardWidth, behavior: 'smooth' });
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                track.scrollBy({ left: cardWidth, behavior: 'smooth' });
            });
        }

        track.addEventListener('scroll', function () {
            window.requestAnimationFrame(updateActive);
        });
        updateActive();
    });
})();
