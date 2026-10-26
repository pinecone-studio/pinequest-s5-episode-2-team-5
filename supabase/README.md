# OpenLab туршилтуудыг JSON хэлбэрээр хадгалах

Одоогийн цэсний 14 туршилт, түүний дотор «Зааны шүдний оо», JSON болсон.
Нэр, тайлбар, бодис/багажны жагсаалт, аюулгүй ажиллагаа, алхам, тайлбар томьёог
`public.experiments.content` (`jsonb`) баганад хадгална. Урвалын тооцоо болон 3D
дүрслэлийн код аппдаа үлдэнэ.

## Нэг удаа Supabase дээр үүсгэх

1. Одоо ашиглаж буй Supabase төслөө нээгээд **SQL Editor → New query** сонго.
2. Энэ хавтасны **`experiments.sql` файлыг бүтнээр нь** хуулж query хэсэгт оруул.
3. **Run** дар. Үр дүнд 14 мөрийн нэр, id харагдана.
4. **Table Editor → experiments** рүү ороод `elephant` мөрийн `content`-ийг хар.

Энэ SQL хүснэгт, унших эрхийн policy болон анхны JSON өгөгдлийг хамтад нь үүсгэнэ.
Дахин Run хийхэд байгаа мөрүүдийг дарж бичихгүй. `schema.sql` нь хэрэглэгчийн profiles
хүснэгтийн хуучин script; туршилтуудад зориулж `experiments.sql`-ийг ажиллуулна.

## «Зааны шүдний оо»-ны агуулгыг засах

- `experiments` хүснэгтийн `id = elephant` мөрийг сонго.
- `content` JSON-ийг зас. Бүтэн жишээ: `elephant-toothpaste.example.json`.
- `is_published = true` байвал апп дээр харагдана. False бол draft байна.
- `sort_order` жагсаалтын дарааллыг тохируулна.
- Save хийгээд **ChemQuest-ийн хуудсыг бүхэлд нь refresh** хий. JSON агуулгыг
  өөрчилсний дараа дахин deploy хийх шаардлагагүй.

`id` болон алхмын `id` нь явцыг таних тогтвортой түлхүүрүүд тул агуулга засахдаа
өөрчлөхгүй байх нь зөв. Шинэ туршилт нэмэх бол шинэ, давхцахгүй id ашиглана.
`schema_version` нь одоогоор 1 байна. 3D багаж эсвэл шинэ төрлийн урвал нэмэхэд
аппын кодод мөн хэрэгжүүлэх шаардлагатай.

## Алхам биелэх дүрэм

JSON дотор JavaScript функц хадгалахгүй. Аппын гаргадаг event-ийг заана:

```json
{
  "id": "cat",
  "text": "KI нэмж хөөс оргилуул",
  "hint": "KI-ийн уусмалаас хэдэн мл асга.",
  "completion": { "events": ["foam"] }
}
```

Хэмжилтийн босго:

```json
{ "events": ["measure:temp"], "value": { "gte": 90 } }
```

Олон event-ийн аль нэгээр биелэх бол `events` жагсаалтад нэмж болно.
Эхлэлээр нь тааруулах жишээ: `{ "prefixes": ["flame:Ca", "flame:Cu"] }`.
Харьцуулалт: `gt`, `gte`, `lt`, `lte`.

## Аппын холболт

ChemQuest одоо байгаа `src/lib/supabase.ts` client-аараа нийтлэгдсэн мөрүүдийг уншина.
URL болон publishable/anon key нь одоогийн `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY` тохиргоог ашиглана. Vercel дээр мөн эдгээр environment
variable тохирсон байх хэрэгтэй. Одоо байгаа сайтдаа шинэ кодоо нэг удаа deploy хийнэ.

Parent хуудас same-origin iframe рүү зөвхөн туршилтын JSON-ийг дамжуулна.
Session token болон админ key дамжуулахгүй. Дараах тохиолдолд bundled JSON ашиглана:
сүлжээ тасарсан, хүснэгт үүсээгүй, timeout болсон, эсвэл серверийн JSON буруу бүтэцтэй.
Харин сервер хоосон published жагсаалт амжилттай буцаавал цэсний туршилтууд хоосон болно.

OpenLab-ийг `npm run dev`-ээр дангаар нь нээхэд bundled JSON ажиллана. Supabase агуулгыг
шалгахдаа ChemQuest доторх OpenLab хуудсыг нээнэ. Development build-ийн console дээр
`window.__lab.catalog.getState().source` нь `supabase` эсвэл `bundled` гэж харуулна.

Энэ өөрчлөлт туршилтын **агуулгын каталог** хадгална. Хэрэглэгчийн хийсэн алхмууд
одоогоор browser-ийн localStorage-д, бодисын амьд төлөв санах ойд хэвээр байна.

## 8-р ангийн химийн хабыг Supabase-д хадгалах

`migrations/202610250001_grade8_hub.sql` нь `hub` схем, 8–12-р ангийн content table,
оюутны явцын RLS-тэй хүснэгтүүдийг үүсгэнэ. Агуулгын seed-ийг canonical JSON-оос гаргахын
тулд repo-ийн root хавтаснаас `npm run grade8:sql` ажиллуулна. Энэ нь одоо байгаа 8, 9-р
ангийн pack-уудыг хамтад нь багтаасан `grade8-hub.sql` файлыг шинэчилнэ.

Supabase Dashboard → SQL Editor дээр `grade8-hub.sql`-ийг бүтнээр нь ажиллуул. Шалгалтын
query `mn-g8-chemistry` (11 сэдэв), `g9-chem` (17 сэдэв) хоёр мөр харуулна. `hub` schema
Data API-д ил гарахгүй; апп зөвхөн нийтлэгдсэн pack буцаадаг `public.get_revision_content_pack`
RPC-г ашиглана. Клиентэд service-role/secret key бүү ашигла.

Revision hub-ийн одоогийн явц AsyncStorage-д хадгалагддаг хэвээр; үүссэн progress хүснэгтүүдэд
cloud sync холбогдоогүй байгаа.

## Хөгжүүлэгчийн командууд

Node.js 22.6+ ашиглана. JSON-ийг код талаас шинэчилсний дараа repo-ийн root дээр:

```bash
npm run experiments:sql
npm run grade8:sql
npm run test:experiments
cd openlab-3d
npm run build:chemquest
```

Генераторын үндсэн өгөгдөл: `openlab-3d/src/data/experiments.json`.
Migration: `migrations/202610220001_experiments.sql`.
Импортын SQL нь байгаа dashboard засварыг дарж бичихгүй; тэдгээрийг SQL/Table Editor-оор
зориуд шинэчилнэ. Хэрэглэгчийн client зөвхөн published туршилтыг унших эрхтэй.

## Шалгасан зүйлс

- Root lint/typecheck, OpenLab strict build, Expo web export амжилттай.
- JSON дүрмийн 6 автомат test амжилттай; хуучин 46 callback-тай 27,830 тохиолдлоор ижил үр дүн гарсан.
- Түр PostgreSQL орчинд 14 seed, RLS унших эрх, client write хориг, draft нуух,
  давтан импорт dashboard засвар хадгалах, буруу JSON татгалзахыг шалгасан.
- Export хийсэн ChemQuest → iframe урсгалд mock Supabase JSON гарч ирэх,
  offline/503 болон буруу JSON fallback ажиллахыг browser дээр шалгасан.
- Cloud хүснэгтийг шууд үүсгээгүй; SQL Editor-ийн нэг удаагийн алхам шаардлагатай.
