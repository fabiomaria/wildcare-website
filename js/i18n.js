/* ============================================
   Wild Care — Language Toggle (i18n)
   Reads data-de / data-en attributes and swaps
   text content based on the active language.
   Runs immediately (script is loaded at end of body).
   ============================================ */

(function () {
    var STORAGE_KEY = 'wc-lang';
    var DEFAULT_LANG = 'de';

    // Decode HTML entities via textarea (safe, no script execution)
    var decoder = document.createElement('textarea');
    function decode(html) {
        decoder.innerHTML = html;
        return decoder.value;
    }

    // Safely set element content, allowing only <br> tags
    function setContent(el, raw) {
        var decoded = decode(raw);
        if (decoded.indexOf('<br>') !== -1) {
            var parts = decoded.split('<br>');
            el.textContent = '';
            for (var i = 0; i < parts.length; i++) {
                if (i > 0) el.appendChild(document.createElement('br'));
                el.appendChild(document.createTextNode(parts[i]));
            }
        } else {
            el.textContent = decoded;
        }
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
                setContent(el, text);
            }
        });

        // Update toggle buttons
        document.querySelectorAll('.lang-toggle-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }

    // Apply immediately — script is at end of body so DOM is ready
    var lang = getLang();
    apply(lang);

    // Bind toggle buttons
    document.querySelectorAll('.lang-toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setLang(btn.getAttribute('data-lang'));
        });
    });
})();
