// Wild Care — Scroll animations + mobile nav
// This script was previously inlined in every page. Now shared.

(function () {
    // Fade-up animations
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.fade-up').forEach(function (el) {
        observer.observe(el);
    });

    // Mobile nav toggle
    var navToggle = document.querySelector('.nav-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function () {
            navLinks.classList.toggle('open');
        });
    }

    // Transparent nav scroll behaviour (only active on pages with .has-hero-video)
    if (document.body.classList.contains('has-hero-video')) {
        var nav = document.querySelector('nav');
        function updateNavState() {
            if (window.scrollY > 80) {
                nav.classList.add('nav-scrolled');
            } else {
                nav.classList.remove('nav-scrolled');
            }
        }
        updateNavState();
        window.addEventListener('scroll', updateNavState, { passive: true });
    }
})();
