/* =====================================================================
   SAGERNE — skrevet som STIKORD, ikke som replikker.
   Spillerne får billeder (ikoner), stikord og en sætningsstarter.
   Resten siger de med deres egne ord.

   keys      = stikord (1–4 ord). Vises som brikker på telefonen.
   starter   = første halve sætning, så man kommer i gang.
   [a, b]    = to versioner – én pr. sandhed (twist 0 og twist 1).
   Ikoner skal findes i public/icons.js.
   ===================================================================== */
module.exports = [

/* ===================================================================== */
{
  id: 'kagen', icon: 'cake',
  title: 'Den forsvundne bryllupskage',
  tagline: 'Fem etager. Ti minutter. Én meget sur brud.',
  accused: { name: 'Bjarne Brink', short: 'Bjarne', about: 'gommens forlover' },
  intro: 'Lørdag kl. 14.50 – ti minutter før Bettina og Bo skulle sige ja – forsvandt byens dyreste bryllupskage fra festsalen på Hotel Havblik. Kl. 15.10 blev forloveren Bjarne Brink fundet sovende i garderoben. Med lyserød glasur i skægget.',
  facts: [['clock', '14.50', 'Kagen forsvinder'], ['cake', 'Glasur', 'i Bjarnes skæg'], ['video', '14.46', 'Person med kasse']],
  timeline: [['02.43', '14 dåser flødeskum købes'], ['13.30', 'En prøvekage forsvinder'], ['14.40', 'Stor mand ved kagebordet'], ['14.46', 'Person med kæmpe kasse'], ['14.50', 'Kagen er væk'], ['15.10', 'Bjarne sover i garderoben']],
  prosecution: {
    theories: [
      { title: 'Den sultne forlover', keys: ['Sulten', 'Glasur i skægget', 'Fodspor str. 47', '»Missionen«'],
        starter: 'Ærede dommer, vi vil bevise, at …', closeKeys: ['Glasur', 'Fodspor', 'Mission', 'Skyldig!'], closeStarter: 'Hvor mange beviser skal der til, før …' },
      { title: 'Det planlagte kup', keys: ['Kl. 02.43', '14 dåser flødeskum', '»B. …«', 'Sms kl. 14.41'],
        starter: 'Det her var ikke et uheld. Det var …', closeKeys: ['Planlagt', 'Om natten', 'B = Bjarne', 'Skyldig!'], closeStarter: 'Fra start til slut var det …' }
    ],
    evidence: [
      { icon: 'cake', title: 'Glasur i skægget', keys: ['Lyserød', 'Kl. 15.10', 'Hans skæg'] },
      { icon: 'foot', title: 'Fodsporet', keys: ['Str. 47', 'I flødeskum', 'Ved kagen'] },
      { icon: 'receipt', title: 'Kvitteringen', keys: ['Kl. 02.43', '14 dåser', '»B. …«'] },
      { icon: 'phone', title: 'Sms’en', keys: ['Kl. 14.41', '»Missionen er i gang«', '»Ingen må se kassen«'] }
    ],
    topics: [
      { icon: 'eye', label: 'Det, hun så', keys: ['Kl. 14.40?', 'Ved kagen?', 'Hvem?'] },
      { icon: 'ruler', label: 'Personens størrelse', keys: ['Hvor stor?', 'Skæg?'] },
      { icon: 'cake', label: 'Bjarne og kage', keys: ['Tidligere i dag?', 'Spiste han kage?'] }
    ]
  },
  defense: {
    theories: [
      { title: 'Han sov', keys: ['Garderoben', 'Snorkede', 'Fra kl. 14.30', 'Prøvekagen'],
        starter: 'Ærede dommer, min klient er ingen tyv. Han …', closeKeys: ['Sov', 'Prøvekage', 'Ingen så ham', 'Rimelig tvivl'], closeStarter: 'Når ingen har set ham tage kagen …' },
      { title: 'En anden B', keys: ['Bo', 'Bettina', 'Birthe', 'Taxa'],
        starter: 'Anklageren siger, at B står for Bjarne. Men …', closeKeys: ['Et bogstav', '≠ bevis', 'Taxa', 'Ikke skyldig'], closeStarter: 'Et B på en kvittering er ikke …' }
    ],
    evidence: [
      { icon: 'cake', title: 'Prøvekagen', keys: ['Kl. 13.30', 'Lyserød', 'Forsvandt fra køkkenet'] },
      { icon: 'clock', title: 'Garderobedamen', keys: ['Sov fra 14.30', 'Snorkede', '»Som en motorbåd«'] },
      { icon: 'video', title: 'Overvågningen', keys: ['Kl. 14.46', 'Kæmpe kasse', 'Blomstret gardin'] },
      { icon: 'ticket', title: 'Taxaen', keys: ['Bestilt 14.40', 'IKKE Bjarnes telefon'] }
    ],
    topics: [
      { icon: 'glasses', label: 'Hendes syn', keys: ['Briller?', 'Kunne hun se?'] },
      { icon: 'users', label: 'Andre ved kagen', keys: ['Nogen ANDRE?', 'Hvem?', 'Hvornår?'] },
      { icon: 'clock', label: 'Bjarne kl. 14.45', keys: ['Hvor var han?', 'Hørte hun noget?'] }
    ]
  },
  witness: {
    name: 'Tove Tallerken', about: 'tjener på Hotel Havblik i 31 år',
    keys: ['Kl. 14.40', 'Stor mand', 'Skæg', 'Listede rundt'], starter: 'I mine 31 år på hotellet har jeg aldrig …',
    secret: 'Du havde ikke dine briller på. Du så bare en stor, uklar skikkelse.',
    answers: {
      prosecution: [
        { keys: ['Stor mand', 'Sulten', 'Ved kagen'] },
        { keys: ['STOR', 'Som et køleskab'] },
        { keys: ['Ja!', 'Kl. 13.30', 'Lyserød kage', 'Køkkenet'], note: 'Det var prøvekagen. Det hjælper faktisk Bjarne.' }
      ],
      defense: [
        { keys: ['»Jeg ser fint«', 'Næsten …'], note: 'Bliver du presset: Indrøm, at brillerne lå i skabet.' },
        { keys: [['Brudens mor', 'Kl. 14.30', '»Tjekkede noget«'], ['Gommen', 'Sur', 'Marcipanroserne']] },
        { keys: ['Snorken', 'Garderoben', 'Som en motorbåd'] }
      ]
    }
  },
  twists: [
    { truth: 'notGuilty',
      reveal: { icon: 'cake', title: 'Kagen dukker op – i Svendborg!', text: 'Et bryllup i Svendborg har lagt billeder på nettet af præcis samme kage. Fem etager, marcipanroser. Fra i går aftes.' },
      moment: ['Kl. 14.46', 'Brudens mor', 'Blomstret gardin', '»Sig det ALDRIG til min datter«'],
      truthTitle: 'Det var brudens mor!',
      truthText: 'Birthe solgte i hemmelighed den ægte kage til et bryllup i Svendborg for at betale en overraskelsesrejse til brudeparret. I stedet byggede hun en papkage med flødeskum (kl. 02.43 – B for Birthe). Da den begyndte at hælde, svøbte hun sig i gardinet og fik en taxa til at køre den væk. Bjarne spiste bare prøvekagen.',
      epilogue: { guilty: 'Bjarne må lave 100 timers opvask. En uge senere sender brudens mor ham en undskyldning. Og en kage.', notGuilty: 'Bjarne frikendes og holder endelig sin tale. Den varer 47 minutter.' } },
    { truth: 'notGuilty',
      reveal: { icon: 'letter', title: 'Dyreinternatet siger tak!', text: 'Svendborg Dyreinternat skriver: »Tusind tak til den hemmelige giver af en kæmpe kage med marcipanroser! 30 hunde har aldrig været så glade.«' },
      moment: ['Kl. 14.46', 'Gommen', 'Kasse i et gardin', '»Marcipan er ondskab«'],
      truthTitle: 'Det var gommen!',
      truthText: 'Gommen, Bo, HADER marcipan. Han købte flødeskum om natten (B for Bo), svøbte sig i hotellets gardin og fik en taxa til at køre kagen til dyreinternatet. Bjarne spiste bare prøvekagen og faldt i søvn.',
      epilogue: { guilty: 'Bjarne må lave opvask. Gommen tager i al hemmelighed halvdelen af den.', notGuilty: 'Bjarne frikendes. Gommen tilstår og bliver æresmedlem af dyreinternatet.' } }
  ],
  judgeQuestions: ['Hvad var »missionen« i sms’en?', 'Hvem i sagen har et navn med B?', 'Hvem ejer det blomstrede gardin?']
},

/* ===================================================================== */
{
  id: 'hjelmen', icon: 'helmet',
  title: 'Den stjålne vikingehjelm',
  tagline: '1000 år gammel. Forsvundet på tre minutter.',
  accused: { name: 'Rasmus Ravn', short: 'Rasmus', about: 'frivillig »levende viking« på museet, 1,92 m høj' },
  intro: 'Torsdag aften åbnede byens museum udstillingen »Vikingernes Vilde Verden«. Stjernen var en vikingehjelm med to kæmpe horn. Kl. 20.15 gik lyset ud i præcis tre minutter. Da det kom tilbage, var montren tom. Kl. 20.40 blev den frivillige viking Rasmus Ravn fundet i parken – med en hjelm med horn på hovedet.',
  facts: [['bulb', '20.15', 'Lyset går ud i 3 min.'], ['helmet', 'Montren', 'Tom bagefter'], ['tree', '20.40', 'Rasmus i parken med hjelm']],
  timeline: [['19.50', 'Butikken sælger en plastikhjelm'], ['20.00', 'Rasmus kigger på hjelmen'], ['20.15', 'Lyset går ud'], ['20.16', 'Montren åbnes med nøglekort'], ['20.18', 'Hjelmen er væk'], ['20.40', 'Rasmus i parken med hjelm']],
  prosecution: {
    theories: [
      { title: 'Til vikingeslaget', keys: ['Vikingeslag kl. 20.30', 'Ville vinde', 'Ægte hjelm', 'Mørket'],
        starter: 'Ærede dommer, torsdag aften ville Rasmus …', closeKeys: ['Nøglekort', 'Sedlen', 'Hjelm på hovedet', 'Skyldig!'], closeStarter: 'Han blev fundet med …' },
      { title: 'Insider-jobbet', keys: ['Ikke knust', 'Nøglekort nr. 7', 'Vidste om mørket', '3 minutter'],
        starter: 'Montren blev ikke knust. Den blev åbnet af en, der …', closeKeys: ['Kun én passer', 'Kortet', 'Sedlen', 'Skyldig!'], closeStarter: 'Kun én person passer på det hele …' }
    ],
    evidence: [
      { icon: 'helmet', title: 'Hjelmen på hovedet', keys: ['Kl. 20.40', 'I parken', 'Horn'] },
      { icon: 'key', title: 'Nøglekortet', keys: ['Kl. 20.16', 'Frivillig nr. 7', '= Rasmus'] },
      { icon: 'note', title: 'Sedlen', keys: ['»Torsdag«', '»Når lyset går«', '»Tag den med«'] },
      { icon: 'speech', title: 'Vikingeråbet', keys: ['»TIL VALHAL!«', 'Nødudgangen', '3 gæster hørte det'] }
    ],
    topics: [
      { icon: 'ear', label: 'Det, hun hørte', keys: ['Da lyset gik?', 'Råb?', 'Løb nogen?'] },
      { icon: 'key', label: 'Nøglekortene', keys: ['Hvem har adgang?', 'Rasmus?'] },
      { icon: 'eye', label: 'Rasmus før tyveriet', keys: ['Kl. 20?', 'Kiggede han på hjelmen?'] }
    ]
  },
  defense: {
    theories: [
      { title: 'Plastikhjelmen', keys: ['149 kr.', 'Museumsbutikken', 'Alle havde hjelm', 'Ingen horn i virkeligheden'],
        starter: 'Ja, min klient havde en hjelm på. Men …', closeKeys: ['Plastik', 'Ingen så ham', 'Horn = myte', 'Ikke skyldig'], closeStarter: 'En plastikhjelm er ikke et bevis for …' },
      { title: 'Nogen bestilte mørket', keys: ['Arbejdssedlen', 'Direktøren', '1,60 m', 'Rasmus 1,92 m'],
        starter: 'Lyset gik ikke bare ud. Nogen …', closeKeys: ['Bestilt mørke', '30 cm for lav', 'Hvem havde et motiv?', 'Ikke skyldig'], closeStarter: 'Tyven var 30 centimeter lavere end …' }
    ],
    evidence: [
      { icon: 'receipt', title: 'Butikskvitteringen', keys: ['Kl. 19.50', 'Plastikhjelm', '149 kr.'] },
      { icon: 'bulb', title: 'Arbejdssedlen', keys: ['»Sluk lyset kl. 20.15«', '3 minutter', 'Ordre: Direktøren'] },
      { icon: 'video', title: 'Overvågningen', keys: ['Kl. 20.17', 'Ca. 1,60 m', 'Rasmus = 1,92 m'] },
      { icon: 'book', title: 'Historiebogen', keys: ['Vikinger: INGEN horn', 'Myte fra 1800-tallet'] }
    ],
    topics: [
      { icon: 'moon', label: 'Var hun vågen?', keys: ['Hvad lavede hun?', 'Da lyset gik?'] },
      { icon: 'ruler', label: 'Tyvens højde', keys: ['Hvor høj?', 'Passer det på Rasmus?'] },
      { icon: 'bag', label: 'En taske', keys: ['Gik nogen ud med noget?', 'Hvem?'] }
    ]
  },
  witness: {
    name: 'Grete Glas', about: 'museumsvagt i 25 år',
    keys: ['Lyset gik ud', '»TIL VALHAL!«', 'Løbende fødder', 'Nødudgangen'], starter: 'I 25 år har jeg passet på det museum, og …',
    secret: 'Du sov i din stol, da lyset gik ud. På din krydsord står svaret »SOVET«.',
    answers: {
      prosecution: [
        { keys: ['»TIL VALHAL!«', 'Løbende fødder', 'Mod nødudgangen'] },
        { keys: ['De frivillige', 'Direktøren', 'Rengøringen', 'Opslagstavlen …'], note: 'Hov: ALLE kunne tage et kort.' },
        { keys: ['Kl. 20', 'Stirrede længe', 'Drømmende blik'] }
      ],
      defense: [
        { keys: ['»Holdt øje«', 'Med lukkede øjne …', 'En teknik'], note: 'Bliver du presset: Indrøm, at du sov.' },
        { keys: [['Lille', 'Ca. 1,60', 'Golfhandsker'], ['Høj!', 'Ramte lysekronen']] },
        { keys: [['Direktøren', 'Golftaske', 'Den klirrede'], ['Nej', 'Men mudder ved montren næste dag']] }
      ]
    }
  },
  twists: [
    { truth: 'notGuilty',
      reveal: { icon: 'book', title: 'Eksperten kom en dag for tidligt!', text: 'Eksperten siger: »Ægte vikingehjelme havde ALDRIG horn. Den hjelm, der hang i montren, var et falsum. Hornene var limet på.«' },
      moment: ['Lyset kom tilbage', 'Direktøren', 'Golftaske', 'To horn stak op'],
      truthTitle: 'Det var museumsdirektøren!',
      truthText: 'Direktøren havde købt en falsk hjelm og limet horn på, fordi »turister vil have horn«. Da en ekspert skulle komme, bestilte han mørket, tog et nøglekort fra opslagstavlen og gemte hjelmen i sin golftaske. Rasmus’ hjelm var plastik fra butikken.',
      epilogue: { guilty: 'Rasmus må stoppe som viking. Dagen efter finder eksperten den falske hjelm i direktørens golftaske.', notGuilty: 'Rasmus frikendes og vinder vikingeslaget. Direktøren skal forklare, hvorfor museet har limet horn på historien.' } },
    { truth: 'guilty',
      reveal: { icon: 'helmet', title: 'Hjelmen er tilbage!', text: 'Morgenvagten fandt hjelmen i montren igen kl. 07.00. Med mudder fra parken på hornene og en tråd fra en hjemmestrikket vikingekappe.' },
      moment: ['Kl. 23 i går', 'Rasmus', 'Bagdøren', 'Noget under kappen'],
      truthTitle: 'Det var Rasmus – han »lånte« den!',
      truthText: 'Rasmus tog den ægte hjelm, da lyset gik ud (pølsevognen brugte for meget strøm). Han ville bare vinde vikingeslaget. Om natten listede han den tilbage – med mudder på. At låne fra et museum uden lov er stadig tyveri.',
      epilogue: { guilty: 'Rasmus skal holde gratis vikingeforedrag for skoleklasser hele sommeren.', notGuilty: 'Rasmus frikendes, men lover aldrig at »låne« en museumsgenstand igen.' } }
  ],
  judgeQuestions: ['Havde vikinger horn på hjelmene?', 'Hvem bestemte, at lyset skulle gå ud?', 'Hvad betyder »Tag den med«?']
},

/* ===================================================================== */
{
  id: 'hummeren', icon: 'claw',
  title: 'Den kidnappede maskot',
  tagline: 'Klubbens elskede hummer. Væk aftenen før finalen.',
  accused: { name: 'Søren Sild', short: 'Søren', about: 'manden i sildedragten – maskot for ærkerivalerne fra Svendborg' },
  intro: 'Fjordby FC skulle spille pokalfinale søndag. Men lørdag aften forsvandt klubbens elskede maskot, Hugo Hummer – en 2 meter høj, knaldrød hummerdragt. Skabet stod åbent, og det lugtede kraftigt af sild. Alle peger på Søren Sild, maskot for ærkerivalerne Svendborg Sild.',
  facts: [['claw', 'Hugo', '2 m rød hummer'], ['clock', 'Lørdag nat', 'Forsvundet'], ['smell', 'Sild', 'Lugten i skabet']],
  timeline: [['18.00', 'Søren afleverer en kage'], ['21.00', 'Hugo hænger i skabet'], ['23.00', '»En stor fisk« ved hegnet'], ['00.12', 'Vaskemaskine nr. 4 starter'], ['07.00', 'Skabet er tomt']],
  prosecution: {
    theories: [
      { title: 'Rivalens hævn', keys: ['Ærkefjender', '»Hummer på menuen«', 'Sildelugt', 'Klo i bilen'],
        starter: 'Ærede dommer, Svendborg og Fjordby har været fjender i 40 år, og …', closeKeys: ['Trussel', 'Lugt', 'Klo', 'Skyldig!'], closeStarter: 'Det var hævn, ærede dommer, fordi …' },
      { title: 'Spøgen gik for vidt', keys: ['Fan-tradition', 'Kage: »I TABER«', 'Kl. 18 på stadion', 'Kom tilbage om natten'],
        starter: 'Det startede måske som en spøg, men …', closeKeys: ['Spøg', '= forbrydelse', 'Finalen i fare', 'Skyldig!'], closeStarter: 'En spøg kan også være …' }
    ],
    evidence: [
      { icon: 'claw', title: 'Kløen i bilen', keys: ['Rød hummerklo', 'Sørens bagagerum'] },
      { icon: 'phone', title: 'Opslaget', keys: ['I går', '»Hummer på menuen!«'] },
      { icon: 'smell', title: 'Sildelugten', keys: ['Omklædningsrummet', 'Næste morgen'] },
      { icon: 'key', title: 'Den forsvundne nøgle', keys: ['Nøglen mangler', 'Søren var der kl. 18'] }
    ],
    topics: [
      { icon: 'eye', label: 'Kl. 23', keys: ['Hvad så han?', 'Hegnet?'] },
      { icon: 'smell', label: 'Lugten', keys: ['Hvordan lugtede der?'] },
      { icon: 'cake', label: 'Søren på stadion', keys: ['Før i dag?', 'Kagen?'] }
    ]
  },
  defense: {
    theories: [
      { title: 'Han var i Svendborg', keys: ['Sildefest', 'Til kl. 23.30', '40 billeder', 'Klo: 20 cm'],
        starter: 'Kl. 23 var min klient slet ikke i Fjordby. Han …', closeKeys: ['Anden by', 'Lille klo', 'Gætteri i mørke', 'Ikke skyldig'], closeStarter: 'Han var i en anden by, og …' },
      { title: 'Hugo blev vasket', keys: ['Kl. 00.12', '90 grader', 'Lones brev', '»Lugter af 12 år«'],
        starter: 'Hugo blev ikke kidnappet. Han blev …', closeKeys: ['Vaskeriet', 'Indefra klubben', 'Ikke min klient', 'Ikke skyldig'], closeStarter: 'Find hummeren i vaskeriet, ikke …' }
    ],
    evidence: [
      { icon: 'ticket', title: 'Togbilletten', keys: ['Svendborg', 'Til kl. 23.30', '40 billeder med sild'] },
      { icon: 'ruler', title: 'Den lille klo', keys: ['Kun 20 cm', 'Hugos klør: 60 cm'] },
      { icon: 'wash', title: 'Vaskeriet', keys: ['Kl. 00.12', 'Maskine 4', '90 grader'] },
      { icon: 'letter', title: 'Brevet i skabet', keys: ['»Jeg kan ikke mere«', '»Lugter af 12 år«', 'Hilsen Lone'] }
    ],
    topics: [
      { icon: 'tv', label: 'Før kl. 23', keys: ['Hvad lavede han?', 'Fjernsyn?'] },
      { icon: 'eye', label: '»Fisken«', keys: ['Farve?', 'Hår?', 'Størrelse?'] },
      { icon: 'map', label: 'Hvorhen?', keys: ['Hvor gik den hen?'] }
    ]
  },
  witness: {
    name: 'Bent Banemand', about: 'banemand på stadion i 35 år',
    keys: ['Kl. 23', 'Stor fisk', 'Over hegnet', 'Noget rødt'], starter: 'I 35 år har jeg passet det græs, og …',
    secret: 'Du havde lige set hajfilmen »Dødens Gab«. Du ser fisk og hajer ALLE steder for tiden.',
    answers: {
      prosecution: [
        { keys: ['Stor fisk', 'Over hegnet', 'Noget rødt'] },
        { keys: ['SILD', 'Gammel sild'] },
        { keys: ['Kl. 18', 'En kage', '»I TABER«'] }
      ],
      defense: [
        { keys: ['»Tjekkede græsset«', 'Fjernsynet tændt', 'Naturfilm …'], note: 'Bliver du presset: Det var hajfilmen »Dødens Gab«.' },
        { keys: [['Lange gule fletninger', 'Fisk har ikke fletninger …'], ['Sølvfarvet', 'Finner', 'Den grinede']] },
        { keys: [['Mod møntvaskeriet'], ['Mod havnen', 'Akvariet']] }
      ]
    }
  },
  twists: [
    { truth: 'notGuilty',
      reveal: { icon: 'wash', title: 'Fund i møntvaskeriet!', text: 'Vaskeriet har fundet noget i maskine nr. 4: en LYSERØD hummer på 1,2 meter. Den dufter af blomster.' },
      moment: ['Fletninger', 'Lone fra klubben', 'Rød pose', '»Undskyld, Hugo«'],
      truthTitle: 'Hugo blev vasket!',
      truthText: 'Lone, der har været inde i Hugo i 12 år, kunne ikke holde lugten ud. Hun tog dragten med i vaskeriet ved midnat. 90 grader. Nu er Hugo lyserød og 1,2 meter, og hun turde ikke sige det. Søren var kun på stadion kl. 18 med en drillekage.',
      epilogue: { guilty: 'Søren må gå i en lyserød hummerdragt til næste kamp. Lone tilstår senere.', notGuilty: 'Søren frikendes. Hugo spiller finalen som lyserød hummer. Fjordby vinder 3–0.' } },
    { truth: 'guilty',
      reveal: { icon: 'fish', title: 'Fund i akvariet!', text: 'Byens akvarium melder: »I morges stod der en meget stor, meget stille hummer i vores lobby. Om halsen et skilt: Hilsen fra havet.«' },
      moment: ['Kl. 23.50', 'Søren Sild', 'Ud af akvariet', 'Kæmpe smil'],
      truthTitle: 'Det var Søren – en fanspøg!',
      truthText: 'Søren tog Hugo som en gammel fan-tradition og gemte ham i akvariet med et skilt om halsen. Han tog et tidligere tog hjem fra sildefesten. Han ville aflevere Hugo før kampen, men akvariet var lukket. I vaskeriet kørte bare 30 røde håndklæder.',
      epilogue: { guilty: 'Søren skal være Hugo Hummers assistent en hel sæson.', notGuilty: 'Søren frikendes. Finalen udsættes en time, fordi en sæl har forelsket sig i Hugo.' } }
  ],
  judgeQuestions: ['Hvorfor lå der en hummerklo i bilen?', 'Hvem skrev brevet i skabet?', 'Kan en sild klatre over et hegn?']
}

];
