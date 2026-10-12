// Dữ liệu phát âm (Bokmål, chuẩn Oslo/Østlandet).
export const ALPHA = [
 ["A","a","[ɑː]","“a” mở rộng, sâu trong họng.",[["far","bố"],["takk","cảm ơn"]]],
 ["B","be","[b]","Như “b” tiếng Việt.",[["bok","sách"],["by","thành phố"]]],
 ["C","se","[s]/[k]","Hiếm. Đọc “s” trước e, i, y; đọc “k” trong các trường hợp khác.",[["cirka","khoảng"],["camping","cắm trại"]]],
 ["D","de","[d]","Như “đ”. Thường câm sau l, n, r và ở cuối nhiều từ.",[["dag","ngày"],["god","tốt (d câm)"]]],
 ["E","e","[eː]/[ɛ]/[ə]","Dài: “ê”. Ngắn: “e”. Không nhấn ở cuối từ: “ơ” nhẹ.",[["se","nhìn"],["penn","bút"],["jente","cô gái"]]],
 ["F","eff","[f]","Như “ph”.",[["fisk","cá"],["fem","năm"]]],
 ["G","ge","[g]/[j]","“g” cứng. Trước i, y, ei, øy đọc như “d” miền Nam (âm j).",[["gate","đường phố"],["gi","cho"]]],
 ["H","hå","[h]","Như “h”. Câm trước v và j.",[["hus","ngôi nhà"],["hva","cái gì (h câm)"]]],
 ["I","i","[iː]/[ɪ]","Như “i”.",[["vin","rượu vang"],["fisk","cá"]]],
 ["J","je","[j]","Như “d” miền Nam hay “y” trong “yêu”.",[["ja","vâng"],["jobb","công việc"]]],
 ["K","kå","[k]/[ç]","“k” bật hơi như “kh” nhẹ. Trước i, y, ei, øy đọc thành âm xì mềm [ç].",[["kake","bánh ngọt"],["kino","rạp phim"]]],
 ["L","ell","[l]","Như “l”.",[["lys","ánh sáng"],["lang","dài"]]],
 ["M","emm","[m]","Như “m”.",[["mat","thức ăn"],["melk","sữa"]]],
 ["N","enn","[n]","Như “n”.",[["natt","đêm"],["navn","tên"]]],
 ["O","o","[uː]/[ɔ]","Thường đọc “u” khi dài; khi ngắn thường đọc “o”/“ô”.",[["sol","mặt trời"],["sopp","nấm"]]],
 ["P","pe","[p]","“p” bật hơi mạnh ở đầu từ.",[["pris","giá"],["papir","giấy"]]],
 ["Q","ku","[k]","Rất hiếm, chỉ trong từ mượn.",[["quiz","đố vui"]]],
 ["R","ærr","[ɾ]","“r” rung đầu lưỡi một nhịp. Đi với t, d, n, l, s thì đổi âm (xem phần tổ hợp).",[["rød","đỏ"],["tre","số ba / cây"]]],
 ["S","ess","[s]","Luôn là “x” trong tiếng Việt, không bao giờ đọc thành “z”.",[["sol","mặt trời"],["is","kem / băng"]]],
 ["T","te","[t]","“t” bật hơi như “th” ở đầu từ.",[["tog","tàu hỏa"],["tid","thời gian"]]],
 ["U","u","[ʉː]","Không có trong tiếng Việt: nói “ư” nhưng chu tròn môi.",[["hus","ngôi nhà"],["du","bạn"]]],
 ["V","ve","[ʋ]","Như “v” nhưng nhẹ hơn.",[["vann","nước"],["vei","con đường"]]],
 ["W","dobbelt-ve","[ʋ]","Hiếm, đọc như v.",[["wienerbrød","bánh ngọt Đan Mạch"]]],
 ["X","eks","[ks]","Hiếm, đọc “ks”.",[["taxi","taxi"]]],
 ["Y","y","[yː]","Nói “i” nhưng chu môi tròn thật mạnh.",[["by","thành phố"],["ny","mới"]]],
 ["Z","sett","[s]","Hiếm, đọc như “x”.",[["zoo","sở thú"]]],
 ["Æ","æ","[æː]","“e” mở miệng thật rộng.",[["lære","học"],["være","là, thì"]]],
 ["Ø","ø","[øː]/[œ]","Miệng đặt như “ê” nhưng môi tròn như “ô”.",[["brød","bánh mì"],["søster","chị em gái"]]],
 ["Å","å","[oː]/[ɔ]","Như “ô” (dài) hoặc “o” (ngắn).",[["på","trên"],["åtte","tám"]]]
];

export const SECTIONS = [
 {id:"alpha", title:"Bảng chữ cái (29 chữ)", lead:"Chạm vào chữ cái để nghe tên chữ, chạm vào ví dụ để nghe từ. Ba chữ cuối æ, ø, å là chữ riêng của tiếng Na Uy.", alpha:true},
 {id:"long", title:"Nguyên âm dài và ngắn", lead:"Quy tắc vàng: nguyên âm đứng trước một phụ âm đơn thì đọc dài, trước phụ âm kép (tt, kk, nn, ll…) thì đọc ngắn. Đọc sai độ dài có thể đổi nghĩa từ.", rows:[
  ["a","[ɑː] / [ɑ]","Dài kéo “aa”, ngắn dứt khoát “a”.",[["tak","mái nhà"],["takk","cảm ơn"],["hat","sự thù ghét"],["hatt","mũ"]]],
  ["e","[eː] / [ɛ]","Dài “ê”, ngắn “e”. Trước r thường đọc thành æ.",[["tre","ba / cây"],["penn","bút"],["her","ở đây"]]],
  ["e (cuối từ)","[ə]","Không nhấn, đọc “ơ” rất nhẹ, không bao giờ câm.",[["jente","cô gái"],["kake","bánh"],["snakke","nói"]]],
  ["i","[iː] / [ɪ]","Như “i”.",[["fin","đẹp"],["finne","tìm thấy"]]],
  ["o","[uː] / [ɔ]","Thường gặp nhất: o dài đọc “u”. o ngắn thường đọc “o”.",[["sol","mặt trời"],["bok","sách"],["sopp","nấm"],["komme","đến"]]],
  ["u","[ʉː] / [ʉ]","“ư” chu môi. Một số từ đọc “u” thật.",[["hus","ngôi nhà"],["hull","cái lỗ"],["ung","trẻ"]]],
  ["y","[yː] / [ʏ]","“i” chu môi.",[["syk","ốm"],["sykkel","xe đạp"]]],
  ["æ","[æː] / [æ]","“e” mở rộng.",[["vær","thời tiết"],["lære","học"]]],
  ["ø","[øː] / [œ]","“ê” tròn môi.",[["søt","ngọt"],["søtt","ngọt (giống trung)"],["øl","bia"]]],
  ["å","[oː] / [ɔ]","Dài “ô”, ngắn “o”.",[["år","năm"],["gå","đi"],["åtte","tám"]]]
 ]},
 {id:"diph", title:"Nguyên âm đôi", lead:"Hai nguyên âm lướt vào nhau thành một âm, giống “ây”, “ơi” tiếng Việt.", rows:[
  ["ei","[æɪ]","Gần “ây” với miệng mở rộng.",[["nei","không"],["hei","chào"],["vei","con đường"]]],
  ["øy","[œʏ]","Gần “ơi” nhưng môi tròn suốt cả âm.",[["øy","hòn đảo"],["høy","cao"]]],
  ["au","[æʉ]","Gần “eu”, kết thúc chu môi.",[["sau","con cừu"],["haug","ngọn đồi"]]],
  ["ai","[ɑɪ]","Như “ai”.",[["hai","cá mập"],["kai","bến tàu"]]]
 ]},
 {id:"cons", title:"Phụ âm và tổ hợp đặc biệt", lead:"Đây là phần quan trọng nhất: nhiều tổ hợp chữ được đọc thành một âm duy nhất.", rows:[
  ["kj · tj","[ç]","Âm xì mềm, như thì thầm chữ “hi” thật mạnh. Không phải “kh” khàn của tiếng Việt.",[["kjøre","lái xe"],["kjøkken","nhà bếp"],["tjue","hai mươi"]]],
  ["k + i, y, ei, øy","[ç]","Giống kj.",[["kino","rạp phim"],["kirke","nhà thờ"],["kyss","nụ hôn"]]],
  ["sj · skj","[ʂ]","Như “s” uốn lưỡi trong “sông” (giọng chuẩn/miền Nam).",[["sjø","biển"],["skje","cái thìa"],["sjokolade","sô-cô-la"]]],
  ["sk + i, y, ei, øy","[ʂ]","Giống sj.",[["ski","ván trượt tuyết"],["sky","đám mây"],["skinke","giăm bông"]]],
  ["rs","[ʂ]","r và s nhập lại thành “s” uốn lưỡi.",[["norsk","tiếng Na Uy"],["kurs","khóa học"],["person","người"]]],
  ["rt","[ʈ]","Lưỡi cong lên như “tr” tiếng Việt (giọng chuẩn).",[["kort","thẻ / ngắn"],["fort","nhanh"]]],
  ["rd","[ɖ] / [r]","Lưỡi cong; ở nhiều từ chữ d câm.",[["bord","cái bàn"],["ord","từ ngữ"]]],
  ["rn","[ɳ]","“n” với lưỡi cong lên.",[["barn","trẻ em"],["garn","sợi len"]]],
  ["rl","[ɭ]","“l” với lưỡi cong lên.",[["ærlig","thật thà"],["Karl","tên Karl"]]],
  ["gj","[j]","Như “d” miền Nam.",[["gjøre","làm"],["gjest","khách"],["gjerne","sẵn lòng"]]],
  ["g + i, y, ei, øy","[j]","Như gj.",[["gi","cho"],["gift","đã kết hôn"],["geit","con dê"]]],
  ["hv · hj","[ʋ] · [j]","Chữ h câm.",[["hva","cái gì"],["hvem","ai"],["hjem","nhà"],["hjelp","giúp đỡ"]]],
  ["ng","[ŋ]","Như “ng”, không đọc g ra.",[["ting","đồ vật"],["synge","hát"],["lang","dài"]]],
  ["nk","[ŋk]","“ng” rồi “k”.",[["tenke","nghĩ"],["bank","ngân hàng"]]],
  ["p · t · k đầu từ","[pʰ tʰ kʰ]","Bật hơi mạnh, như “th” tiếng Việt. Đặt tay trước miệng phải thấy hơi.",[["tid","thời gian"],["pris","giá"],["kaffe","cà phê"]]],
  ["ld · nd","[l] · [n]","Chữ d câm, phụ âm đọc dài.",[["kald","lạnh"],["land","đất nước"],["sand","cát"]]]
 ]},
 {id:"silent", title:"Chữ câm", lead:"Viết ra nhưng không đọc.", rows:[
  ["d","—","Câm sau l, n, r và ở cuối nhiều từ ngắn.",[["god","tốt"],["med","với"],["ved","bên cạnh"],["kald","lạnh"]]],
  ["g","—","Câm trong đuôi -ig, -lig và trong vài từ rất thông dụng.",[["viktig","quan trọng"],["hyggelig","dễ chịu"],["deilig","ngon"],["jeg","tôi"]]],
  ["h","—","Câm trước v và j.",[["hvor","ở đâu"],["hjerte","trái tim"]]],
  ["t","—","Câm trong det và trong đuôi -et của danh từ xác định giống trung.",[["det","cái đó"],["huset","ngôi nhà ấy"],["eplet","quả táo ấy"]]],
  ["v","—","Câm sau l trong vài từ.",[["selv","tự mình"],["halv","một nửa"],["tolv","mười hai"]]]
 ]},
 {id:"stress", title:"Trọng âm và thanh điệu", lead:"Tiếng Na Uy có thanh điệu, giống tiếng Việt, nên đây là lợi thế của anh.", rows:[
  ["Trọng âm","Âm tiết 1","Hầu hết từ gốc Na Uy nhấn vào âm tiết đầu.",[["Norge","Na Uy"],["jente","cô gái"],["snakke","nói"]]],
  ["Từ mượn","Âm tiết cuối","Từ mượn thường nhấn ở cuối.",[["universitet","đại học"],["restaurant","nhà hàng"],["informasjon","thông tin"]]],
  ["Thanh 1","đơn","Một nhịp lên giọng, gọn. Thường ở từ một âm tiết và nhiều từ có đuôi -er.",[["bønder","nông dân"],["bilen","chiếc xe"]]],
  ["Thanh 2","kép","Xuống rồi lên, gần giống kéo dài thanh hỏi. Thường ở từ hai âm tiết có đuôi -e.",[["bønner","hạt đậu"],["jente","cô gái"]]]
 ]},
 {id:"irreg", title:"Từ thông dụng đọc khác chữ viết", lead:"Gặp hằng ngày, nên học thuộc như một khối.", rows:[
  ["jeg · meg · deg · seg","“jai, mai, dai, sai”","g câm, e đọc thành “ai”.",[["jeg","tôi"],["meg","tôi (tân ngữ)"],["deg","bạn (tân ngữ)"]]],
  ["og","“o”","g câm.",[["og","và"]]],
  ["de","“đi”","Nghĩa là “họ”.",[["de","họ"]]],
  ["det · med","“đê · mê”","t và d câm.",[["det","cái đó"],["med","với"]]],
  ["er","“ær”","Động từ “là” thông dụng nhất.",[["er","là"]]],
  ["hvorfor","“vurfur”","h câm, o đọc u.",[["hvorfor","tại sao"]]],
  ["ikke","“icơ”","k kép, e cuối đọc “ơ”.",[["ikke","không"]]],
  ["sju · tjue","“shu · khue”","Âm sj và tj.",[["sju","bảy"],["tjue","hai mươi"]]],
  ["Norge · norsk","“norgơ · noshk”","rs thành s uốn lưỡi.",[["Norge","Na Uy"],["norsk","tiếng Na Uy"]]],
  ["synes","“xuy-nơs”","y chu môi.",[["synes","nghĩ rằng"]]]
 ]}
];

export const NAMES = {a:"a",b:"be",c:"se",d:"de",e:"e",f:"eff",g:"ge",h:"hå",i:"i",j:"je",k:"kå",l:"ell",m:"emm",n:"enn",o:"o",p:"pe",q:"ku",r:"ærr",s:"ess",t:"te",u:"u",v:"ve",w:"dobbelt-ve",x:"eks",y:"y",z:"sett","æ":"æ","ø":"ø","å":"å"};

export const SPECIAL = {
  jeg:"đọc “jai”, g câm", meg:"đọc “mai”", deg:"đọc “dai”", seg:"đọc “sai”", og:"đọc “o”, g câm",
  de:"đọc “đi” (nghĩa: họ)", det:"đọc “đê”, t câm", med:"đọc “mê”, d câm", ved:"đọc “vê”, d câm",
  er:"đọc “ær”", god:"đọc “gu”", hva:"đọc “va”", hvorfor:"đọc “vurfur”", ikke:"đọc “icơ”",
  sju:"đọc “shu”", tjue:"đọc “khue” (âm xì mềm)", norge:"đọc “norgơ”", selv:"đọc “sell”, v câm",
  halv:"đọc “hall”, v câm", tolv:"đọc “toll”, v câm", synes:"đọc gần “xuy-nơs”"
};
export const RULES = [
  [/hv|hj/, "hv · hj", "Chữ h câm."],
  [/kj|tj|^k(?=i|y|ei|øy)/, "kj · tj · ki · ky", "Đọc âm xì mềm [ç], như thì thầm chữ “hi”."],
  [/sj|skj|^sk(?=i|y|ei|øy)/, "sj · skj · ski", "Đọc “s” uốn lưỡi [ʂ]."],
  [/rs/, "rs", "r và s nhập lại thành “s” uốn lưỡi."],
  [/r[tdnl]/, "rt · rd · rn · rl", "Cong lưỡi lên như “tr” tiếng Việt; r không đọc riêng."],
  [/gj|^g(?=i|y|ei|øy)/, "gj · gi · gy", "g đọc như “d” miền Nam [j]."],
  [/(i|li)g$/, "-ig · -lig", "g cuối câm."],
  [/[lnr]d$/, "-ld · -nd · -rd", "d cuối câm."],
  [/ng/, "ng", "Đọc “ng”, không bật g ra."],
  [/ei/, "ei", "Nguyên âm đôi gần “ây”."],
  [/øy/, "øy", "Nguyên âm đôi gần “ơi” với môi tròn."],
  [/au/, "au", "Nguyên âm đôi gần “eu”."],
  [/([bdfgklmnprstv])\1/, "phụ âm kép", "Nguyên âm đứng trước đọc ngắn và dứt khoát."],
  [/u/, "u", "Nói “ư” nhưng chu tròn môi."],
  [/y/, "y", "Nói “i” nhưng chu tròn môi."],
  [/ø/, "ø", "Miệng như “ê”, môi tròn như “ô”."],
  [/æ/, "æ", "“e” mở miệng thật rộng."],
  [/å/, "å", "Đọc như “ô” hoặc “o”."],
  [/e$/, "-e cuối", "Đọc “ơ” nhẹ, không bỏ."],
  [/o/, "o", "o dài thường đọc “u” (bok, sol); o ngắn đọc “o”."]
];
