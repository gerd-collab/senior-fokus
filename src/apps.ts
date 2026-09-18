export interface AppInfo {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly url: string;
  readonly screenshot: string;
  readonly icon: string;
  readonly accent: string;
}

export const APPS: readonly AppInfo[] = [
  {
    id: 'kreatives-schreiben',
    title: 'Wortgarten',
    subtitle: 'Kreatives Schreiben',
    description:
      '40 liebevolle Bildimpulse zum Erinnern, Erzählen und kreativen Schreiben. In Ihrem eigenen Tempo.',
    url: 'https://kreatives-schreiben.vercel.app/',
    screenshot: '/app-screenshots/wortgarten.png',
    icon: '🌱',
    accent: '#6B8E4E'
  },
  {
    id: 'schwedenraetsel',
    title: 'DenkFit',
    subtitle: 'Schwedenrätsel',
    description:
      '300 Schwedenrätsel in drei Stufen, mit großer Schrift und mehrstufiger Hilfe. Ohne Zeitdruck.',
    url: 'https://schwedenraetsel.vercel.app/',
    screenshot: '/app-screenshots/denkfit.png',
    icon: '🧩',
    accent: '#4A7BA6'
  },
  {
    id: 'klangdetektive',
    title: 'Klangdetektive',
    subtitle: 'Geräusche erkennen',
    screenshot: '/app-screenshots/klangdetektive-v2.png',
    description:
      'Echte Geräusche hören, erkennen und zuordnen. Ein Hörtraining in vier Spielvarianten.',
    url: 'https://gerauesche-erkennen.vercel.app/',
    icon: '👂',
    accent: '#14304A'
  },
  {
    id: 'gut-vorbereitet',
    title: 'Gut vorbereitet',
    subtitle: 'Was brauche ich?',
    description: '',
    url: 'https://was-brauche-ich.vercel.app/',
    screenshot: '/app-screenshots/gut-vorbereitet.png',
    icon: '🎒',
    accent: '#1F3A5F'
  },
  {
    id: 'wochenmarkt',
    title: 'Unser Wochenmarkt',
    subtitle: 'Auswählen und planen',
    description:
      'Einkäufe auswählen, ordnen und planen – wie auf dem echten Markt. Konzentration für den Alltag.',
    url: 'https://unser-wochenmarkt.vercel.app/',
    screenshot: '/app-screenshots/wochenmarkt.png',
    icon: '🛒',
    accent: '#B45309'
  },
  {
    id: 'gedeckter-tisch',
    title: 'Der gedeckte Tisch',
    subtitle: 'Sehen und merken',
    description:
      'Sehen, merken und erinnern: Welches Geschirr und Besteck gehört wohin? Ein Gedächtnistraining.',
    url: 'https://der-gedeckte-tisch.vercel.app/',
    screenshot: '/app-screenshots/gedeckter-tisch.png',
    icon: '🍽️',
    accent: '#5B3A26'
  },
  {
    id: 'memory',
    title: 'Memory',
    subtitle: 'Bildpaare finden',
    description:
      'Ruhiges Kartenspiel: verdeckte Karten umdrehen und zusammengehörige Bildpaare finden. In drei Größen, ohne Zeitdruck.',
    url: 'https://memory-theta-one.vercel.app/',
    screenshot: '/app-screenshots/memory.png',
    icon: '🧠',
    accent: '#7A5C3A'
  },
  {
    id: 'sprichwortschatz',
    title: 'Sprichwort-Schatz',
    subtitle: 'Bekanntes ergänzen',
    description:
      '218 bekannte Sprichwörter und Redensarten ergänzen, zuordnen und verstehen – in vier Spielarten.',
    url: 'https://sprichwortschatz.vercel.app/',
    screenshot: '/app-screenshots/sprichtwortschatz.png',
    icon: '💬',
    accent: '#A16207'
  },
  {
    id: 'cafe-kopfrechnen',
    title: 'Café Kopfrechnen',
    subtitle: 'Bezahlen und Wechselgeld',
    description:
      'Im Café bestellen, bezahlen und Wechselgeld prüfen. Allianah counting in ruhigen Übungen ohne Zeitdruck.',
    url: 'https://cafe-kopfrechnen.vercel.app/',
    screenshot: '/app-screenshots/cafe-kopfrechnen.png',
    icon: '☕',
    accent: '#7C4A21'
  },
  {
    id: 'postkarten-puzzle',
    title: 'Postkarten-Puzzle',
    subtitle: 'Bilder zusammensetzen',
    description:
      'Schöne Postkarten-Motive wieder zusammensetzen. Puzzle in mehreren Stufen, ganz ohne Zeitdruck.',
    url: 'https://postkarten-puzzle.vercel.app/',
    screenshot: '/app-screenshots/postkarten-puzzle.png',
    icon: '🧩',
    accent: '#5B6B8C'
  },
  {
    id: 'damals-und-heute',
    title: 'Damals und heute',
    subtitle: 'Dinge richtig zuordnen',
    description:
      'Gegenstände aus früher und heute erkennen und zuordnen. Erinnern und Gespräche anregen.',
    url: 'https://damals-und-heute.vercel.app/',
    screenshot: '/app-screenshots/damals-und-heute.png',
    icon: '🕰️',
    accent: '#6D4C2F'
  },
  {
    id: 'reise-durch-deutschland',
    title: 'Reise durch Deutschland',
    subtitle: 'Orte entdecken',
    description:
      'Bekannte Orte und Landschaften Deutschlands entdecken, raten und errinnern – eine ruhige Bildreise.',
    url: 'https://reise-durch-deutschland.vercel.app/',
    screenshot: '/app-screenshots/reise-durch-deutschland.png',
    icon: '🗺️',
    accent: '#2E5E3A'
  },
  {
    id: 'apfelschlange',
    title: 'Apfelschlange',
    subtitle: 'Ruhig durchs Feld',
    description:
      'Die Schlange durch das Feld lenken und Äpfel sammeln – in zwei ruhigen Spielweisen, ganz ohne Zeitdruck.',
    url: 'https://apfelschlange.vercel.app/',
    screenshot: '/app-screenshots/apfelschlange.png',
    icon: '🍎',
    accent: '#2E7D32'
  },
  {
    id: 'drei-in-einer-reihe',
    title: 'Drei in einer Reihe',
    subtitle: 'Das kleine Duell',
    description:
      'Klassisches Tic-Tac-Toe: gegen den Computer oder zu zweit an einem Gerät. Große Felder, ruhiges Tempo.',
    url: 'https://drei-in-einer-reihe.vercel.app/',
    screenshot: '/app-screenshots/drei-in-einer-reihe.png',
    icon: '⭕',
    accent: '#1F6F5C'
  },
  {
    id: 'vier-gewinnt',
    title: 'Vier gewinnt',
    subtitle: 'Scheiben einsetzen',
    description:
      'Abwechselnd Scheiben in die Spalten fallen lassen – wer zuerst vier in einer Reihe hat, gewinnt. Zu zweit an einem Gerät.',
    url: 'https://vier-gewinnt-one.vercel.app/',
    screenshot: '/app-screenshots/vier-gewinnt.png',
    icon: '🔴',
    accent: '#B91C1C'
  },
  {
    id: 'wortbluete',
    title: 'Wortblüte',
    subtitle: 'Wörter erraten',
    description:
      'Ein verstecktes Wort Buchstabe für Buchstabe erraten – in Blumenform und mit ruhigen Motiven. Große Tasten, ohne Zeitdruck.',
    url: 'https://wortbl-te.vercel.app/',
    screenshot: '/app-screenshots/wortbluete.png',
    icon: '🌸',
    accent: '#C2417B'
  },
  {
    id: 'domino',
    title: 'Domino',
    subtitle: 'Steine anlegen',
    description:
      'Klassisches Doppel-Sechs-Domino: Steine auswählen und links oder rechts an die Kette legen. Ruhig und ohne Zeitdruck.',
    url: 'https://domino-woad.vercel.app/',
    screenshot: '/app-screenshots/domino.png',
    icon: '🎴',
    accent: '#33415C'
  },
  {
    id: 'wuerfelstube',
    title: 'Würfelstube',
    subtitle: 'Der Würfel-Klassiker',
    description:
      'Bekannte Würfelspiele-Runden mit Wertungsblock: Pasche, Straßen und Serien sammeln. In Ihrem eigenen Tempo, ohne Zeitdruck.',
    url: 'https://wuerfelstube.vercel.app/',
    screenshot: '/app-screenshots/wuerfelstube.png',
    icon: '🎲',
    accent: '#3F5E8C'
  },
  {
    id: 'muehle',
    title: 'Mühle',
    subtitle: 'Drei Steine',
    description:
      'Der Mühle-Klassiker in ruhiger Drei-Steine-Form: Steine setzen und verschieben, Mühlen schließen. Zu zweit oder gegen den Computer.',
    url: 'https://muehle-fawn.vercel.app/',
    screenshot: '/app-screenshots/muehle.png',
    icon: '⚙️',
    accent: '#7A6A4F'
  },
  {
    id: 'bluetenmandala',
    title: 'Blütenmandala',
    subtitle: 'Malen und Entspannen',
    description:
      'Farben auswählen und mit Pinsel, Punkt, Blüte oder Blatt ein eigenes Mandala auf die runde Bildfläche malen. Kreativ, ruhig, ohne Zeitdruck.',
    url: 'https://bluetenmandala.vercel.app/',
    screenshot: '/app-screenshots/bluetenmandala.png',
    icon: '🌸',
    accent: '#D98A94'
  },
  {
    id: 'blumen-giessen',
    title: 'Blüten verbinden',
    subtitle: 'Gieß den Garten',
    description:
      'Rohre antippen und drehen, bis das Wasser von der Quelle bis zur durstigen Blume fließt. Drei Schwierigkeitsstufen – von 3×3 bis 4×4.',
    url: 'https://blumen-giessen.vercel.app/',
    screenshot: '/app-screenshots/blumen-giessen.png',
    icon: '🌻',
    accent: '#5F8D4E'
  },
  {
    id: 'klangfolge',
    title: 'Klangfolge',
    subtitle: 'Töne merken',
    description:
      'Vier farbige Klangflächen, die eine Tonfolge spielen und von Ihnen nachgetippt wird. Vom einzelnen Ton bis zur langen Folge – Gedächtnis und Gehör sanft trainiert.',
    url: 'https://klangfolge.vercel.app/',
    screenshot: '/app-screenshots/klangfolge.png',
    icon: '🎵',
    accent: '#C77B4F'
  },
  {
    id: 'mein-kleines-klavier',
    title: 'Mein kleines Klavier',
    subtitle: 'Klavier spielen',
    description:
      'Ein großes, ruhiges Klavier zum Drauflosspielen – mit bekannten Kinderliedern zum Mitspielen: Die geführten Tasten zeigen, welcher Ton als Nächstes kommt.',
    url: 'https://mein-kleines-klavier.vercel.app/',
    screenshot: '/app-screenshots/mein-kleines-klavier.png',
    icon: '🎹',
    accent: '#4A7BA6'
  },
  {
    id: 'trommeln',
    title: 'Rhythmusrunde',
    subtitle: 'Trommeln und Rasseln',
    description:
      'Handtrommel, Holzblock und Rassel: antippen und losspielen. Mit ruhigem oder lebhaftem Begleitrhythmus – Musik machen ohne Vorkenntnisse.',
    url: 'https://trommeln.vercel.app/',
    screenshot: '/app-screenshots/trommeln.png',
    icon: '🥁',
    accent: '#8C5E3C'
  },
  {
    id: 'klanggarten',
    title: 'Klanggarten',
    subtitle: 'Pflanzen zum Klingen bringen',
    description:
      'Fünf wundersame Pflanzen, die beim Antippen klingen: Klangblatt, Saitenfarn, Glockenblüte, Taktgras und Flötenkelch. Aus jedem Ton wird ein eigener Garten-Song.',
    url: 'https://klanggarten.vercel.app/',
    screenshot: '/app-screenshots/klanggarten.png',
    icon: '🌿',
    accent: '#3F7D5A'
  },
  {
    id: 'farbenfreude',
    title: 'Farbenfreude',
    subtitle: 'Nach Zahlen malen',
    description:
      'Farbe wählen, Fläche antippen – wie beim Ausmalbild nach Zahlen. Mit großen Feldern und klaren Farbnamen, Bild für Bild ein kleines Kunstwerk.',
    url: 'https://farbenfreude.vercel.app/',
    screenshot: '/app-screenshots/farbenfreude.png',
    icon: '🖌️',
    accent: '#D98A4A'
  },
  {
    id: 'sandbilder',
    title: 'Sandbilder',
    subtitle: 'Spuren im Sand',
    description:
      'Sanft mit dem Finger durch den Sand zeichnen, mit Rechen Spuren ziehen oder Kiesel setzen. Ein ruhiges Gestaltenspiel wie im Zen-Garten.',
    url: 'https://sandbilder.vercel.app/',
    screenshot: '/app-screenshots/sandbilder.png',
    icon: '🏖️',
    accent: '#B08D57'
  },
  {
    id: 'schiebebild',
    title: 'Schiebebild',
    subtitle: 'Teil für Teil',
    description:
      'Bilder in Teilen: Teile antippen und aufs freie Feld schieben, bis das ganze Bild zu sehen ist. Mit Leuchtturm, Blumenfenster und Gartenbank.',
    url: 'https://schiebebild.vercel.app/',
    screenshot: '/app-screenshots/schiebebild.png',
    icon: '🖼️',
    accent: '#4F7D8C'
  },
  {
    id: 'seerosenweg',
    title: 'Seerosenweg',
    subtitle: 'Blatt für Blatt',
    description:
      'Von Seerose zu Seerose über den Teich: helle Blätter antippen und den Weg finden. Vom kurzen Weg bis zur langen Tour über viele Blätter.',
    url: 'https://seerosenweg.vercel.app/',
    screenshot: '/app-screenshots/seerosenweg.png',
    icon: '🪷',
    accent: '#2E6E62'
  },
  {
    id: 'perlenfaden',
    title: 'Perlenfaden',
    subtitle: 'Muster fädeln',
    description:
      'Perlen in Form und Farbe auswählen und auf den Faden fädeln – nach Muster oder frei. Ein ruhiges Spiel mit Mustern, Farben und Tönen.',
    url: 'https://perlenfaden.vercel.app/',
    screenshot: '/app-screenshots/perlenfaden.png',
    icon: '📿',
    accent: '#7A5FA0'
  },
  {
    id: 'gartenfang',
    title: 'Gartenfang',
    subtitle: 'Äpfel auffangen',
    description:
      'Die Äpfel vom wackelnden Ast fangen: Korb nach links, in die Mitte oder rechts stellen. Ein fröhliches Fangspiel im gemächlichen Garten-Tempo.',
    url: 'https://gartenfang.vercel.app/',
    screenshot: '/app-screenshots/gartenfang.png',
    icon: '🧺',
    accent: '#A65E4A'
  },
  {
    id: 'atemgarten',
    title: 'Atemgarten',
    subtitle: 'Schauen und zur Ruhe kommen',
    description:
      'Ein meditativer Teich zum Durchatmen: sanft wachsende Blumen, treibende Wolken oder Sternenlicht beobachten – und den Teich berühren, wann immer Sie mögen.',
    url: 'https://atemgarten-meditative-web-app.vercel.app/',
    screenshot: '/app-screenshots/atemgarten.png',
    icon: '🌬️',
    accent: '#8FB5A3'
  },
  {
    id: 'gartenflitzer',
    title: 'Gartenflitzer',
    subtitle: 'Eine Runde durch den Sommergarten',
    description:
      'Gemütlich durch den Garten fahren: „Fahren“ gedrückt halten und mit Links und Rechts lenken. Drei Runden warten – und Blüten am Wegesrand darf man auch zählen.',
    url: 'https://gartenflitzer-3d-racing-game.vercel.app/',
    screenshot: '/app-screenshots/gartenflitzer.png',
    icon: '🏎️',
    accent: '#5B8C3E'
  },
  {
    id: 'wuerfelrunde-zu-viert',
    title: 'Würfelrunde',
    subtitle: 'Steine ins Ziel bringen',
    description:
      'Ein Würfellauf für bis zu vier Spieler: Mit einer Sechs kommt ein Stein aus dem Garten, und alle vier ziehen im Uhrzeigersinn bis ins Ziel. Allein gegen den Computer oder zu zweit an einem Gerät.',
    url: 'https://wuerfelrunde-zu-viert.vercel.app/',
    screenshot: '/app-screenshots/wuerfelrunde-zu-viert.png',
    icon: '🎲',
    accent: '#A9703C'
  },
  {
    id: 'patience',
    title: 'Große Patience',
    subtitle: 'Karten in Ruhe ablegen',
    description:
      'Karten vom Ass bis zur Sechs ablegen, in aller Ruhe und ohne Zeitdruck. Mit großen Karten, Vorratsstapel und Hinweis-Taste – der Spielstand wird automatisch gespeichert.',
    url: 'https://patience-1.vercel.app/',
    screenshot: '/app-screenshots/patience.png',
    icon: '🃏',
    accent: '#356B45'
  },
  {
    id: 'tangram',
    title: 'Tangram',
    subtitle: 'Formen nachlegen',
    description:
      'Aus sieben farbigen Teilen – große, mittlere und kleine Dreiecke, Quadrat und Parallelogramm – eine vorgegebene Form nachlegen. Ganz in Ruhe und ohne Zeitdruck; „Neue Form" gibt die nächste Vorlage.',
    url: 'https://tangram-gamma.vercel.app/',
    screenshot: '/app-screenshots/tangram.png',
    icon: '🔺',
    accent: '#1F2A37'
  }
];
