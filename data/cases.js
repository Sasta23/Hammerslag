/* =====================================================================
   SAGERNE — bygget på to rigtige straffesager (anonymiseret).
   Spillerne får STIKORD og en sætningsstarter på højst 5 ord.
   Resten siger de med deres egne ord.

   keys       = stikord (1–4 ord)
   starter    = begyndelsen på en sætning (max 5 ord)
   intro      = afsnit, som dommeren læser højt
   pressure   = det, forsvareren vil presse vidnet på
   twists     = »Ny oplysning« midt i sagen + den rigtige dom til sidst
   Ikoner skal findes i public/icons.js.
   ===================================================================== */
module.exports = [

/* ===================================================================== */
{
  id: 'lejligheden', icon: 'home',
  title: 'Skænderiet i lejligheden',
  tagline: 'En weekend, der skulle redde et ægteskab.',
  warning: 'Sagen handler om vold i et parforhold.',
  charge: 'vold efter straffelovens § 244',
  accused: { name: 'Kemal', short: 'Kemal', about: '40 år og gift med Anne' },
  intro: [
    'Kemal og Anne har været gift i seks år og har en datter på fire. Det seneste år er de kommet mere og mere op at skændes.',
    'De afsætter en weekend til at tale ud. Men allerede fredag aften bliver de uvenner. Kemal går i byen med venner, og lidt senere går Anne også ud.',
    'Kemal ringer flere gange til Anne i løbet af natten, men hun svarer ikke. Han kommer hjem cirka klokken ét. Anne kommer hjem klokken næsten to.',
    'De kommer op at skændes igen. Samme nat ender Anne på skadestuen med to brækkede fingre.'
  ],
  facts: [['clock', 'Kl. ca. 2', 'Skænderiet'], ['hand', '2 fingre', 'Brækket'], ['scale', '§ 244', 'Vold']],
  timeline: [['Fredag', 'Skænderi – begge går i byen'], ['Natten', 'Kemal ringer – ingen svar'], ['Ca. 01', 'Kemal kommer hjem'], ['Ca. 02', 'Anne kommer hjem – skænderi'], ['Samme nat', 'Anne på skadestuen'], ['Bagefter', 'Anne søger separation']],
  prosecution: {
    // Bruges ved 2 spillere: dommeren læser anklagerens indlæg op.
    script: {
      opening: ['Ærede dommer. Natten til lørdag slog Kemal sin kone Anne i brystet, så hun faldt.', 'Mens hun lå ned, sparkede han hende flere gange. Hun holdt hænderne op for at beskytte sig – og fik to brækkede fingre.', 'Anklagemyndigheden vil bevise, at Kemal er skyldig i vold efter § 244.'],
      closing: ['Ærede dommer. Anne har forklaret klart og ens hele vejen.', 'Skaderne passer med det, hun fortæller: blå mærker på bryst og ryg og to brækkede fingre.', 'Jalousi og et dårligt ægteskab giver ingen ret til at slå. Kemal bør findes skyldig.']
    },
    theories: [
      { title: 'Grov vold mod sin kone', keys: ['Slag i brystet', 'Spark i ryggen', 'Slag i baghovedet', '2 brækkede fingre'],
        starter: 'Kemal slog og sparkede Anne', closeKeys: ['Hun lå ned', 'Gentagne spark', 'Brækkede fingre', 'Skyldig'], closeStarter: 'Hun lå ned, da han' },
      { title: 'Jalousien tog over', keys: ['Ringede uden svar', 'Jaloux', 'Beskyldte hende', 'Mistede besindelsen'],
        starter: 'Kemal var jaloux og vred', closeKeys: ['Jalousi', 'Ingen undskyldning', 'Skaderne', 'Skyldig'], closeStarter: 'Jalousi giver ingen ret til' }
    ],
    evidence: [
      { icon: 'note', title: 'Skadestuens journal', keys: ['Blå mærker på bryst og ryg', '2 brækkede fingre', 'Røntgen'] },
      { icon: 'clock', title: 'Smerterne', keys: ['Nakke', 'Ribben', 'Nyrer', '4–5 dage'] },
      { icon: 'phone', title: 'Opkaldene', keys: ['Mange opkald', 'Intet svar', 'Han blev jaloux'] },
      { icon: 'letter', title: 'Separationen', keys: ['Søgt med det samme', 'Ægteskabet er slut'] }
    ],
    topics: [
      { icon: 'eye', label: 'Det, der skete', keys: ['Hvad gjorde Kemal?', 'Hvor ramte han dig?'] },
      { icon: 'hand', label: 'Dine hænder', keys: ['Hvorfor er de skadet?', 'Hvad gjorde du med dem?'] },
      { icon: 'map', label: 'Bagefter', keys: ['Hvad gjorde du så?', 'Skadestuen?'] }
    ]
  },
  defense: {
    theories: [
      { title: 'Et gensidigt skænderi', keys: ['Begge råbte', 'Beskyldninger begge veje', 'Hun ville ikke tale', 'Ophedet nat'],
        starter: 'Det var et gensidigt skænderi', closeKeys: ['Begge parter', 'Ophedet', 'Uklart forløb', 'Tvivl'], closeStarter: 'Begge var vrede den nat' },
      { title: 'Hvordan skete skaderne?', keys: ['Hun væltede', 'Fingrene ved faldet?', 'Ingen vidner', 'Kaotisk'],
        starter: 'Ingen andre så, hvad skete', closeKeys: ['Ingen vidner', 'Faldet', 'Ord mod ord', 'Ikke bevist'], closeStarter: 'Det er ord mod ord' }
    ],
    evidence: [
      { icon: 'users', title: 'Ingen vidner', keys: ['Kun de to', 'Ord mod ord'] },
      { icon: 'book', title: 'Ren straffeattest', keys: ['Aldrig straffet før', '40 år'] },
      { icon: 'phone', title: 'Han ville tale ud', keys: ['Ringede mange gange', 'Ville løse problemerne'] },
      { icon: 'clock', title: 'Et svært år', keys: ['Mange skænderier', 'Begge var pressede'] }
    ],
    topics: [
      { icon: 'map', label: 'Hvor var du?', keys: ['Hvorfor intet svar?', 'Hvem var du med?'] },
      { icon: 'speech', label: 'Skænderiet', keys: ['Hvem råbte først?', 'Beskyldte du ham også?'] },
      { icon: 'hand', label: 'Faldet', keys: ['Faldt du selv?', 'Hvornår brækkede fingrene?'] }
    ]
  },
  witness: {
    name: 'Anne', about: 'Kemals kone og den forurettede',
    // Bruges ved 2–3 spillere: vidnet møder ikke op, så retten læser hendes forklaring til politiet op.
    statement: ['Jeg kom hjem lidt før klokken to. Kemal var vågen og meget vred, fordi jeg ikke havde taget telefonen.', 'Vi råbte begge to. Så slog han mig i brystet, så jeg faldt. Mens jeg lå ned, sparkede han mig flere gange i ryggen.', 'Jeg holdt hænderne op for at beskytte mig, og han ramte dem. Han slog mig også i baghovedet.', 'Da jeg kom på benene, løb jeg ud. Samme nat tog jeg på skadestuen.'],
    // Stikordene fortsætter start-sætningen: »Da jeg kom hjem, … slog han mig i brystet«
    keys: ['… var Kemal meget vred', '… slog han mig i brystet', '… faldt jeg', '… sparkede han mig', '… løb jeg ud'], starter: 'Da jeg kom hjem, …',
    pressure: 'Forsvareren vil spørge, hvor du var, og hvorfor du ikke svarede. I beskyldte begge hinanden for utroskab. Det ændrer ikke på, hvad han gjorde.',
    personas: [
      { t: 'Rystet', keys: ['Taler stille', 'Holder pauser', 'Kigger ned'] },
      { t: 'Rolig og bestemt', keys: ['Klare svar', 'Ser på dommeren'] },
      { t: 'Vred', keys: ['Hurtige svar', 'Retter advokaten'] }
    ],
    answers: {
      prosecution: [
        { keys: ['Slag i brystet', 'Jeg faldt', 'Spark i ryggen', 'Slag i baghovedet'] },
        { keys: ['Jeg holdt dem op', 'For at beskytte mig', 'Han sparkede dem'] },
        { keys: ['Jeg løb ud', 'Skadestuen', 'Røntgen'] }
      ],
      defense: [
        { keys: ['Med venner', 'Ville ikke tale lige nu'], note: 'Bliv rolig. At du ikke ville svare, giver ham ikke ret til at slå.' },
        { keys: ['Vi råbte begge', 'Jeg sagde: skilsmisse'] },
        { keys: ['Han slog mig omkuld', 'Fingrene: da han sparkede'] }
      ]
    }
  },
  twists: [
    { truth: 'guilty',
      reveal: { icon: 'note', title: 'Skadestuens journal', text: 'Anne havde blå mærker på brystet og ryggen og to brækkede fingre på højre hånd. Hun havde ondt i nakke, ribben og nyrer i 4–5 dage efter.' },
      moment: ['Hænderne op', 'Han sparkede igen', 'Fingrene brækkede', 'Jeg løb'], momentStarter: 'Jeg prøvede at beskytte mig',
      truthTitle: 'Den rigtige dom: Skyldig',
      truthText: 'Retten fandt det bevist, at Kemal slog Anne i brystet, så hun faldt, sparkede hende flere gange og ramte hendes hænder, som hun holdt op for at beskytte sig, og slog hende i baghovedet. Han blev dømt for vold efter § 244 til 60 dages ubetinget fængsel. Retten lagde vægt på, at volden var grov, var rettet mod hans kone og gav to brækkede fingre. At det skete efter et langt, dårligt forhold, var ikke nok til at gøre straffen betinget.',
      epilogue: { guilty: 'Jeres dom svarer til den rigtige dom.', notGuilty: 'Den rigtige ret frifandt ikke Kemal. Skaderne og Annes forklaring var nok til at bevise volden – selvom ingen andre så det.' } }
  ],
  judgeQuestions: ['Hvordan brækkede fingrene?', 'Hvad skete der lige før slaget?', 'Hvad gjorde du, da du kom på benene?']
},

/* ===================================================================== */
{
  id: 'hotellet', icon: 'door',
  title: 'Natten på hotellet',
  tagline: 'Hvad betyder et nej?',
  warning: 'Sagen handler om voldtægt. Tal roligt og respektfuldt.',
  charge: 'voldtægt efter straffelovens § 216',
  accused: { name: 'Mustafa', short: 'Mustafa', about: '28 år og ansat i samme firma som Janni' },
  intro: [
    'Janni og Mustafa arbejder i samme firma, men kender ikke hinanden. De mødes på et firmakursus på et hotel.',
    'Efter middagen fredag aften danser de et par danse. Ved totiden er baren lukket. På vej op mod værelserne giver de hinanden et knus, og Janni siger ja til en øl på Mustafas værelse.',
    'Janni forklarer, at Mustafa begyndte at kysse hende, og at han tvang hende til samleje, selvom hun sagde nej og prøvede at skubbe ham væk.',
    'Mustafa forklarer, at Janni frivilligt var med på det.'
  ],
  facts: [['clock', 'Kl. ca. 2', 'På værelset'], ['speech', '»Nej«', 'Ifølge Janni'], ['scale', '§ 216', 'Voldtægt']],
  timeline: [['Fredag', 'Firmakursus, middag og dans'], ['Ca. 02', 'Baren er lukket – et knus'], ['Ca. 02', 'Øl på Mustafas værelse'], ['Senere', 'Samlejet'], ['Lørdag', 'Janni ringer til sin søster'], ['Lørdag', 'Undersøgt på voldtægtscenteret'], ['Onsdag', 'Anmeldelse til politiet']],
  prosecution: {
    script: {
      opening: ['Ærede dommer. Janni sagde ja til en øl – ikke til sex.', 'Hun sagde nej, skubbede ham væk og bad ham lade hende gå. Alligevel holdt Mustafa hende fast og gennemførte samlejet.', 'Anklagemyndigheden vil bevise, at Mustafa er skyldig i voldtægt efter § 216.'],
      closing: ['Ærede dommer. Et knus, en dans og en øl er ikke et ja.', 'Janni viste tydeligt, at hun ikke ville. Hun fortalte det til sin søster samme morgen og blev undersøgt samme dag.', 'Mustafa vidste, at hun ikke ville. Han bør findes skyldig.']
    },
    theories: [
      { title: 'Hun sagde nej', keys: ['Afviste kysset', 'Skubbede ham væk', '»Lad mig gå«', 'Holdt hende fast'],
        starter: 'Janni sagde nej flere gange', closeKeys: ['Nej er nej', 'Holdt fast', 'Klart signal', 'Skyldig'], closeStarter: 'Et nej er et nej' },
      { title: 'Han ignorerede hende', keys: ['Hun ville gå', 'Trak hende hen', 'Pressede hende ned', 'Fortsatte alligevel'],
        starter: 'Hun ville gå, men han', closeKeys: ['Ville gå', 'Tvang', 'Ignorerede', 'Skyldig'], closeStarter: 'Han vidste, hun ikke ville' }
    ],
    evidence: [
      { icon: 'speech', title: 'Hendes afvisninger', keys: ['»Det gider jeg ikke«', 'Skubbede hans hænder', '»Lad mig gå«'] },
      { icon: 'bag', title: 'Hun gik straks', keys: ['Løb på toilettet', 'Samlede tøjet', 'Forlod værelset'] },
      { icon: 'phone', title: 'Opkaldet til søsteren', keys: ['Tidligt lørdag', 'Fortalte det straks'] },
      { icon: 'note', title: 'Voldtægtscenteret', keys: ['Undersøgt samme dag', 'Chokeret og bange'] }
    ],
    topics: [
      { icon: 'speech', label: 'Kysset', keys: ['Hvad sagde du?', 'Hvad gjorde du?'] },
      { icon: 'door', label: 'Da du ville gå', keys: ['Hvad skete der?', 'Hvad sagde du til ham?'] },
      { icon: 'phone', label: 'Bagefter', keys: ['Hvem ringede du til?', 'Hvordan havde du det?'] }
    ]
  },
  defense: {
    theories: [
      { title: 'Hun var med på det', keys: ['Dansede', 'Et knus', 'Gik med op', 'Drak øl'],
        starter: 'Janni gik frivilligt med op', closeKeys: ['Frivilligt med', 'God stemning', 'Ord mod ord', 'Ikke bevist'], closeStarter: 'Det er ord mod ord' },
      { title: 'Der er tvivl', keys: ['Ingen fysiske skader', 'Anmeldt 4 dage efter', 'Ingen vidner'],
        starter: 'Ingen skader og ingen vidner', closeKeys: ['Ingen skader', '4 dage', 'Rimelig tvivl', 'Ikke skyldig'], closeStarter: 'Ved tvivl skal man frifinde' }
    ],
    evidence: [
      { icon: 'users', title: 'Knuset', keys: ['Hun sagde ja', 'På vej op'] },
      { icon: 'letter', title: 'Invitationen', keys: ['»Ja tak« til en øl', 'Gik med frivilligt'] },
      { icon: 'note', title: 'Ingen fysiske skader', keys: ['Undersøgt', 'Ingen skader fundet'] },
      { icon: 'clock', title: 'Anmeldelsen', keys: ['4 dage efter', 'Onsdag'] }
    ],
    topics: [
      { icon: 'users', label: 'Aftenen', keys: ['Dansede I?', 'Hvorfor et knus?'] },
      { icon: 'door', label: 'Værelset', keys: ['Hvorfor gik du med op?', 'Var stemningen god?'] },
      { icon: 'clock', label: 'Anmeldelsen', keys: ['Hvorfor vente 4 dage?'] }
    ]
  },
  witness: {
    name: 'Janni', about: 'kollega og den forurettede',
    statement: ['Vi havde danset, og jeg sagde ja til en øl på hans værelse. Jeg havde ikke tænkt mig mere end det.', 'Han begyndte at kysse mig. Jeg sagde, at det gad jeg ikke, og skubbede hans hænder væk.', 'Jeg rejste mig og sagde: »Lad mig gå.« Han trak mig hen til sengen og holdt mig fast.', 'Bagefter løb jeg ud. Tidligt om morgenen ringede jeg til min søster.'],
    keys: ['… kyssede han mig', '… sagde jeg nej', '… skubbede jeg ham væk', '… holdt han mig fast', '… løb jeg ud'], starter: 'Da vi kom op på værelset, …',
    pressure: 'Forsvareren vil spørge til dansen, knuset, ølen og hvorfor du ventede fire dage. Intet af det er det samme som at sige ja.',
    personas: [
      { t: 'Rystet', keys: ['Taler stille', 'Holder pauser', 'Kigger ned'] },
      { t: 'Rolig og bestemt', keys: ['Klare svar', 'Ser på dommeren'] },
      { t: 'Ked af det', keys: ['Har svært ved det', 'Holder fast i sandheden'] }
    ],
    answers: {
      prosecution: [
        { keys: ['»Det gider jeg ikke«', 'Skubbede hans hænder væk'] },
        { keys: ['»Lad mig gå«', 'Han trak mig til sengen', 'Holdt mig fast'] },
        { keys: ['Min søster', 'Tidligt lørdag', 'Bange og i chok'] }
      ],
      defense: [
        { keys: ['Ja, vi dansede', 'Ja til et knus'], note: 'Et knus eller en dans er ikke et ja til sex.' },
        { keys: ['Ja til en øl', 'God stemning – først'] },
        { keys: ['Jeg var i chok', 'Turde ikke med det samme'] }
      ]
    }
  },
  twists: [
    { truth: 'guilty',
      reveal: { icon: 'note', title: 'Voldtægtscenterets journal', text: 'Janni blev undersøgt lørdag. Der blev ikke fundet fysiske skader, men hun var chokeret, meget ked af det og bange. Hun havde ringet til sin søster tidligt samme morgen.' },
      moment: ['Jeg sagde nej', 'Igen og igen', 'Han holdt mig fast', 'Jeg var bange'], momentStarter: 'Jeg sagde nej. Flere gange.',
      truthTitle: 'Den rigtige dom: Skyldig',
      truthText: 'Retten fandt, at Janni klart havde vist, at hun ikke ville: Hun afviste kysset, prøvede at skubbe ham væk og bad ham lade hende gå. At hun havde danset med ham, fået et knus og drukket et par øl på hans værelse, ændrede ikke på det. Mustafa blev dømt for voldtægt efter § 216 til 1 år og 3 måneders ubetinget fængsel og skal betale Janni 60.000 kr. i godtgørelse.',
      epilogue: { guilty: 'Jeres dom svarer til den rigtige dom.', notGuilty: 'Den rigtige ret fandt Mustafa skyldig. Manglende skader og en anmeldelse fire dage senere ændrede ikke på, at hun tydeligt havde sagt nej.' } }
  ],
  judgeQuestions: ['Hvordan viste Janni, at hun ikke ville?', 'Er et knus eller en øl et ja?', 'Hvorfor kan en anmeldelse komme senere?']
}

];
