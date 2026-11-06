(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const I18N = {
    de: {
      next: 'Weiter',
      toPlayer: 'Zum Player',
      back: 'Zurück',
      langLabel: 'Text & Untertitel:',
      langNote: '* Original-Tonspur ist auf Deutsch',
      playStart: 'Wiedergabe starten',
      playPause: 'Wiedergabe pausieren',
      resetLabel: 'Zum Anfang dieses Abschnitts springen',
      silence: '[Stille]',
      completed: 'Danke für deine Präsenz und dein Dasein.',
      help: 'Hinweise noch einmal lesen',
      offlineReady: 'Offline bereit',
      loadingProgress: (p) => 'Laden für Offline … ' + p + '%',
      slides: [
        ['Schön, dass du da bist.', 'Willkommen bei\nKollektiv|ver|körpern', 'Eine Einladung, deinem Körper und anderen zu begegnen.'],
        ['01 / Ankommen', 'Nimm dir Zeit.', 'Setze deine Kopfhörer auf und stelle die Lautstärke angenehm ein. Such dir einen Platz, an dem du ankommen kannst.'],
        ['02 / Ausprobieren', 'Folge deinem Körper.', 'Die Audioimpulse sind Angebote. Du kannst ihnen folgen, sie verändern oder bei dem bleiben, was du gerade tust. Auch Stille gehört dazu.'],
        ['03 / Bei dir bleiben', 'Du entscheidest.', 'Pausieren und Zusehen ist jederzeit möglich. Du musst nichts vorführen. Im Bereich zum Zuschauen wirst du nicht in Interaktionen einbezogen.']
      ]
    },
    en: {
      next: 'Next',
      toPlayer: 'To Player',
      back: 'Back',
      langLabel: 'Text & subtitles:',
      langNote: '* Original audio remains in German',
      playStart: 'Start playback',
      playPause: 'Pause playback',
      resetLabel: 'Jump to start of this section',
      silence: '[Silence]',
      completed: 'Thank you for your presence and being here.',
      help: 'Read guidance again',
      offlineReady: 'Offline ready',
      loadingProgress: (p) => 'Downloading for offline … ' + p + '%',
      slides: [
        ['Glad you are here.', 'Welcome to\nKollektiv|ver|körpern', 'An invitation to encounter your body and others.'],
        ['01 / Arriving', 'Take your time.', 'Put on your headphones and adjust the volume comfortably. Find a place where you can arrive.'],
        ['02 / Exploring', 'Follow your body.', 'The audio impulses are invitations. You can follow them, adapt them, or stay with what you are currently doing. Silence is also part of it.'],
        ['03 / Staying with yourself', 'You decide.', 'Pausing and watching is possible at any time. You do not have to perform anything. In the viewing area, you will not be included in interactions.']
      ]
    }
  };

  let currentLang = 'de';
  try {
    const saved = localStorage.getItem('score_lang');
    if (saved === 'en' || saved === 'de') currentLang = saved;
  } catch (_) {}

  const chapters = [{"id": "intro", "title": {"de": "Intro", "en": "Intro"}, "start": 0.0, "end": 209.717}, {"id": "praxis-1", "title": {"de": "Praxis 1", "en": "Practice 1"}, "start": 209.717, "end": 388.719}, {"id": "praxis-2", "title": {"de": "Praxis 2", "en": "Practice 2"}, "start": 388.719, "end": 737.716}, {"id": "praxis-3", "title": {"de": "Praxis 3", "en": "Practice 3"}, "start": 737.716, "end": 873.542}];
  const cues = [{"id": 1, "chapterId": "intro", "start": 0.18, "end": 8.96, "de": "Herzlich Willkommen zu einer Erfahrung in diesem Raum und in Deinen Kopfhörern.", "en": "Welcome to an experience in this space and in your headphones."}, {"id": 2, "chapterId": "intro", "start": 13.17, "end": 18.29, "de": "Du bist eingeladen, meiner Stimme zuzuhören und meiner Stimme zu folgen.", "en": "You are invited to listen to my voice and to follow my voice."}, {"id": 3, "chapterId": "intro", "start": 20.26, "end": 26.07, "de": "Und Du bist auch eingeladen, jederzeit etwas anderes zu wählen.", "en": "And you are also invited to choose something else at any time."}, {"id": 4, "chapterId": "intro", "start": 31.45, "end": 33.85, "de": "Etwas anderes zu wählen ist nicht immer einfach.", "en": "Choosing something else is not always easy."}, {"id": 5, "chapterId": "intro", "start": 34.75, "end": 40.22, "de": "Deshalb lade ich Dich ein, jetzt die Kopfhörer aus Deinen Ohren zu nehmen", "en": "That is why I invite you to take the headphones out of your ears now"}, {"id": 6, "chapterId": "intro", "start": 40.22, "end": 45.15, "de": "und sie dann wieder einzusetzen.", "en": "and then put them back in."}, {"id": 7, "chapterId": "intro", "start": 47.85, "end": 53.76, "de": "Wenn Du die Kopfhörer rausgenommen hast, verpasst Du nichts.", "en": "When you have taken the headphones out, you are not missing anything."}, {"id": 8, "chapterId": "intro", "start": 56.14, "end": 60.22, "de": "Wenn Du sie wieder einsetzt, kannst Du jederzeit wieder einsteigen.", "en": "When you put them back in, you can rejoin at any moment."}, {"id": 9, "chapterId": "intro", "start": 64.01, "end": 67.63, "de": "Solltest Du die Kopfhörer noch nicht entfernt haben, bitte tu das.", "en": "If you haven't removed the headphones yet, please do so."}, {"id": 10, "chapterId": "intro", "start": 67.63, "end": 72.93, "de": "Du kannst es jederzeit während dieser Performance wählen.", "en": "You can choose this at any time during this performance."}, {"id": 11, "chapterId": "intro", "start": 81.62, "end": 85.42, "de": "Du bist eingeladen, jederzeit zuzusehen.", "en": "You are invited to watch at any time."}, {"id": 12, "chapterId": "intro", "start": 85.42, "end": 93.97, "de": "Du bist eingeladen, jederzeit zuzusehen und den Raum zu beobachten.", "en": "You are invited to watch at any time and observe the space."}, {"id": 13, "chapterId": "intro", "start": 94.47, "end": 106.21, "de": "Du bist eingeladen, jederzeit zuzusehen, die Kopfhörer hinein- oder hinauszunehmen", "en": "You are invited to watch at any time, to put headphones in or take them out,"}, {"id": 14, "chapterId": "intro", "start": 106.21, "end": 110.23, "de": "oder den Raum zu beobachten.", "en": "or to observe the space."}, {"id": 15, "chapterId": "intro", "start": 111.31, "end": 114.71, "de": "Und Du bist eingeladen, Deinen Platz im Raum zu verändern.", "en": "And you are invited to change your place in the space."}, {"id": 16, "chapterId": "intro", "start": 117.53, "end": 120.03, "de": "Verändere jetzt den Platz im Raum.", "en": "Change your place in the space now."}, {"id": 17, "chapterId": "intro", "start": 120.03, "end": 133.71, "de": "Während Du Dich im Raum bewegst, nimmst Du diesen Raum anders wahr.", "en": "As you move through the space, you perceive this space differently."}, {"id": 18, "chapterId": "intro", "start": 138.55, "end": 142.93, "de": "Du bist eingeladen, jederzeit den Raum zu beobachten oder Deinen Platz im Raum zu verändern.", "en": "You are invited to observe the space or change your place in the space at any time."}, {"id": 19, "chapterId": "intro", "start": 146.08, "end": 153.95, "de": "Während der nächsten Minute such Dir einen Platz im Raum, an dem Du gerne einige Zeit stehen möchtest.", "en": "During the next minute, find a place in the space where you would like to stand for a while."}, {"id": 20, "chapterId": "intro", "start": 153.95, "end": 161.22, "de": "Das muss kein besonderer Platz sein, nichts zu überblicken.", "en": "This doesn't need to be a special place, nothing to overlook."}, {"id": 21, "chapterId": "intro", "start": 162.36, "end": 165.1, "de": "Wir werden während der nächsten Übung die Augen schließen.", "en": "During the next exercise, we will close our eyes."}, {"id": 22, "chapterId": "intro", "start": 167.02, "end": 172.71, "de": "Du bist jederzeit eingeladen, die Augen zu schließen oder zu öffnen, zuzusehen,", "en": "You are invited at any time to close or open your eyes, to watch,"}, {"id": 23, "chapterId": "intro", "start": 173.15, "end": 176.43, "de": "Deinen Raum zu beobachten oder Deinen Platz im Raum zu verändern.", "en": "to observe your space or to change your place in the space."}, {"id": 24, "chapterId": "intro", "start": 180.56, "end": 185.0, "de": "Such Dir einen Platz im Raum, an dem Du gerne einige Zeit stehen möchtest.", "en": "Find a place in the space where you would like to stand for a while."}, {"id": 25, "chapterId": "praxis-1", "start": 209.72, "end": 211.74, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 26, "chapterId": "praxis-1", "start": 215.89, "end": 219.0, "de": "Spür deine Augenbälle.", "en": "Feel your eyeballs."}, {"id": 27, "chapterId": "praxis-1", "start": 219.22, "end": 228.84, "de": "Spüre deine Augenbälle und ihr Gewicht, wie sie in das Innere deines Schädelknochens sinken.", "en": "Feel your eyeballs and their weight, sinking into the interior of your skull."}, {"id": 28, "chapterId": "praxis-1", "start": 232.6, "end": 238.74, "de": "Spür den Druck, den deine Augenbälle an das Innere deines Kopfes ausüben.", "en": "Feel the pressure that your eyeballs exert on the inside of your head."}, {"id": 29, "chapterId": "praxis-1", "start": 245.21, "end": 246.51, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 30, "chapterId": "praxis-1", "start": 250.81, "end": 256.79, "de": "Spüre die Linie, die entsteht, wenn du deine Ohren durch das Innere deines Kopfes verbindest.", "en": "Feel the line that forms when you connect your ears through the inside of your head."}, {"id": 31, "chapterId": "praxis-1", "start": 257.33, "end": 267.69, "de": "Deine Augenbälle liegen ungefähr auf dieser Linie und sinken nach unten.", "en": "Your eyeballs rest roughly on this line and sink downward."}, {"id": 32, "chapterId": "praxis-1", "start": 270.6, "end": 276.36, "de": "Falls du deine Augenbälle noch schwerer werden lassen kannst, lass los.", "en": "If you can let your eyeballs become even heavier, let go."}, {"id": 33, "chapterId": "praxis-1", "start": 286.18, "end": 292.58, "de": "Spür die Achse, die entsteht, wenn du deine Ohren mit einer gedachten Linie verbindest.", "en": "Feel the axis that forms when you connect your ears with an imaginary line."}, {"id": 34, "chapterId": "praxis-1", "start": 296.33, "end": 301.98, "de": "Und dreh deinen Kopf sanft um diese Achse, in einem leichten Nicken.", "en": "And gently turn your head around this axis, in a slight nod."}, {"id": 35, "chapterId": "praxis-1", "start": 301.98, "end": 315.37, "de": "Spür das Gewicht deines Gesäßes und lass es schwer gegen Boden fallen.", "en": "Feel the weight of your pelvis and let it fall heavy toward the floor."}, {"id": 36, "chapterId": "praxis-1", "start": 319.78, "end": 335.92, "de": "Spür das Gewicht deiner Arme von den Fingerspitzen, von den Fingerkuppen und über die Fingerabdrücke hinaus und lass es schwer gegen Boden fallen.", "en": "Feel the weight of your arms from the fingertips, from the pads of your fingers and beyond your fingerprints, and let it fall heavy toward the floor."}, {"id": 37, "chapterId": "praxis-1", "start": 335.92, "end": 344.31, "de": "Spür das Gewicht deiner Arme und lass sie noch schwerer zum Boden fallen.", "en": "Feel the weight of your arms and let them fall even heavier toward the floor."}, {"id": 38, "chapterId": "praxis-1", "start": 346.09, "end": 353.15, "de": "Spür das Gewicht, wie es nach oben wandert und von deinen Schultern nach unten zieht.", "en": "Feel the weight traveling upward and pulling down from your shoulders."}, {"id": 39, "chapterId": "praxis-1", "start": 356.65, "end": 361.76, "de": "Spür das Gewicht deiner Arme und lass sie noch schwerer zum Boden fallen.", "en": "Feel the weight of your arms and let them fall even heavier toward the floor."}, {"id": 40, "chapterId": "praxis-1", "start": 361.76, "end": 378.56, "de": "Spür das Gewicht deiner Leber, an der rechten Seite unter deinem Rippenbogen, das größte Organ in deinem Körper.", "en": "Feel the weight of your liver, on the right side beneath your ribcage, the largest organ in your body."}, {"id": 41, "chapterId": "praxis-1", "start": 378.56, "end": 386.66, "de": "Spür ihr Gewicht und wie es in einem sanften Bogen nach unten sinkt.", "en": "Feel its weight and how it sinks downward in a gentle arc."}, {"id": 42, "chapterId": "praxis-2", "start": 390.4, "end": 404.61, "de": "Das ist Stehen. Du atmest. Dein Atem ist leicht und fließt frei.", "en": "This is standing. You are breathing. Your breath is light and flows freely."}, {"id": 43, "chapterId": "praxis-2", "start": 409.01, "end": 419.9, "de": "Spür beim nächsten Atemzug, wie sich deine Lunge mit Luft füllt und dann wie ganz von selbst wieder aus dir ausströmt.", "en": "With the next breath, feel your lungs fill with air and then stream out of you again, all on their own."}, {"id": 44, "chapterId": "praxis-2", "start": 423.88, "end": 433.18, "de": "Beobachte den Moment, wie ganz von alleine dieser Prozess beginnt, zu einem Ende kommt und sich wiederholt.", "en": "Observe the moment when this process begins entirely by itself, comes to an end, and repeats."}, {"id": 45, "chapterId": "praxis-2", "start": 433.18, "end": 448.52, "de": "Das ist Stehen. Falls du deine Augen noch nicht geschlossen hast, kannst du sie jetzt schließen.", "en": "This is standing. If you haven't closed your eyes yet, you can close them now."}, {"id": 46, "chapterId": "praxis-2", "start": 452.39, "end": 466.12, "de": "Das ist Stehen. Spür das Gewicht deines Kopfes, das Gewicht der Augenbälle in deinem Kopf", "en": "This is standing. Feel the weight of your head, the weight of the eyeballs in your head"}, {"id": 47, "chapterId": "praxis-2", "start": 466.12, "end": 477.64, "de": "und wie es sanft Wirbel für Wirbel durch deine aufgerichtete Wirbelsäule gegen Boden sinkt.", "en": "and how it gently sinks, vertebra by vertebra, through your upright spine toward the floor."}, {"id": 48, "chapterId": "praxis-2", "start": 477.64, "end": 492.86, "de": "Mach die kleinste Streckbewegung in deinen Armen, die du dir vorstellen kannst.", "en": "Make the smallest extending movement in your arms that you can imagine."}, {"id": 49, "chapterId": "praxis-2", "start": 498.84, "end": 503.18, "de": "Strecke deine Arme sanft und winzig klein gegen Boden.", "en": "Gently stretch your arms toward the floor, in the tiniest way."}, {"id": 50, "chapterId": "praxis-2", "start": 506.94, "end": 508.92, "de": "Kann diese Bewegung noch kleiner sein?", "en": "Can this movement be even smaller?"}, {"id": 51, "chapterId": "praxis-2", "start": 512.43, "end": 515.63, "de": "Die kleinste Streckbewegung, die möglich ist.", "en": "The smallest extending movement possible."}, {"id": 52, "chapterId": "praxis-2", "start": 517.96, "end": 522.16, "de": "Durch deine Arme über die Fingerabdrücke hinaus.", "en": "Through your arms, beyond your fingerprints."}, {"id": 53, "chapterId": "praxis-2", "start": 526.16, "end": 532.14, "de": "Merk dir das Gefühl. Kann es noch kleiner sein?", "en": "Remember this feeling. Can it be even smaller?"}, {"id": 54, "chapterId": "praxis-2", "start": 532.14, "end": 546.52, "de": "Spüre das Gewicht deiner Arme und stell dir nur vor, wie du sie hebst.", "en": "Feel the weight of your arms and merely imagine lifting them."}, {"id": 55, "chapterId": "praxis-2", "start": 556.05, "end": 557.67, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 56, "chapterId": "praxis-2", "start": 562.14, "end": 565.74, "de": "Spüre jetzt den Kontaktpunkt deiner Füße zum Boden", "en": "Now feel the point of contact between your feet and the floor"}, {"id": 57, "chapterId": "praxis-2", "start": 565.74, "end": 573.67, "de": "und wie dort dein Gewicht permanent in die Erde fließt.", "en": "and how your weight flows continuously into the earth there."}, {"id": 58, "chapterId": "praxis-2", "start": 578.29, "end": 580.67, "de": "Spüre die Unterstützung der Erde unter dir.", "en": "Feel the support of the earth beneath you."}, {"id": 59, "chapterId": "praxis-2", "start": 584.04, "end": 586.1, "de": "Welchen Unterschied macht das?", "en": "What difference does that make?"}, {"id": 60, "chapterId": "praxis-2", "start": 586.5, "end": 594.39, "de": "Spüre das Gewicht deiner Augenbälle.", "en": "Feel the weight of your eyeballs."}, {"id": 61, "chapterId": "praxis-2", "start": 596.67, "end": 598.29, "de": "Welchen Unterschied macht das?", "en": "What difference does that make?"}, {"id": 62, "chapterId": "praxis-2", "start": 598.29, "end": 616.41, "de": "Spüre die sanfte Bewegung deiner Wirbelsäule,", "en": "Feel the gentle movement of your spine,"}, {"id": 63, "chapterId": "praxis-2", "start": 618.36, "end": 621.68, "de": "die automatisch entsteht, während du auf zwei Beinen stehst.", "en": "that arises automatically while you stand on two legs."}, {"id": 64, "chapterId": "praxis-2", "start": 628.12, "end": 636.24, "de": "Stell dir das nur vor, wie dein Kopf gegen Himmel strebt", "en": "Just imagine this: your head reaching toward the sky"}, {"id": 65, "chapterId": "praxis-2", "start": 636.24, "end": 640.1, "de": "und deine Füße fest mit dem Erdkörper verbunden sind.", "en": "and your feet firmly connected to the body of the earth."}, {"id": 66, "chapterId": "praxis-2", "start": 642.23, "end": 646.51, "de": "Durch deine Schuhe, durch den Boden dieses Raumes,", "en": "Through your shoes, through the floor of this space,"}, {"id": 67, "chapterId": "praxis-2", "start": 646.51, "end": 653.9, "de": "durch die Erde, durch die Erdkruste, mit dem ganzen Erdkörper verbunden.", "en": "through the earth, through the Earth's crust, connected with the entire body of the earth."}, {"id": 68, "chapterId": "praxis-2", "start": 656.93, "end": 658.59, "de": "Und spüre die sanfte Bewegung,", "en": "And feel the gentle movement"}, {"id": 69, "chapterId": "praxis-2", "start": 660.37, "end": 665.85, "de": "die deine Wirbelsäule rund um die Achse zwischen Himmel und Erde verfolgt.", "en": "that your spine traces around the axis between sky and earth."}, {"id": 70, "chapterId": "praxis-2", "start": 671.5, "end": 672.72, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 71, "chapterId": "praxis-2", "start": 679.02, "end": 680.3, "de": "Das Gewicht deiner Arme,", "en": "The weight of your arms,"}, {"id": 72, "chapterId": "praxis-2", "start": 683.26, "end": 684.68, "de": "das Gewicht deines Schädels", "en": "the weight of your skull"}, {"id": 73, "chapterId": "praxis-2", "start": 684.68, "end": 687.46, "de": "am Ende der Wirbelsäule", "en": "at the top of the spine"}, {"id": 74, "chapterId": "praxis-2", "start": 687.46, "end": 692.01, "de": "und das Gewicht jedes einzelnen Wirbelkörpers,", "en": "and the weight of each individual vertebra,"}, {"id": 75, "chapterId": "praxis-2", "start": 693.84, "end": 695.12, "de": "wie es gegen Boden strebt.", "en": "as it seeks the floor."}, {"id": 76, "chapterId": "praxis-2", "start": 697.67, "end": 698.95, "de": "Das Gewicht deiner Leber,", "en": "The weight of your liver,"}, {"id": 77, "chapterId": "praxis-2", "start": 700.7, "end": 702.46, "de": "das Gewicht deines Gesäßes", "en": "the weight of your pelvis"}, {"id": 78, "chapterId": "praxis-2", "start": 702.46, "end": 706.18, "de": "und deine Atmung,", "en": "and your breathing,"}, {"id": 79, "chapterId": "praxis-2", "start": 706.82, "end": 709.12, "de": "wie sie wie von selbst ein- und ausströmt.", "en": "as it streams in and out all on its own."}, {"id": 80, "chapterId": "praxis-2", "start": 716.49, "end": 718.37, "de": "Spüre diese Bewegung um die Achse.", "en": "Feel this movement around the axis."}, {"id": 81, "chapterId": "praxis-2", "start": 721.26, "end": 722.04, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 82, "chapterId": "praxis-2", "start": 727.46, "end": 729.26, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 83, "chapterId": "praxis-2", "start": 729.26, "end": 734.56, "de": "Das ist Stehen.", "en": "This is standing."}, {"id": 84, "chapterId": "praxis-3", "start": 738.57, "end": 741.31, "de": "Erinnere dich daran, wie es sich anfühlt zu gehen.", "en": "Remember how it feels to walk."}, {"id": 85, "chapterId": "praxis-3", "start": 744.04, "end": 744.92, "de": "Stell dir das vor.", "en": "Imagine that."}, {"id": 86, "chapterId": "praxis-3", "start": 748.76, "end": 758.28, "de": "Stell dir vor, wie sich dein rechtes Knie sanft hebt und nach vorne strebt.", "en": "Imagine your right knee gently lifting and reaching forward."}, {"id": 87, "chapterId": "praxis-3", "start": 763.23, "end": 770.34, "de": "Versuch den Punkt in deiner Hüfte zu finden, aus dem sich dein Bein nach vorne hebt.", "en": "Try to find the point in your hip from which your leg lifts forward."}, {"id": 88, "chapterId": "praxis-3", "start": 773.28, "end": 782.56, "de": "Spür das Gewicht deiner Arme und stell dir vor, wie dein rechtes Knie in Zeitlupe für einen Moment über dem Boden schwebt.", "en": "Feel the weight of your arms and imagine your right knee hovering above the floor for a moment in slow motion."}, {"id": 89, "chapterId": "praxis-3", "start": 782.56, "end": 793.95, "de": "Und stell dir diesen Schritt vor, diese Fortbewegung.", "en": "And imagine this step, this movement forward."}, {"id": 90, "chapterId": "praxis-3", "start": 800.32, "end": 808.68, "de": "Stell dir vor, wie du ganz langsam, wie auf Wolken, durch diesen Raum gehst.", "en": "Imagine walking through this space very slowly, as if on clouds."}, {"id": 91, "chapterId": "praxis-3", "start": 808.88, "end": 824.34, "de": "Den Punkt in deiner Hüfte, aus dem sich dein Bein bewegt, und den Moment, an dem dein Knie sanft über dem Boden schwebt.", "en": "The point in your hip from which your leg moves, and the moment your knee gently hovers above the floor."}, {"id": 92, "chapterId": "praxis-3", "start": 830.7, "end": 841.29, "de": "Das ist Gehen. Das ist Stehen.", "en": "This is walking. This is standing."}, {"id": 93, "chapterId": "praxis-3", "start": 841.29, "end": 855.42, "de": "Stell dir vor, wie sich dein rechtes Knie sanft hebt und nach vorne strebt.", "en": "Imagine your right knee gently lifting and reaching forward."}, {"id": 94, "chapterId": "praxis-3", "start": 859.23, "end": 869.82, "de": "Das ist Gehen. Das ist Stehen.", "en": "This is walking. This is standing."}];
  const duration = 873.542;

  let slide = 0;
  const audio = $('audio');
  const cueTextEl = $('cue-text');
  let lastSpokenText = '';
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

    // Subtitles display
    if (audio.ended || pos >= dur - 0.5) {
      cueTextEl.textContent = I18N[currentLang].completed;
      cueTextEl.classList.remove('quiet');
    } else {
      const activeCue = cues.find((c) => pos >= c.start && pos < c.end);
      if (activeCue) {
        const text = activeCue[currentLang] || activeCue.de;
        cueTextEl.textContent = text;
        cueTextEl.classList.remove('quiet');
        lastSpokenText = text;
      } else if (pos === 0 && audio.paused) {
        // At start before playing: show the very first sentence so text is visible immediately!
        const firstCue = cues[0];
        const text = firstCue ? (firstCue[currentLang] || firstCue.de) : '';
        cueTextEl.textContent = text;
        cueTextEl.classList.remove('quiet');
        lastSpokenText = text;
      } else {
        // During silences:
        const firstCueOfChapter = cues.find((c) => c.chapterId === currentChapter.id);
        if (firstCueOfChapter && pos < firstCueOfChapter.start) {
          cueTextEl.textContent = I18N[currentLang].silence;
          cueTextEl.classList.add('quiet');
        } else if (lastSpokenText) {
          // The last spoken sentence remains visible!
          cueTextEl.textContent = lastSpokenText;
          cueTextEl.classList.remove('quiet');
        } else {
          cueTextEl.textContent = I18N[currentLang].silence;
          cueTextEl.classList.add('quiet');
        }
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
      lastSpokenText = '';
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
      lastSpokenText = '';
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
