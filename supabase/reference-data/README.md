# Байршлын лавлах өгөгдөл

`aimags.csv` contains the 21 aimags. `soums.csv` contains 330 rural soums; Ulaanbaatar's nine districts are intentionally excluded. Both files use IDs and Mongolian names from [Open Admin Data Mongolia](https://github.com/open-admin-data/mongolia-administrative-divisions), licensed CC-BY-4.0. The source files are `data/all-aimag.json` and `data/all-soum.json`; this project maps `id`, `parent.id`, and `name.local` to the CSV columns.

Regenerate the seed after editing reference CSVs with `npm run locations:sql`. It writes `reference-data.seed.sql`. Apply migration `202610260001_profile_locations_and_flat_lessons.sql` first, then run the generated seed in Supabase SQL Editor.

`schools-template.csv` contains one clearly marked sample row, not a real school directory. Replace it only with verified school records. Keep `is_sample=true` for test entries. Ulaanbaatar records have empty aimag/soum fields; rural records require both IDs.
