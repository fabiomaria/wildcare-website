(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const slides = [
    ['Schön, dass du da bist.', 'Willkommen bei Kollektiv|ver|körpern', 'Eine Einladung, deinem Körper und anderen zu begegnen.'],
    ['01 / Ankommen', 'Nimm dir Zeit.', 'Setze deine Kopfhörer auf und stelle die Lautstärke angenehm ein. Such dir einen Platz, an dem du ankommen kannst.'],
    ['02 / Ausprobieren', 'Folge deinem Körper.', 'Die Audioimpulse sind Angebote. Du kannst ihnen folgen, sie verändern oder bei dem bleiben, was du gerade tust. Auch Stille gehört dazu.'],
    ['03 / Bei dir bleiben', 'Du entscheidest.', 'Pausieren und Zusehen ist jederzeit möglich. Du musst nichts vorführen. Im Bereich zum Zuschauen wirst du nicht in Interaktionen einbezogen.']
  ];
  // Demo chapter positions in seconds. Replace alongside the final recording.
  const chapters = [0, 60, 120, 180];
  const duration = 180;
  let slide = 0, position = 0, playing = false, lastTick = 0;
  function showSlide() {
    $('onboarding').hidden = false; $('player').hidden = true;
    $('step-label').textContent = slides[slide][0];
    $('screen-title').textContent = slides[slide][1];
    $('screen-copy').textContent = slides[slide][2];
    $('back').hidden = slide === 0;
    $('next').firstChild.textContent = slide === slides.length - 1 ? 'Zum Player ' : 'Weiter ';
    $('pager').innerHTML = slides.map((_, i) => `<span class="${i === slide ? 'active' : ''}"${i === slide ? ' aria-current="step"' : ''}></span>`).join('');
  }
  function advance() {
    if (slide < slides.length - 1) { slide++; showSlide(); }
    else { $('onboarding').hidden = true; $('player').hidden = false; $('play').focus(); }
  }
  function setPlaying(value) {
    playing = value;
    lastTick = performance.now();
    $('play').setAttribute('aria-pressed', String(value));
    $('play').setAttribute('aria-label', value ? 'Demo pausieren' : 'Demo starten');
    $('play-icon').setAttribute('d', value ? 'M14 10H21V38H14Z M28 10H35V38H28Z' : 'M17 10 L39 24 L17 38 Z');
  }
  const format = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function render() {
    $('time').textContent = `${format(position)} / ${format(duration)}`;
    $('progress').style.height = `${position / duration * 100}%`;
    [...$('nodes').children].forEach((node, i) => node.classList.toggle('passed', position >= chapters[i]));
    document.querySelector('.score-timeline').setAttribute('aria-label', `Demo-Fortschritt: ${format(position)} von ${format(duration)}`);
  }
  $('nodes').innerHTML = chapters.map(t => `<span class="score-node" style="top:${t / duration * 100}%"></span>`).join('');
  $('next').addEventListener('click', advance);
  $('back').addEventListener('click', () => { slide = Math.max(0, slide - 1); showSlide(); });
  $('play').addEventListener('click', () => { if (position >= duration) position = 0; setPlaying(!playing); render(); });
  $('rewind').addEventListener('click', () => { position = [...chapters].reverse().find(t => t < position) ?? 0; lastTick = performance.now(); render(); });
  $('help').addEventListener('click', () => { setPlaying(false); slide = 1; showSlide(); $('screen-title').tabIndex = -1; $('screen-title').focus(); });
  let touchX = null;
  $('onboarding').addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  $('onboarding').addEventListener('touchend', e => {
    if (touchX === null) return;
    const delta = e.changedTouches[0].clientX - touchX;
    if (delta < -60) advance();
    if (delta > 60 && slide > 0) { slide--; showSlide(); }
    touchX = null;
  }, { passive: true });
  setInterval(() => {
    if (!playing) return;
    const now = performance.now();
    position = Math.min(duration, position + (now - lastTick) / 1000); lastTick = now;
    if (position >= duration) setPlaying(false);
    render();
  }, 150);
  showSlide(); render();
})();
