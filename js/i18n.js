/* ============================================
   Wild Care — Language Toggle (i18n)
   Reads data-de / data-en attributes and swaps
   text content based on the active language.
   ============================================ */

(function () {
    var STORAGE_KEY = 'wc-lang';
    var DEFAULT_LANG = document.documentElement.lang || 'de';

    // Safe HTML entity decoder using a textarea (no script execution)
    var decoder = document.createElement('textarea');
    function decode(html) {
        decoder.innerHTML = html;
        return decoder.value;
    }

    function getLang() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    }

    function setLang(lang) {
        localStorage.setItem(STORAGE_KEY, lang);
        apply(lang);
    }

    function apply(lang) {
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-de][data-en]').forEach(function (el) {
            var text = el.getAttribute('data-' + lang);
            if (text !== null) {
                el.textContent = decode(text);
            }
        });

        // Update toggle buttons
        document.querySelectorAll('.lang-toggle-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }

    // Bind toggle buttons
    document.addEventListener('DOMContentLoaded', function () {
        var lang = getLang();
        apply(lang);

        document.querySelectorAll('.lang-toggle-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setLang(btn.getAttribute('data-lang'));
            });
        });
    });
})();
