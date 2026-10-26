# Байршлын лавлах өгөгдөл

`aimags.csv` contains the 21 aimags. `soums.csv` contains 330 rural soums; Ulaanbaatar's nine districts are intentionally excluded. Both files use IDs and Mongolian names from [Open Admin Data Mongolia](https://github.com/open-admin-data/mongolia-administrative-divisions), licensed CC-BY-4.0. The source files are `data/all-aimag.json` and `data/all-soum.json`; this project maps `id`, `parent.id`, and `name.local` to the CSV columns.

Regenerate the seed after editing reference CSVs with `npm run locations:sql`. It writes `reference-data.seed.sql`. Apply migrations `202610260001_profile_locations_and_flat_lessons.sql` and `202610260003_ub_districts.sql` in order, then run the generated seed in Supabase SQL Editor.

`ub-districts.csv` contains Ulaanbaatar's nine districts. `esis-schools.json` is the official ESIS open-data download [published here](https://developer.esis.edu.mn/opendata/index.html) as “Ерөнхий боловсролын сургуулийн жагсаалт” (Excel/JSON). Run `npm run locations:import-esis` to normalize it into `schools.csv`, then `npm run locations:sql` to generate the SQL seed.

The download contains 873 institutions. The importer matches 868 records to a known Ulaanbaatar district or aimag and skips five whose parent is only listed as “Бусад”. The chooser's free-text “Бусад” option remains available for those. ESIS identifies rural schools at aimag level, not soum level; after a user chooses a soum, the chooser displays the verified school list for that aimag and labels this behavior. The schema permits aimag-wide directory entries while the student's own profile still requires a soum.

Apply migrations `202610260001_profile_locations_and_flat_lessons.sql`, `202610260002_remove_experiment_tier.sql`, `202610260003_ub_districts.sql`, and `202610260004_official_school_directory.sql` in timestamp order, then apply the generated `reference-data.seed.sql` in Supabase SQL Editor. The importer stores ESIS institution IDs for merge-safe updates. Add further verified schools to `schools.csv` using the same columns and a unique `esis_id` or update the source JSON and rerun the importer.
