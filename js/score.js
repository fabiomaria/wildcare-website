(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const I18N = {
    de: {
      next: 'Weiter',
      toPlayer: 'Ich trete ein',
      back: 'Zurück',
      langLabel: 'Text & Untertitel:',
      langNote: '* Original-Tonspur ist auf Deutsch',
      playStart: 'Wiedergabe starten',
      playPause: 'Wiedergabe pausieren',
      resetLabel: 'Zum Anfang dieses Abschnitts springen',
      completed: 'Danke für deine Präsenz und dein Dasein.',
      help: 'Hinweise noch einmal lesen',
      offlineReady: 'Offline bereit',
      loadingProgress: (p) => 'Laden für Offline … ' + p + '%',
      slides: [
        ['Schön, dass du da bist.', 'Willkommen bei\nKollektiv|ver|körpern', 'Eine Einladung, deinem Körper und anderen zu begegnen.'],
        ['01 / Ankommen', 'Nimm dir Zeit.', 'Setze deine Kopfhörer auf und stelle die Lautstärke angenehm ein. Such dir einen Platz, an dem du ankommen kannst.'],
        ['02 / Ausprobieren', 'Folge deinem Körper.', 'Die Audioimpulse sind Angebote. Du kannst ihnen folgen, sie verändern oder bei dem bleiben, was du gerade tust. Auch Stille gehört dazu.'],
        ['03 / Bei dir bleiben', 'Du entscheidest.', 'Pausieren und Zusehen ist jederzeit möglich. Du musst nichts vorführen. Im Bereich zum Zuschauen wirst du nicht in Interaktionen einbezogen.'],
        ['Eintritt', 'In diesem Schritt trittst du in die Performance ein.', 'Bitte respektiere diesen Raum.']
      ]
    },
    en: {
      next: 'Next',
      toPlayer: 'I enter',
      back: 'Back',
      langLabel: 'Text & subtitles:',
      langNote: '* Original audio remains in German',
      playStart: 'Start playback',
      playPause: 'Pause playback',
      resetLabel: 'Jump to start of this section',
      completed: 'Thank you for your presence and being here.',
      help: 'Read guidance again',
      offlineReady: 'Offline ready',
      loadingProgress: (p) => 'Downloading for offline … ' + p + '%',
      slides: [
        ['Glad you are here.', 'Welcome to\nKollektiv|ver|körpern', 'An invitation to encounter your body and others.'],
        ['01 / Arriving', 'Take your time.', 'Put on your headphones and adjust the volume comfortably. Find a place where you can arrive.'],
        ['02 / Exploring', 'Follow your body.', 'The audio impulses are invitations. You can follow them, adapt them, or stay with what you are currently doing. Silence is also part of it.'],
        ['03 / Staying with yourself', 'You decide.', 'Pausing and watching is possible at any time. You do not have to perform anything. In the viewing area, you will not be included in interactions.'],
        ['Entrance', 'In this step, you enter the performance.', 'Please respect this space.']
      ]
    }
  };

  let currentLang = 'de';
  try {
    const saved = localStorage.getItem('score_lang');
    if (saved === 'en' || saved === 'de') currentLang = saved;
  } catch (_) {}

  const chapters = [{"id": "intro", "title": {"de": "Intro", "en": "Intro"}, "start": 0.0, "end": 54.37}, {"id": "praxis-1", "title": {"de": "Praxis 1", "en": "Practice 1"}, "start": 54.37, "end": 171.024}, {"id": "praxis-2", "title": {"de": "Praxis 2", "en": "Practice 2"}, "start": 171.024, "end": 330.984}, {"id": "praxis-3", "title": {"de": "Praxis 3", "en": "Practice 3"}, "start": 330.984, "end": 727.64}, {"id": "praxis-4", "title": {"de": "Praxis 4", "en": "Practice 4"}, "start": 727.64, "end": 853.956}, {"id": "abschluss", "title": {"de": "Abschluss", "en": "Closing"}, "start": 853.956, "end": 949.851}];
  const cues = [{"id": 1, "chapterId": "intro", "start": 0.62, "end": 6.3, "de": "Herzlich Willkommen zu einer Erfahrung in diesem Raum und in diesen Kopfhörern.", "en": "Welcome to an experience in this space and in these headphones."}, {"id": 2, "chapterId": "intro", "start": 10.08, "end": 15.96, "de": "Du bist eingeladen, meiner Stimme zuzuhören und meiner Stimme zu folgen.", "en": "You are invited to listen to my voice and to follow my voice."}, {"id": 3, "chapterId": "intro", "start": 17.84, "end": 21.88, "de": "Du bist auch eingeladen, jederzeit etwas anderes zu wählen.", "en": "You are also invited to choose something else at any time."}, {"id": 4, "chapterId": "intro", "start": 24.3, "end": 27.96, "de": "Etwas anderes zu wählen ist nicht immer einfach.", "en": "Choosing something else is not always easy."}, {"id": 5, "chapterId": "intro", "start": 30.0, "end": 31.46, "de": "Deshalb erinnere ich dich daran.", "en": "That is why I remind you of this."}, {"id": 6, "chapterId": "intro", "start": 35.22, "end": 41.16, "de": "Wenn du die Kopfhörer aus den Ohren nimmst, verpasst du nichts.", "en": "When you take the headphones out of your ears, you are not missing anything."}, {"id": 7, "chapterId": "intro", "start": 43.04, "end": 49.04, "de": "Wenn du sie wieder einsetzt, kannst du jederzeit einsteigen.", "en": "When you put them back in, you can rejoin at any moment."}, {"id": 8, "chapterId": "intro", "start": 51.18, "end": 53.06, "de": "Du kannst dich entscheiden.", "en": "You can decide."}, {"id": 9, "chapterId": "praxis-1", "start": 54.37, "end": 63.81, "de": "Du bist eingeladen, jederzeit zuzusehen und den Raum zu beobachten.", "en": "You are invited to watch at any time and observe the space."}, {"id": 10, "chapterId": "praxis-1", "start": 65.93, "end": 76.33, "de": "Du bist jederzeit eingeladen, die Kopfhörer aus den Ohren oder in die Ohren zu setzen oder den Raum zu beobachten.", "en": "You are invited at any time to take the headphones out or put them in, or to observe the space."}, {"id": 11, "chapterId": "praxis-1", "start": 79.27, "end": 82.67, "de": "Du bist auch eingeladen, deinen Platz im Raum zu verändern.", "en": "You are also invited to change your place in the space."}, {"id": 12, "chapterId": "praxis-1", "start": 85.31, "end": 87.41, "de": "Verändere jetzt den Platz im Raum.", "en": "Change your place in the space now."}, {"id": 13, "chapterId": "praxis-1", "start": 91.09, "end": 95.67, "de": "Während du dich im Raum bewegst, nimmst du diesen Raum anders wahr.", "en": "As you move through the space, you perceive this space differently."}, {"id": 14, "chapterId": "praxis-1", "start": 98.47, "end": 105.81, "de": "Du bist eingeladen, jederzeit den Raum zu beobachten oder deinen Platz im Raum zu verändern.", "en": "You are invited to observe the space or change your place in the space at any time."}, {"id": 15, "chapterId": "praxis-1", "start": 105.81, "end": 115.41, "de": "Während der nächsten Minute such dir einen Platz im Raum, an dem du gerne einige Zeit stehen möchtest.", "en": "During the next minute, find a place in the space where you would like to stand for a while."}, {"id": 16, "chapterId": "praxis-1", "start": 115.41, "end": 122.89, "de": "Das muss kein besonderer Platz sein, nichts überblicken.", "en": "This doesn't need to be a special place, nothing to overlook."}, {"id": 17, "chapterId": "praxis-1", "start": 125.05, "end": 128.69, "de": "Es soll aber ein Platz sein, an dem du dich wohlfühlst.", "en": "It should simply be a place where you feel comfortable."}, {"id": 18, "chapterId": "praxis-1", "start": 128.69, "end": 137.05, "de": "Wir werden während der nächsten Übung die Augen schließen.", "en": "During the next exercise, we will close our eyes."}, {"id": 19, "chapterId": "praxis-1", "start": 138.75, "end": 143.49, "de": "Du bist jederzeit eingeladen, die Augen zu schließen oder zu öffnen.", "en": "You are invited at any time to close or open your eyes."}, {"id": 20, "chapterId": "praxis-1", "start": 143.49, "end": 149.97, "de": "Zuzusehen, den Raum zu beobachten oder deinen Platz im Raum zu verändern.", "en": "To watch, to observe the space, or to change your place in the space."}, {"id": 21, "chapterId": "praxis-1", "start": 149.97, "end": 157.41, "de": "Such dir jetzt einen Platz im Raum, an dem du gerne einige Zeit stehen möchtest.", "en": "Find a place in the space now where you would like to stand for a while."}, {"id": 22, "chapterId": "praxis-2", "start": 171.02, "end": 173.06, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 23, "chapterId": "praxis-2", "start": 175.78, "end": 179.64, "de": "Bring deine Aufmerksamkeit zu deiner Augenpartie.", "en": "Bring your attention to the area around your eyes."}, {"id": 24, "chapterId": "praxis-2", "start": 182.36, "end": 186.78, "de": "Spüre das Volumen deiner Augen im Inneren deines Kopfes.", "en": "Feel the volume of your eyes inside your head."}, {"id": 25, "chapterId": "praxis-2", "start": 189.74, "end": 193.52, "de": "Spüre deine Augenbälle und ihr Gewicht,", "en": "Feel your eyeballs and their weight,"}, {"id": 26, "chapterId": "praxis-2", "start": 194.36, "end": 199.6, "de": "wie sie in das Innere deines Schädelknochens sinken.", "en": "sinking into the interior of your skull."}, {"id": 27, "chapterId": "praxis-2", "start": 201.02, "end": 209.94, "de": "Spüre den Druck, den deine Augen auf das Innere deines Kopfes ausüben.", "en": "Feel the pressure that your eyes exert on the inside of your head."}, {"id": 28, "chapterId": "praxis-2", "start": 214.82, "end": 217.7, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 29, "chapterId": "praxis-2", "start": 221.88, "end": 229.46, "de": "Bring deine Aufmerksamkeit zu deinen Ohren und ihre Richtung im Inneren deines Kopfes.", "en": "Bring your attention to your ears and their orientation inside your head."}, {"id": 30, "chapterId": "praxis-2", "start": 231.02, "end": 239.94, "de": "Zeichne eine gedachte Linie zwischen deinen Ohren durch das Innere deines Kopfes.", "en": "Trace an imaginary line between your ears through the inside of your head."}, {"id": 31, "chapterId": "praxis-2", "start": 239.94, "end": 249.94, "de": "Deine Augenbälle liegen ungefähr auf der Höhe dieser Linie und sinken nach unten.", "en": "Your eyeballs rest roughly level with this line and sink downward."}, {"id": 32, "chapterId": "praxis-2", "start": 249.94, "end": 258.98, "de": "Wenn du deine Augen noch schwerer werden lassen kannst, dann lass sie noch mehr los.", "en": "If you can let your eyes become even heavier, let go even more."}, {"id": 33, "chapterId": "praxis-2", "start": 258.98, "end": 268.9, "de": "Spüre die Achse, die entsteht, wenn du deine Ohren mit einer gedachten Linie verbindest.", "en": "Feel the axis that forms when you connect your ears with an imaginary line."}, {"id": 34, "chapterId": "praxis-2", "start": 270.58, "end": 274.66, "de": "Und dreh deinen Kopf jetzt sanft um diese Achse.", "en": "And gently turn your head around this axis now."}, {"id": 35, "chapterId": "praxis-2", "start": 276.7, "end": 278.06, "de": "In einem leichten Nicken.", "en": "In a gentle nod."}, {"id": 36, "chapterId": "praxis-2", "start": 278.06, "end": 285.86, "de": "Spüre das Gewicht deines Gesäßes und lass es schwer gegen den Boden fallen.", "en": "Feel the weight of your pelvis and let it fall heavy toward the floor."}, {"id": 37, "chapterId": "praxis-2", "start": 289.36, "end": 293.62, "de": "Spüre das Gewicht deiner Arme von den Fingerspitzen,", "en": "Feel the weight of your arms from the fingertips,"}, {"id": 38, "chapterId": "praxis-2", "start": 294.88, "end": 299.7, "de": "von den Fingerkuppen und über die Fingerabdrücke hinaus.", "en": "from the pads of your fingers and beyond your fingerprints."}, {"id": 39, "chapterId": "praxis-2", "start": 299.7, "end": 305.3, "de": "Lass die Arme von dort schwer gegen den Boden fallen.", "en": "From there, let your arms fall heavy toward the floor."}, {"id": 40, "chapterId": "praxis-2", "start": 310.1, "end": 316.18, "de": "Kannst du spüren, wie das Gewicht deiner Arme deine Schultern sanft nach unten zieht?", "en": "Can you feel how the weight of your arms gently pulls your shoulders downward?"}, {"id": 41, "chapterId": "praxis-2", "start": 320.82, "end": 325.82, "de": "Spüre das Gewicht deiner Arme und lass sie noch schwerer zu Boden fallen.", "en": "Feel the weight of your arms and let them fall even heavier to the floor."}, {"id": 42, "chapterId": "praxis-3", "start": 330.98, "end": 337.88, "de": "Bring jetzt deine Aufmerksamkeit zur Region deines Bauches.", "en": "Now bring your attention to the region of your abdomen."}, {"id": 43, "chapterId": "praxis-3", "start": 341.46, "end": 346.18, "de": "Bring jetzt deine Aufmerksamkeit zur Magenregion.", "en": "Now bring your attention to the stomach area."}, {"id": 44, "chapterId": "praxis-3", "start": 348.42, "end": 352.78, "de": "An die rechte Seite unterhalb des Rippenbogens.", "en": "To the right side beneath your ribcage."}, {"id": 45, "chapterId": "praxis-3", "start": 355.8, "end": 359.54, "de": "Spüre dort das Gewicht deiner Leber.", "en": "Feel the weight of your liver there."}, {"id": 46, "chapterId": "praxis-3", "start": 361.76, "end": 365.3, "de": "Das größte Organ in deinem Körper.", "en": "The largest organ in your body."}, {"id": 47, "chapterId": "praxis-3", "start": 369.58, "end": 373.26, "de": "Spüre, wie satt deine Leber daliegt.", "en": "Feel how settled your liver rests."}, {"id": 48, "chapterId": "praxis-3", "start": 375.88, "end": 380.1, "de": "Spüre ihr Gewicht, wie es in einem sanften Bogen nach unten sinkt.", "en": "Feel its weight, sinking downward in a gentle arc."}, {"id": 49, "chapterId": "praxis-3", "start": 384.28, "end": 386.4, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 50, "chapterId": "praxis-3", "start": 390.98, "end": 391.94, "de": "Du atmest.", "en": "You are breathing."}, {"id": 51, "chapterId": "praxis-3", "start": 394.44, "end": 397.14, "de": "Dein Atem ist leicht und fließt frei.", "en": "Your breath is light and flows freely."}, {"id": 52, "chapterId": "praxis-3", "start": 400.64, "end": 408.24, "de": "Spüre beim nächsten Atemzug, wie sich deine Lunge mit Luft füllt und dann wie ganz von selbst wieder aus dir strömt.", "en": "With the next breath, feel your lungs fill with air and then stream out of you again, all on their own."}, {"id": 53, "chapterId": "praxis-3", "start": 411.18, "end": 423.76, "de": "Beobachte den Moment, wie dieser Prozess ganz von alleine beginnt und zu einem Ende kommt und sich wiederholt.", "en": "Observe the moment when this process begins entirely by itself, comes to an end, and repeats."}, {"id": 54, "chapterId": "praxis-3", "start": 426.58, "end": 428.18, "de": "Luft strömt ein,", "en": "Air flows in,"}, {"id": 55, "chapterId": "praxis-3", "start": 430.68, "end": 431.38, "de": "verweilt,", "en": "lingers,"}, {"id": 56, "chapterId": "praxis-3", "start": 432.78, "end": 433.64, "de": "strömt aus.", "en": "flows out."}, {"id": 57, "chapterId": "praxis-3", "start": 433.64, "end": 438.64, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 58, "chapterId": "praxis-3", "start": 443.7, "end": 447.48, "de": "Falls du deine Augen noch nicht geschlossen hast, kannst du sie jetzt schließen.", "en": "If you haven't closed your eyes yet, you can close them now."}, {"id": 59, "chapterId": "praxis-3", "start": 447.48, "end": 463.94, "de": "Spüre das Gewicht deines Kopfes, das Gewicht der Augenbälle in deinem Kopf und wie es sanft, Wirbel für Wirbel, durch deine aufgerichtete Wirbelsäule gegen den Boden sinkt.", "en": "Feel the weight of your head, the weight of the eyeballs in your head, and how it gently sinks, vertebra by vertebra, through your upright spine toward the floor."}, {"id": 60, "chapterId": "praxis-3", "start": 463.94, "end": 472.02, "de": "Mach die kleinste Streckbewegung in deinen Armen, die du dir vorstellen kannst.", "en": "Make the smallest extending movement in your arms that you can imagine."}, {"id": 61, "chapterId": "praxis-3", "start": 474.0, "end": 478.56, "de": "Strecke deine Arme sanft und winzig klein gegen den Boden.", "en": "Gently stretch your arms toward the floor, in the tiniest way."}, {"id": 62, "chapterId": "praxis-3", "start": 480.9, "end": 484.16, "de": "Kann diese Bewegung noch kleiner sein?", "en": "Can this movement be even smaller?"}, {"id": 63, "chapterId": "praxis-3", "start": 484.16, "end": 490.24, "de": "Die kleinste Streckbewegung, die möglich ist.", "en": "The smallest extending movement possible."}, {"id": 64, "chapterId": "praxis-3", "start": 493.84, "end": 500.52, "de": "Durch deine Arme über die Fingerabdrücke hinaus fließt ihr Gewicht zu Boden.", "en": "Through your arms beyond your fingerprints, their weight flows to the floor."}, {"id": 65, "chapterId": "praxis-3", "start": 503.46, "end": 504.52, "de": "Merk dir das Gefühl.", "en": "Remember this feeling."}, {"id": 66, "chapterId": "praxis-3", "start": 508.6, "end": 510.74, "de": "Kann es noch kleiner sein?", "en": "Can it be even smaller?"}, {"id": 67, "chapterId": "praxis-3", "start": 514.16, "end": 516.58, "de": "Welchen Unterschied macht das?", "en": "What difference does that make?"}, {"id": 68, "chapterId": "praxis-3", "start": 521.08, "end": 530.62, "de": "Spüre das Gewicht deiner Arme und stell dir nur vor, wie du beobachtest, dass sich deine Arme wie von selbst heben.", "en": "Feel the weight of your arms and merely imagine observing your arms lift all by themselves."}, {"id": 69, "chapterId": "praxis-3", "start": 534.04, "end": 535.88, "de": "Welchen Unterschied macht das?", "en": "What difference does that make?"}, {"id": 70, "chapterId": "praxis-3", "start": 539.38, "end": 541.02, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 71, "chapterId": "praxis-3", "start": 541.02, "end": 552.18, "de": "Spüre jetzt den Kontaktpunkt deiner Füße zum Boden und wie dort dein Gewicht permanent in die Erde fließt.", "en": "Now feel the point of contact between your feet and the floor, and how your weight flows continuously into the earth there."}, {"id": 72, "chapterId": "praxis-3", "start": 555.14, "end": 557.76, "de": "Spüre die Unterstützung der Erde unter dir.", "en": "Feel the support of the earth beneath you."}, {"id": 73, "chapterId": "praxis-3", "start": 560.42, "end": 562.18, "de": "Welchen Unterschied macht das?", "en": "What difference does that make?"}, {"id": 74, "chapterId": "praxis-3", "start": 562.18, "end": 571.74, "de": "Spüre das Gewicht deiner Augenbälle.", "en": "Feel the weight of your eyeballs."}, {"id": 75, "chapterId": "praxis-3", "start": 574.5, "end": 576.48, "de": "Welchen Unterschied macht das?", "en": "What difference does that make?"}, {"id": 76, "chapterId": "praxis-3", "start": 582.38, "end": 595.06, "de": "Spüre die sanfte Bewegung deiner Wirbelsäule und wie sie automatisch entsteht, während du auf zwei Beinen stehst.", "en": "Feel the gentle movement of your spine and how it arises automatically while you stand on two legs."}, {"id": 77, "chapterId": "praxis-3", "start": 598.06, "end": 608.94, "de": "Die winzigen Anpassungen, die dein Körper wie von selbst vornimmt, während deine Wirbelsäule aufrecht Richtung Himmel zeigt.", "en": "The tiny adjustments your body makes all on its own while your spine points upright toward the sky."}, {"id": 78, "chapterId": "praxis-3", "start": 608.94, "end": 622.58, "de": "Stell dir das nur vor, wie dein Kopf gegen Himmel strebt und deine Füße fest mit dem Erdkörper verbunden sind.", "en": "Just imagine this: your head reaching toward the sky, and your feet firmly connected to the body of the earth."}, {"id": 79, "chapterId": "praxis-3", "start": 624.26, "end": 642.52, "de": "Durch deine Schuhe, durch den Boden dieses Raumes, durch die Erde, durch die Erdkruste, bis zum Erdkern, mit dem ganzen Erdkörper verbunden.", "en": "Through your shoes, through the floor of this space, through the earth, through the Earth's crust, to the core of the Earth, connected with the entire body of the earth."}, {"id": 80, "chapterId": "praxis-3", "start": 646.52, "end": 655.04, "de": "Spüre die sanfte Bewegung, die deine Wirbelsäule rund um die Achse zwischen Himmel und Erde verfolgt.", "en": "Feel the gentle movement that your spine traces around the axis between sky and earth."}, {"id": 81, "chapterId": "praxis-3", "start": 655.04, "end": 660.28, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 82, "chapterId": "praxis-3", "start": 666.06, "end": 668.72, "de": "Die Bewegung deiner Wirbelsäule,", "en": "The movement of your spine,"}, {"id": 83, "chapterId": "praxis-3", "start": 670.78, "end": 673.28, "de": "das Gewicht deiner Arme,", "en": "the weight of your arms,"}, {"id": 84, "chapterId": "praxis-3", "start": 675.78, "end": 680.08, "de": "das Gewicht deines Schädels am Ende der Wirbelsäule", "en": "the weight of your skull at the top of the spine"}, {"id": 85, "chapterId": "praxis-3", "start": 680.08, "end": 689.68, "de": "und das Gewicht jedes einzelnen Wirbelkörpers, wie es gegen Boden strebt.", "en": "and the weight of each individual vertebra, as it seeks the floor."}, {"id": 86, "chapterId": "praxis-3", "start": 692.1, "end": 694.2, "de": "Das Gewicht deiner Leber,", "en": "The weight of your liver,"}, {"id": 87, "chapterId": "praxis-3", "start": 697.0, "end": 699.06, "de": "das Gewicht deines Gesäßes", "en": "the weight of your pelvis"}, {"id": 88, "chapterId": "praxis-3", "start": 699.06, "end": 706.9, "de": "und deine Atmung, wie sie wie von selbst ein- und ausströmt.", "en": "and your breathing, as it streams in and out all on its own."}, {"id": 89, "chapterId": "praxis-3", "start": 706.9, "end": 713.94, "de": "Spüre diese Bewegung um die Achse deines Körpers.", "en": "Feel this movement around the axis of your body."}, {"id": 90, "chapterId": "praxis-3", "start": 717.22, "end": 720.2, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 91, "chapterId": "praxis-3", "start": 723.08, "end": 725.46, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 92, "chapterId": "praxis-4", "start": 727.64, "end": 732.62, "de": "Erinnere dich daran, wie es sich anfühlt, zu gehen.", "en": "Remember how it feels to walk."}, {"id": 93, "chapterId": "praxis-4", "start": 734.98, "end": 736.34, "de": "Stell dir das vor.", "en": "Imagine that."}, {"id": 94, "chapterId": "praxis-4", "start": 739.26, "end": 743.82, "de": "Stell dir vor, wie sich dein rechtes Knie sanft hebt und nach vorne strebt.", "en": "Imagine your right knee gently lifting and reaching forward."}, {"id": 95, "chapterId": "praxis-4", "start": 747.24, "end": 751.7, "de": "Versuch, den Punkt in deiner Hüfte zu finden, aus dem sich dein Bein hebt.", "en": "Try to find the point in your hip from which your leg lifts."}, {"id": 96, "chapterId": "praxis-4", "start": 751.7, "end": 762.12, "de": "Stell dir vor, wie sich dein Knie, dein rechtes Knie, nach vorne hebt.", "en": "Imagine your knee, your right knee, lifting forward."}, {"id": 97, "chapterId": "praxis-4", "start": 766.82, "end": 777.38, "de": "Spür das Gewicht deiner Arme und stell dir vor, wie dein rechtes Knie in Zeitlupe für einen Moment über dem Boden schwebt.", "en": "Feel the weight of your arms and imagine your right knee hovering above the floor for a moment in slow motion."}, {"id": 98, "chapterId": "praxis-4", "start": 777.38, "end": 789.96, "de": "Stell dir diesen Schritt vor und wie dein Fuß wieder sanft im Kontakt mit der Erde landet.", "en": "Imagine this step, and how your foot lands gently in contact with the earth again."}, {"id": 99, "chapterId": "praxis-4", "start": 793.96, "end": 803.58, "de": "Stell dir vor, wie sich dein linkes Knie sanft hebt und wie du langsam, wie auf Wolken, durch diesen Raum gehst.", "en": "Imagine your left knee gently lifting, and walking through this space slowly, as if on clouds."}, {"id": 100, "chapterId": "praxis-4", "start": 803.58, "end": 816.42, "de": "Den Punkt in deiner Hüfte, aus dem sich dein Bein bewegt und den Moment, an dem dein Knie sanft über dem Boden schwebt.", "en": "The point in your hip from which your leg moves, and the moment your knee gently hovers above the floor."}, {"id": 101, "chapterId": "praxis-4", "start": 818.8, "end": 821.12, "de": "Die satte Landung auf der Erde.", "en": "The grounded landing on the earth."}, {"id": 102, "chapterId": "praxis-4", "start": 821.12, "end": 841.54, "de": "Ein rechtes Knie, das sanft über dem Erdboden schwebt.", "en": "A right knee hovering gently above the earth."}, {"id": 103, "chapterId": "praxis-4", "start": 841.54, "end": 846.28, "de": "Das ist Gehen.", "en": "This is walking."}, {"id": 104, "chapterId": "praxis-4", "start": 848.68, "end": 850.62, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 105, "chapterId": "abschluss", "start": 853.96, "end": 857.78, "de": "Jetzt bist du genau dort angekommen, wo du bist.", "en": "Now you have arrived exactly where you are."}, {"id": 106, "chapterId": "abschluss", "start": 860.5, "end": 864.58, "de": "Gemeinsam sind wir genau dort, wo wir sind.", "en": "Together, we are exactly where we are."}, {"id": 107, "chapterId": "abschluss", "start": 867.38, "end": 869.2, "de": "Mach einfach weiter.", "en": "Just keep going."}, {"id": 108, "chapterId": "abschluss", "start": 872.74, "end": 875.66, "de": "Du bist Teil eines Feldes.", "en": "You are part of a field."}, {"id": 109, "chapterId": "abschluss", "start": 878.24, "end": 881.32, "de": "Gemeinsam stehen in diesem Feld.", "en": "Standing together in this field."}, {"id": 110, "chapterId": "abschluss", "start": 881.32, "end": 887.02, "de": "Gemeinsam atmen in diesem Feld.", "en": "Breathing together in this field."}, {"id": 111, "chapterId": "abschluss", "start": 889.74, "end": 900.38, "de": "Gemeinsam die Organe sinken lassen und den Tanz deiner Wirbelsäule zwischen Erde und Himmel spüren.", "en": "Together letting the organs sink, and feeling the dance of your spine between earth and sky."}, {"id": 112, "chapterId": "abschluss", "start": 906.38, "end": 909.1, "de": "Gemeinsam die Position im Raum verändern.", "en": "Together changing position in the space."}, {"id": 113, "chapterId": "abschluss", "start": 911.32, "end": 914.8, "de": "Gemeinsam stehen.", "en": "Standing together."}, {"id": 114, "chapterId": "abschluss", "start": 917.74, "end": 923.4, "de": "Gemeinsam genauso sein, wie du bist.", "en": "Together being exactly as you are."}, {"id": 115, "chapterId": "abschluss", "start": 927.9, "end": 929.5, "de": "Gemeinsam tanzen.", "en": "Dancing together."}, {"id": 116, "chapterId": "abschluss", "start": 931.9, "end": 933.08, "de": "Gemeinsam zusehen.", "en": "Watching together."}, {"id": 117, "chapterId": "abschluss", "start": 933.08, "end": 940.92, "de": "Gemeinsam genau dort sein, wo du bist.", "en": "Together being exactly where you are."}, {"id": 118, "chapterId": "abschluss", "start": 940.92, "end": 945.06, "de": "Mach einfach weiter.", "en": "Just keep going."}, {"id": 119, "chapterId": "abschluss", "start": 948.18, "end": 949.54, "de": "Mach einfach weiter.", "en": "Just keep going."}];
  const duration = 949.851;

  let slide = 0;
  const audio = $('audio');
  const cueTextEl = $('cue-text');
  let lastChapterId = '';

  function getCurrentChapter(pos) {
    let current = chapters[0];
    for (let i = 0; i < chapters.length; i++) {
      if (pos >= chapters[i].start) {
        current = chapters[i];
      }
    }
    return current;
  }

  function setLanguage(lang) {
    currentLang = lang;
    try {
      localStorage.setItem('score_lang', lang);
    } catch (_) {}

    const btnDe = $('btn-lang-de');
    const btnEn = $('btn-lang-en');
    if (btnDe) {
      btnDe.classList.toggle('active', lang === 'de');
      btnDe.setAttribute('aria-pressed', String(lang === 'de'));
    }
    if (btnEn) {
      btnEn.classList.toggle('active', lang === 'en');
      btnEn.setAttribute('aria-pressed', String(lang === 'en'));
    }

    $('lang-label').textContent = I18N[lang].langLabel;
    $('lang-note').textContent = I18N[lang].langNote;
    $('help').textContent = I18N[lang].help;
    $('reset').setAttribute('aria-label', I18N[lang].resetLabel);
    $('reset').setAttribute('title', I18N[lang].resetLabel);

    showSlide();
    updatePlayerUI();
  }

  function showSlide() {
    $('onboarding').hidden = false;
    $('player').hidden = true;

    const data = I18N[currentLang].slides[slide];
    $('step-label').textContent = data[0];
    $('screen-title').innerHTML = data[1].replace('\n', '<br>');
    $('screen-copy').textContent = data[2];

    $('lang-picker').hidden = slide !== 0;
    $('back').hidden = slide === 0;

    const isLast = slide === I18N[currentLang].slides.length - 1;
    $('next-label').textContent = isLast ? I18N[currentLang].toPlayer : I18N[currentLang].next;
    $('back').textContent = I18N[currentLang].back;

    $('pager').innerHTML = I18N[currentLang].slides
      .map((_, i) => '<span class="' + (i === slide ? 'active' : '') + '"' + (i === slide ? ' aria-current="step"' : '') + '></span>')
      .join('');
  }

  function advanceSlide() {
    if (slide < I18N[currentLang].slides.length - 1) {
      slide++;
      showSlide();
    } else {
      $('onboarding').hidden = true;
      $('player').hidden = false;
      updatePlayerUI();
      $('play').focus();
    }
  }

  function updatePlayButton(isPlaying) {
    const label = isPlaying ? I18N[currentLang].playPause : I18N[currentLang].playStart;
    $('play').setAttribute('aria-pressed', String(isPlaying));
    $('play').setAttribute('aria-label', label);
    $('play-icon').setAttribute(
      'd',
      isPlaying ? 'M14 10H21V38H14Z M28 10H35V38H28Z' : 'M17 10 L39 24 L17 38 Z'
    );
  }

  function renderNodes() {
    const dur = audio.duration || duration;
    $('nodes').innerHTML = chapters
      .map((ch) => '<span class="score-node" style="top:' + ((ch.start / dur) * 100) + '%" title="' + (ch.title[currentLang] || ch.title.de) + '"></span>')
      .join('');
  }

  function updatePlayerUI() {
    const pos = audio.currentTime || 0;
    const dur = audio.duration || duration;

    $('progress').style.height = Math.min(100, (pos / dur) * 100) + '%';

    const nodeEls = $('nodes').children;
    for (let i = 0; i < chapters.length; i++) {
      if (nodeEls[i]) {
        nodeEls[i].classList.toggle('passed', pos >= chapters[i].start);
      }
    }

    const currentChapter = getCurrentChapter(pos);
    const chapterName = currentChapter.title[currentLang] || currentChapter.title.de;
    $('chapter-label').textContent = chapterName;

    // Subtitles display: ONLY sentences that have been reached by playback!
    if (audio.ended || pos >= dur - 0.5) {
      cueTextEl.textContent = I18N[currentLang].completed;
    } else {
      const spokenCues = cues.filter((c) => pos >= c.start);
      if (spokenCues.length > 0) {
        const latestSpokenCue = spokenCues[spokenCues.length - 1];
        cueTextEl.textContent = latestSpokenCue[currentLang] || latestSpokenCue.de;
      } else {
        // Before audio starts speaking: NO future sentences on screen!
        cueTextEl.textContent = '';
      }
    }

    if ('mediaSession' in navigator && lastChapterId !== currentChapter.id) {
      lastChapterId = currentChapter.id;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Kollektiv|ver|körpern — ' + chapterName,
          artist: 'Wild Care',
          album: 'Kollektiv|ver|körpern'
        });
      } catch (_) {}
    }
  }

  function handleReset() {
    const pos = audio.currentTime || 0;
    const dur = audio.duration || duration;

    if (audio.ended || pos >= dur - 0.5) {
      const lastChapter = chapters[chapters.length - 1];
      audio.currentTime = lastChapter.start;
      audio.pause();
      updatePlayerUI();
      return;
    }

    const currentChapter = getCurrentChapter(pos);
    const wasPlaying = !audio.paused;

    audio.currentTime = currentChapter.start;

    if (wasPlaying) {
      audio.play().catch(() => {});
    }
    updatePlayerUI();
  }

  audio.addEventListener('play', () => updatePlayButton(true));
  audio.addEventListener('pause', () => updatePlayButton(false));
  audio.addEventListener('ended', () => {
    updatePlayButton(false);
    updatePlayerUI();
  });
  audio.addEventListener('timeupdate', updatePlayerUI);
  audio.addEventListener('loadedmetadata', () => {
    renderNodes();
    updatePlayerUI();
  });

  $('play').addEventListener('click', () => {
    if (audio.ended) {
      audio.currentTime = 0;
    }
    if (audio.paused) {
      audio.play().catch((err) => console.warn('Play interrupted:', err));
    } else {
      audio.pause();
    }
  });

  $('reset').addEventListener('click', handleReset);

  $('next').addEventListener('click', advanceSlide);
  $('back').addEventListener('click', () => {
    slide = Math.max(0, slide - 1);
    showSlide();
  });

  $('btn-lang-de').addEventListener('click', () => setLanguage('de'));
  $('btn-lang-en').addEventListener('click', () => setLanguage('en'));

  $('help').addEventListener('click', () => {
    slide = 1;
    showSlide();
    $('screen-title').tabIndex = -1;
    $('screen-title').focus();
  });

  let touchStartX = null;
  $('onboarding').addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  $('onboarding').addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX < -50) advanceSlide();
    if (deltaX > 50 && slide > 0) {
      slide--;
      showSlide();
    }
    touchStartX = null;
  }, { passive: true });

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) audio.currentTime = details.seekTime;
      });
      navigator.mediaSession.setActionHandler('seekbackward', handleReset);
      navigator.mediaSession.setActionHandler('previoustrack', handleReset);
    } catch (_) {}
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/score-sw.js', { scope: '/' }).catch(() => {});
  }

  (async function initBackgroundDownload() {
    try {
      const response = await fetch('assets/score/audio.mp3');
      if (!response.ok) return;
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      if (!response.body || !totalBytes) {
        $('download-progress').style.width = '100%';
        $('download-label').textContent = I18N[currentLang].offlineReady;
        return;
      }
      const reader = response.body.getReader();
      let receivedBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.length;
        const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        $('download-progress').style.width = pct + '%';
        $('download-label').textContent = pct >= 100
          ? I18N[currentLang].offlineReady
          : I18N[currentLang].loadingProgress(pct);
      }
    } catch (_) {
      $('download-progress').style.width = '100%';
      $('download-label').textContent = I18N[currentLang].offlineReady;
    }
  })();

  setLanguage(currentLang);
  renderNodes();
  updatePlayerUI();
})();
