// Pronunciation data (Bokmål, standard Oslo/Eastern Norwegian), English explanations.
export const ALPHA = [
 ["A","a","[ɑː]","An open, deep 'ah', like the 'a' in 'father'.",[["far","father"],["takk","thanks"]]],
 ["B","be","[b]","Like English 'b'.",[["bok","book"],["by","city"]]],
 ["C","se","[s]/[k]","Rare. Said 's' before e, i, y; 'k' everywhere else.",[["cirka","about"],["camping","camping"]]],
 ["D","de","[d]","Like English 'd'. Often silent after l, n, r and at the end of many words.",[["dag","day"],["god","good (silent d)"]]],
 ["E","e","[eː]/[ɛ]/[ə]","Long: like 'ay' in 'say' (without the glide). Short: like 'e' in 'bed'. Unstressed at the end of a word: a light 'uh'.",[["se","see"],["penn","pen"],["jente","girl"]]],
 ["F","eff","[f]","Like English 'f'.",[["fisk","fish"],["fem","five"]]],
 ["G","ge","[g]/[j]","A hard 'g' as in 'go'. Before i, y, ei, øy it sounds like 'y' in 'yes'.",[["gate","street"],["gi","give"]]],
 ["H","hå","[h]","Like English 'h'. Silent before v and j.",[["hus","house"],["hva","what (silent h)"]]],
 ["I","i","[iː]/[ɪ]","Like 'ee' in 'see'.",[["vin","wine"],["fisk","fish"]]],
 ["J","je","[j]","Like 'y' in 'yes', never like English 'j'.",[["ja","yes"],["jobb","job"]]],
 ["K","kå","[k]/[ç]","Like English 'k'. Before i, y, ei, øy it becomes a soft hissing sound [ç], like the 'h' in 'huge'.",[["kake","cake"],["kino","cinema"]]],
 ["L","ell","[l]","Like English 'l'.",[["lys","light"],["lang","long"]]],
 ["M","emm","[m]","Like English 'm'.",[["mat","food"],["melk","milk"]]],
 ["N","enn","[n]","Like English 'n'.",[["natt","night"],["navn","name"]]],
 ["O","o","[uː]/[ɔ]","When long it usually sounds like 'oo' in 'moon'; when short, usually like 'o' in 'hot'.",[["sol","sun"],["sopp","mushroom"]]],
 ["P","pe","[p]","A strongly aspirated 'p' at the start of a word, as in 'pin'.",[["pris","price"],["papir","paper"]]],
 ["Q","ku","[k]","Very rare, only in loanwords.",[["quiz","quiz"]]],
 ["R","ærr","[ɾ]","A single tap of the tongue tip, like the 't' in American 'butter'. Combined with t, d, n, l, s it changes sound (see the combinations section).",[["rød","red"],["tre","three / tree"]]],
 ["S","ess","[s]","Always a sharp 's' as in 'sun', never a 'z' sound.",[["sol","sun"],["is","ice cream / ice"]]],
 ["T","te","[t]","An aspirated 't' at the start of a word, as in 'top'.",[["tog","train"],["tid","time"]]],
 ["U","u","[ʉː]","No English equivalent: say 'oo' with the tongue pushed forward and lips tightly rounded.",[["hus","house"],["du","you"]]],
 ["V","ve","[ʋ]","Like 'v' but softer, with less friction.",[["vann","water"],["vei","road"]]],
 ["W","dobbelt-ve","[ʋ]","Rare, said like v.",[["wienerbrød","Danish pastry"]]],
 ["X","eks","[ks]","Rare, said 'ks'.",[["taxi","taxi"]]],
 ["Y","y","[yː]","Say 'ee' while rounding and pushing your lips forward strongly.",[["by","city"],["ny","new"]]],
 ["Z","sett","[s]","Rare, said like 's'.",[["zoo","zoo"]]],
 ["Æ","æ","[æː]","An open sound, like the 'a' in 'bad', held longer.",[["lære","learn"],["være","be"]]],
 ["Ø","ø","[øː]/[œ]","Put your mouth in position for 'ay' as in 'say', then round your lips. Close to the 'u' in 'fur'.",[["brød","bread"],["søster","sister"]]],
 ["Å","å","[oː]/[ɔ]","Like 'aw' in 'saw' (long) or 'o' in 'hot' (short).",[["på","on"],["åtte","eight"]]]
];

export const SECTIONS = [
 {id:"alpha", title:"The alphabet (29 letters)", lead:"Tap a letter to hear its name, tap an example to hear the word. The last three letters, æ, ø and å, are special Norwegian letters.", alpha:true},
 {id:"long", title:"Long and short vowels", lead:"Golden rule: a vowel before a single consonant is long, a vowel before a double consonant (tt, kk, nn, ll...) is short. Getting the length wrong can change the meaning of a word.", rows:[
  ["a","[ɑː] / [ɑ]","Long: a drawn-out 'aah'. Short: a crisp 'a'.",[["tak","roof"],["takk","thanks"],["hat","hatred"],["hatt","hat"]]],
  ["e","[eː] / [ɛ]","Long like 'ay' in 'say', short like 'e' in 'bed'. Before r it often becomes æ.",[["tre","three / tree"],["penn","pen"],["her","here"]]],
  ["e (end of word)","[ə]","Unstressed, a very light 'uh' as in 'sofa'. It is never silent.",[["jente","girl"],["kake","cake"],["snakke","speak"]]],
  ["i","[iː] / [ɪ]","Like 'ee' in 'see'.",[["fin","nice"],["finne","find"]]],
  ["o","[uː] / [ɔ]","Most common: long o sounds like 'oo' in 'moon'. Short o is usually like 'o' in 'hot'.",[["sol","sun"],["bok","book"],["sopp","mushroom"],["komme","come"]]],
  ["u","[ʉː] / [ʉ]","'oo' with the tongue forward and lips rounded. Some words use a plain 'oo'.",[["hus","house"],["hull","hole"],["ung","young"]]],
  ["y","[yː] / [ʏ]","'ee' with rounded lips.",[["syk","sick"],["sykkel","bicycle"]]],
  ["æ","[æː] / [æ]","Open, like 'a' in 'bad'.",[["vær","weather"],["lære","learn"]]],
  ["ø","[øː] / [œ]","'ay' with rounded lips, close to the 'u' in 'fur'.",[["søt","sweet"],["søtt","sweet (neuter)"],["øl","beer"]]],
  ["å","[oː] / [ɔ]","Long like 'aw' in 'saw', short like 'o' in 'hot'.",[["år","year"],["gå","walk"],["åtte","eight"]]]
 ]},
 {id:"diph", title:"Diphthongs", lead:"Two vowels glide together into one sound, like 'eye' or 'boy' in English.", rows:[
  ["ei","[æɪ]","Close to 'ay' in 'day', but with the mouth more open at the start.",[["nei","no"],["hei","hi"],["vei","road"]]],
  ["øy","[œʏ]","Close to 'oy' in 'boy', but with rounded lips throughout.",[["øy","island"],["høy","high"]]],
  ["au","[æʉ]","Starts like 'a' in 'bad' and ends in a rounded 'oo'.",[["sau","sheep"],["haug","hill"]]],
  ["ai","[ɑɪ]","Like 'i' in 'kite'.",[["hai","shark"],["kai","quay"]]]
 ]},
 {id:"cons", title:"Consonants and special combinations", lead:"This is the most important part: many letter combinations are pronounced as one single sound.", rows:[
  ["kj · tj","[ç]","A soft hissing sound, like the 'h' in 'huge' said strongly. Not a 'k' and not 'ch'.",[["kjøre","drive"],["kjøkken","kitchen"],["tjue","twenty"]]],
  ["k + i, y, ei, øy","[ç]","Same as kj.",[["kino","cinema"],["kirke","church"],["kyss","kiss"]]],
  ["sj · skj","[ʂ]","Like 'sh' in 'shoe'.",[["sjø","sea"],["skje","spoon"],["sjokolade","chocolate"]]],
  ["sk + i, y, ei, øy","[ʂ]","Same as sj.",[["ski","ski"],["sky","cloud"],["skinke","ham"]]],
  ["rs","[ʂ]","r and s merge into a 'sh' sound.",[["norsk","Norwegian"],["kurs","course"],["person","person"]]],
  ["rt","[ʈ]","A 't' with the tongue tip curled back; the r is not said separately.",[["kort","card / short"],["fort","fast"]]],
  ["rd","[ɖ] / [r]","Tongue curled back; in many words the d is silent.",[["bord","table"],["ord","word"]]],
  ["rn","[ɳ]","An 'n' with the tongue curled back.",[["barn","child"],["garn","yarn"]]],
  ["rl","[ɭ]","An 'l' with the tongue curled back.",[["ærlig","honest"],["Karl","the name Karl"]]],
  ["gj","[j]","Like 'y' in 'yes'.",[["gjøre","do"],["gjest","guest"],["gjerne","gladly"]]],
  ["g + i, y, ei, øy","[j]","Same as gj.",[["gi","give"],["gift","married"],["geit","goat"]]],
  ["hv · hj","[ʋ] · [j]","The h is silent.",[["hva","what"],["hvem","who"],["hjem","home"],["hjelp","help"]]],
  ["ng","[ŋ]","Like 'ng' in 'singer', with no hard g.",[["ting","thing"],["synge","sing"],["lang","long"]]],
  ["nk","[ŋk]","Like 'nk' in 'think'.",[["tenke","think"],["bank","bank"]]],
  ["p · t · k at word start","[pʰ tʰ kʰ]","Strongly aspirated, as in English 'pin', 'top', 'kit'. Hold your hand in front of your mouth and you should feel a puff of air.",[["tid","time"],["pris","price"],["kaffe","coffee"]]],
  ["ld · nd","[l] · [n]","The d is silent and the consonant is held longer.",[["kald","cold"],["land","country"],["sand","sand"]]]
 ]},
 {id:"silent", title:"Silent letters", lead:"Written but not pronounced.", rows:[
  ["d","—","Silent after l, n, r and at the end of many short words.",[["god","good"],["med","with"],["ved","next to"],["kald","cold"]]],
  ["g","—","Silent in the endings -ig and -lig and in a few very common words.",[["viktig","important"],["hyggelig","pleasant"],["deilig","delicious"],["jeg","I"]]],
  ["h","—","Silent before v and j.",[["hvor","where"],["hjerte","heart"]]],
  ["t","—","Silent in det and in the -et ending of definite neuter nouns.",[["det","it / that"],["huset","the house"],["eplet","the apple"]]],
  ["v","—","Silent after l in a few words.",[["selv","self"],["halv","half"],["tolv","twelve"]]]
 ]},
 {id:"stress", title:"Stress and tones", lead:"Norwegian has two word tones (pitch patterns). English has nothing like this, so listen closely and copy the melody of each word.", rows:[
  ["Stress","1st syllable","Most native Norwegian words are stressed on the first syllable.",[["Norge","Norway"],["jente","girl"],["snakke","speak"]]],
  ["Loanwords","Last syllable","Loanwords are often stressed at the end.",[["universitet","university"],["restaurant","restaurant"],["informasjon","information"]]],
  ["Tone 1","single","One simple pitch movement, short and neat. Common in one-syllable words and many words ending in -er.",[["bønder","farmers"],["bilen","the car"]]],
  ["Tone 2","double","The pitch falls, then rises again, giving a sing-song melody. Common in two-syllable words ending in -e.",[["bønner","beans"],["jente","girl"]]]
 ]},
 {id:"irreg", title:"Common words not said as written", lead:"You meet these every day, so learn each one as a whole.", rows:[
  ["jeg · meg · deg · seg","'yai, my, die, sigh'","Silent g, and the e sounds like 'ai'.",[["jeg","I"],["meg","me"],["deg","you (object)"]]],
  ["og","'aw'","Silent g.",[["og","and"]]],
  ["de","'dee'","Means 'they'.",[["de","they"]]],
  ["det · med","'deh · meh'","Silent t and d.",[["det","it / that"],["med","with"]]],
  ["er","'ar'","The most common verb, 'is/are'.",[["er","is / are"]]],
  ["hvorfor","'voor-foor'","Silent h, the o sounds like 'oo'.",[["hvorfor","why"]]],
  ["ikke","'ICK-uh'","Double k, the final e is a light 'uh'.",[["ikke","not"]]],
  ["sju · tjue","'shoo · HYOO-uh'","The sj and tj sounds.",[["sju","seven"],["tjue","twenty"]]],
  ["Norge · norsk","'NOR-guh · noshk'","rs becomes 'sh'.",[["Norge","Norway"],["norsk","Norwegian"]]],
  ["synes","'SEE-ness'","y with rounded lips.",[["synes","think (opinion)"]]]
 ]}
];

export const NAMES = {a:"a",b:"be",c:"se",d:"de",e:"e",f:"eff",g:"ge",h:"hå",i:"i",j:"je",k:"kå",l:"ell",m:"emm",n:"enn",o:"o",p:"pe",q:"ku",r:"ærr",s:"ess",t:"te",u:"u",v:"ve",w:"dobbelt-ve",x:"eks",y:"y",z:"sett","æ":"æ","ø":"ø","å":"å"};

export const SPECIAL = {
  jeg:"said 'yai', silent g", meg:"said 'my'", deg:"said 'die'", seg:"said 'sigh'", og:"said 'aw', silent g",
  de:"said 'dee' (means: they)", det:"said 'deh', silent t", med:"said 'meh', silent d", ved:"said 'veh', silent d",
  er:"said 'ar'", god:"said 'goo'", hva:"said 'vah'", hvorfor:"said 'voor-foor'", ikke:"said 'ICK-uh'",
  sju:"said 'shoo'", tjue:"said 'HYOO-uh' (soft hissing sound)", norge:"said 'NOR-guh'", selv:"said 'sell', silent v",
  halv:"said 'hal', silent v", tolv:"said 'tawl', silent v", synes:"said roughly 'SEE-ness'"
};
export const RULES = [
  [/hv|hj/, "hv · hj", "The h is silent."],
  [/kj|tj|^k(?=i|y|ei|øy)/, "kj · tj · ki · ky", "A soft hissing sound [ç], like the 'h' in 'huge'."],
  [/sj|skj|^sk(?=i|y|ei|øy)/, "sj · skj · ski", "Said like 'sh' [ʂ]."],
  [/rs/, "rs", "r and s merge into a 'sh' sound."],
  [/r[tdnl]/, "rt · rd · rn · rl", "Curl your tongue tip back; the r is not said separately."],
  [/gj|^g(?=i|y|ei|øy)/, "gj · gi · gy", "g sounds like 'y' in 'yes' [j]."],
  [/(i|li)g$/, "-ig · -lig", "The final g is silent."],
  [/[lnr]d$/, "-ld · -nd · -rd", "The final d is silent."],
  [/ng/, "ng", "Like 'ng' in 'singer', with no hard g."],
  [/ei/, "ei", "A diphthong close to 'ay' in 'day'."],
  [/øy/, "øy", "A diphthong close to 'oy' in 'boy', with rounded lips."],
  [/au/, "au", "A diphthong from 'a' in 'bad' to a rounded 'oo'."],
  [/([bdfgklmnprstv])\1/, "double consonant", "The vowel before it is short and crisp."],
  [/u/, "u", "Say 'oo' with the tongue forward and lips tightly rounded."],
  [/y/, "y", "Say 'ee' while rounding your lips."],
  [/ø/, "ø", "Mouth set for 'ay', lips rounded, close to the 'u' in 'fur'."],
  [/æ/, "æ", "An open sound, like the 'a' in 'bad'."],
  [/å/, "å", "Like 'aw' in 'saw' or 'o' in 'hot'."],
  [/e$/, "final -e", "A light 'uh'; don't drop it."],
  [/o/, "o", "Long o usually sounds like 'oo' (bok, sol); short o like 'o' in 'hot'."]
];
