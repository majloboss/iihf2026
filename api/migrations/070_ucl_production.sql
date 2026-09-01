-- Migration 070: UEFA Champions League 2026/27 — nasadenie do produkcie
--
-- Jediny skript namiesto migracii 044-069. Tie vznikali postupne a cast
-- z nich sa neskor menila (064 prerobila vazbu z club_code na club_id,
-- 065 zrusila UNIQUE), takze ich opakovanie na produkcii by prechadzalo
-- aj slepymi ulickami. Tento subor zapisuje rovno vysledny stav.
--
-- Vygenerovane skriptom tools/gen_prod_migration.cjs zo schemy vyvojovej DB.
-- Datum: 2026-09-01
--
-- SPUSTAT AKO VLASTNIK SCHEM (dbdevbet-admin), nie ako aplikacny pouzivatel:
-- skript zaklada schemu a tabulky a nastavuje prava.
--
-- Prenasa sa struktura vsetkych tabuliek a obsah ciselnikov (staty, kluby,
-- rozpis zapasov z PDF, bodovanie). Tipy, vysledky a zaznamy livescore sa
-- neprenasaju — tie na produkcii vzniknu az hranim.

BEGIN;

CREATE SCHEMA IF NOT EXISTS "lm2026-27";

-- ── admin.countries ────────────────────────────────
CREATE TABLE IF NOT EXISTS "admin"."countries" (
    "source_id" INTEGER,
    "country_code" VARCHAR(6) NOT NULL,
    "country_code2" VARCHAR(6),
    "sport_code_fifa" VARCHAR(6),
    "sport_code_iihf" VARCHAR(6),
    "sport_code_uefa" VARCHAR(6),
    "name_sk" VARCHAR(100) NOT NULL,
    "name_sk_long" VARCHAR(150),
    "name_en" VARCHAR(100) NOT NULL,
    "name_original" VARCHAR(100),
    "flag_file" VARCHAR(255),
    "flag_file_big" VARCHAR(255),
    "flag_check" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'countries'
                      AND con.conname = 'countries_pkey') THEN
        ALTER TABLE "admin"."countries" ADD CONSTRAINT "countries_pkey" PRIMARY KEY (country_code);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'countries'
                      AND con.conname = 'countries_code2_format') THEN
        ALTER TABLE "admin"."countries" ADD CONSTRAINT "countries_code2_format" CHECK (((country_code2 IS NULL) OR ((country_code2)::text ~ '^[A-Z]{2,3}(-[A-Z]{2,3})?$'::text)));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'countries'
                      AND con.conname = 'countries_code_format') THEN
        ALTER TABLE "admin"."countries" ADD CONSTRAINT "countries_code_format" CHECK (((country_code)::text ~ '^[A-Z]{2,3}(-[A-Z]{2,3})?$'::text));
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS countries_code2_uniq ON admin.countries USING btree (country_code2) WHERE (country_code2 IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS countries_source_id_uniq ON admin.countries USING btree (source_id) WHERE (source_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS countries_sport_codes_idx ON admin.countries USING btree (sport_code_fifa, sport_code_iihf, sport_code_uefa);
CREATE UNIQUE INDEX IF NOT EXISTS countries_sport_fifa_uniq ON admin.countries USING btree (sport_code_fifa) WHERE (sport_code_fifa IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS countries_sport_iihf_uniq ON admin.countries USING btree (sport_code_iihf) WHERE (sport_code_iihf IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS countries_sport_uefa_uniq ON admin.countries USING btree (sport_code_uefa) WHERE (sport_code_uefa IS NOT NULL);

-- 254 riadkov
INSERT INTO "admin"."countries" ("source_id", "country_code", "country_code2", "sport_code_fifa", "sport_code_iihf", "sport_code_uefa", "name_sk", "name_sk_long", "name_en", "name_original", "flag_file", "flag_file_big", "flag_check", "is_active", "created_at", "updated_at") VALUES
    (2, 'ALA', 'AX', NULL, NULL, NULL, 'Alandy', 'Alandské ostrovy', 'Alandy', NULL, 'flag_ax_24.png', 'flag_ax_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (5, 'ASM', 'AS', NULL, NULL, NULL, 'Americká Samoa', 'Americká Samoa', 'Americká Samoa', NULL, 'flag_as_24.png', 'flag_as_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (3, 'ALB', 'AL', NULL, NULL, 'ALB', 'Albánsko', 'Albánska republika', 'Albania', NULL, 'flag_al_24.png', 'flag_al_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (6, 'VIR', 'VI', NULL, NULL, NULL, 'Americké Panenské ostrovy', 'Americké Panenské ostrovy', 'Americké Panenské ostrovy', NULL, 'flag_vi_24.png', 'flag_vi_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (9, 'AGO', 'AO', NULL, NULL, NULL, 'Angola', 'Angolská republika', 'Angola', NULL, 'flag_ao_24.png', 'flag_ao_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (10, 'AIA', 'AI', NULL, NULL, NULL, 'Anguilla', 'Anguilla', 'Anguilla', NULL, 'flag_ai_24.png', 'flag_ai_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (11, 'ATA', 'AQ', NULL, NULL, NULL, 'Antarktída', 'Antarktída', 'Antarktída', NULL, 'flag_aq_24.png', 'flag_aq_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (12, 'ATG', 'AG', NULL, NULL, NULL, 'Antigua a Barbuda', 'Antigua a Barbuda', 'Antigua a Barbuda', NULL, 'flag_ag_24.png', 'flag_ag_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (15, 'ABW', 'AW', NULL, NULL, NULL, 'Aruba', 'Aruba', 'Aruba', NULL, 'flag_aw_24.png', 'flag_aw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (18, 'BHS', 'BS', NULL, NULL, NULL, 'Bahamy', 'Bahamské spoločenstvo', 'Bahamy', NULL, 'flag_bs_24.png', 'flag_bs_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (19, 'BHR', 'BH', NULL, NULL, NULL, 'Bahrajn', 'Bahrajnské kráľovstvo', 'Bahrajn', NULL, 'flag_bh_24.png', 'flag_bh_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (20, 'BGD', 'BD', NULL, NULL, NULL, 'Bangladéš', 'Bangladéšska ľudová republika', 'Bangladesh', NULL, 'flag_bd_24.png', 'flag_bd_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (21, 'BRB', 'BB', NULL, NULL, NULL, 'Barbados', 'Barbados', 'Barbados', NULL, 'flag_bb_24.png', 'flag_bb_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (23, 'BLZ', 'BZ', NULL, NULL, NULL, 'Belize', 'Belize', 'Belize', NULL, 'flag_bz_24.png', 'flag_bz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (24, 'BEN', 'BJ', NULL, NULL, NULL, 'Benin', 'Beninská republika', 'Benin', NULL, 'flag_bj_24.png', 'flag_bj_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (25, 'BMU', 'BM', NULL, NULL, NULL, 'Bermudy', 'Bermudy', 'Bermudy', NULL, 'flag_bm_24.png', 'flag_bm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (26, 'BTN', 'BT', NULL, NULL, NULL, 'Bhután', 'Bhutánske krâľovstvo', 'Bhután', NULL, 'flag_bt_24.png', 'flag_bt_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (28, 'BOL', 'BO', NULL, NULL, NULL, 'Bolívia', 'Bolívijská republika', 'Bolivia', NULL, 'flag_bo_24.png', 'flag_bo_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (29, 'BES', 'BQ', NULL, NULL, NULL, 'Bonaire, Sint Eustatius a Saba', 'Bonaire, Sint Eustatius a Saba', 'Bonaire, Sint Eustatius a Saba', NULL, 'flag_bq_24.png', 'flag_bq_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (31, 'BWA', 'BW', NULL, NULL, NULL, 'Botswana', 'Botswanská republika', 'Botswana', NULL, 'flag_bw_24.png', 'flag_bw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (32, 'BVT', 'BV', NULL, NULL, NULL, 'Bouvetov ostrov', 'Bouvetov ostrov', 'Bouvetov ostrov', NULL, 'flag_bv_24.png', 'flag_bv_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (34, 'IOT', 'IO', NULL, NULL, NULL, 'Britské indickooceánske územie', 'Britské indickooceánske územie', 'Britské indickooceánske územie', NULL, 'flag_io_24.png', 'flag_io_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (35, 'BRN', 'BN', NULL, NULL, NULL, 'Brunej', 'Brunejský sultanât', 'Brunej', NULL, 'flag_bn_24.png', 'flag_bn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (37, 'BFA', 'BF', NULL, NULL, NULL, 'Burkina Faso', 'Burkina Faso', 'Burkina Faso', NULL, 'flag_bf_24.png', 'flag_bf_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (38, 'BDI', 'BI', NULL, NULL, NULL, 'Burundi', 'Burundská republika', 'Burundi', NULL, 'flag_bi_24.png', 'flag_bi_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (39, 'COK', 'CK', NULL, NULL, NULL, 'Cookove ostrovy', 'Cookove ostrovy', 'Cookove ostrovy', NULL, 'flag_ck_24.png', 'flag_ck_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (42, 'TCD', 'TD', NULL, NULL, NULL, 'Čad', 'Čadská republika', 'Čad', NULL, 'flag_td_24.png', 'flag_td_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (45, 'CHL', 'CL', NULL, NULL, NULL, 'Čile', 'Čílska republika', 'Chile', NULL, 'flag_cl_24.png', 'flag_cl_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (46, 'CHN', 'CN', NULL, NULL, NULL, 'Čína', 'Čínska ľudová republika', 'China', NULL, 'flag_cn_24.png', 'flag_cn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (48, 'DMA', 'DM', NULL, NULL, NULL, 'Dominika', 'Dominické spoločenstvo', 'Dominika', NULL, 'flag_dm_24.png', 'flag_dm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (49, 'DOM', 'DO', NULL, NULL, NULL, 'Dominikánska republika', 'Dominikánska republika', 'Dominikánska republika', NULL, 'flag_do_24.png', 'flag_do_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (50, 'DJI', 'DJ', NULL, NULL, NULL, 'Džibutsko', 'ǅibutská republika', 'Džibutsko', NULL, 'flag_dj_24.png', 'flag_dj_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (53, 'ERI', 'ER', NULL, NULL, NULL, 'Eritrea', 'Eritrejský štát', 'Eritrea', NULL, 'flag_er_24.png', 'flag_er_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (55, 'ETH', 'ET', NULL, NULL, NULL, 'Etiópia', 'Etiópska federatívna demokratická republika', 'Ethiopia', NULL, 'flag_et_24.png', 'flag_et_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (57, 'FLK', 'FK', NULL, NULL, NULL, 'Falklandy', 'Falklandské ostrovy', 'Falklandy', NULL, 'flag_fk_24.png', 'flag_fk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (58, 'FJI', 'FJ', NULL, NULL, NULL, 'Fidži', 'Fiǆijská republika', 'Fiji', NULL, 'flag_fj_24.png', 'flag_fj_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (59, 'PHL', 'PH', NULL, NULL, NULL, 'Filipíny', 'Filipínska republika', 'Philippines', NULL, 'flag_ph_24.png', 'flag_ph_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (61, 'PYF', 'PF', NULL, NULL, NULL, 'Francúzska Polynézia', 'Francúzska Polynézia', 'Francúzska Polynézia', NULL, 'flag_pf_24.png', 'flag_pf_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (62, 'ATF', 'TF', NULL, NULL, NULL, 'Francúzske južné a antarktické územia', 'Francúzske južné a antarktické územia', 'Francúzske južné a antarktické územia', NULL, 'flag_tf_24.png', 'flag_tf_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (64, 'GAB', 'GA', NULL, NULL, NULL, 'Gabon', 'Gabonská republika', 'Gabon', NULL, 'flag_ga_24.png', 'flag_ga_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (65, 'GMB', 'GM', NULL, NULL, NULL, 'Gambia', 'Gambijská republika', 'Gambia', NULL, 'flag_gm_24.png', 'flag_gm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (69, 'GRD', 'GD', NULL, NULL, NULL, 'Grenada', 'Grenada', 'Grenada', NULL, 'flag_gd_24.png', 'flag_gd_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (70, 'GRL', 'GL', NULL, NULL, NULL, 'Grónsko', 'Grónsko', 'Grónsko', NULL, 'flag_gl_24.png', 'flag_gl_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (72, 'GLP', 'GP', NULL, NULL, NULL, 'Guadeloupe', 'Guadeloupe', 'Guadeloupe', NULL, 'flag_gp_24.png', 'flag_gp_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (73, 'GUM', 'GU', NULL, NULL, NULL, 'Guam', 'Guam', 'Guam', NULL, 'flag_gu_24.png', 'flag_gu_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (74, 'GTM', 'GT', NULL, NULL, NULL, 'Guatemala', 'Guatemalská republika', 'Guatemala', NULL, 'flag_gt_24.png', 'flag_gt_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (75, 'GGY', 'GG', NULL, NULL, NULL, 'Guernsey', 'Guernsey', 'Guernsey', NULL, 'flag_gg_24.png', 'flag_gg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (76, 'GIN', 'GN', NULL, NULL, NULL, 'Guinea', 'Guinejská republika', 'Guinea', NULL, 'flag_gn_24.png', 'flag_gn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (77, 'GNB', 'GW', NULL, NULL, NULL, 'Guinea-Bissau', 'Guinejsko-bissauská republika', 'Guinea-Bissau', NULL, 'flag_gw_24.png', 'flag_gw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (78, 'GUF', 'GF', NULL, NULL, NULL, 'Francúzska Guyana', 'Francúzska Guyana', 'Francúzska Guyana', NULL, 'flag_gf_24.png', 'flag_gf_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (79, 'GUY', 'GY', NULL, NULL, NULL, 'Guyana', 'Guyanská kooperatívna republika', 'Guyana', NULL, 'flag_gy_24.png', 'flag_gy_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (81, 'HMD', 'HM', NULL, NULL, NULL, 'Heardov ostrov', 'Teritórium Heardovho ostrova a Macdonaldových ostrovov', 'Heardov ostrov', NULL, 'flag_hm_24.png', 'flag_hm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (83, 'HND', 'HN', NULL, NULL, NULL, 'Honduras', 'Honduraská republika', 'Honduras', NULL, 'flag_hn_24.png', 'flag_hn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (84, 'HKG', 'HK', NULL, NULL, NULL, 'Hongkong', 'Špeciálna administratívna oblasťČínskej ľudovej republiky Hongkong', 'Hongkong', NULL, 'flag_hk_24.png', 'flag_hk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (86, 'IND', 'IN', NULL, NULL, NULL, 'India', 'Indická republika', 'India', NULL, 'flag_in_24.png', 'flag_in_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (87, 'IDN', 'ID', NULL, NULL, NULL, 'Indonézia', 'Indonézska republika', 'Indonesia', NULL, 'flag_id_24.png', 'flag_id_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (93, 'JAM', 'JM', NULL, NULL, NULL, 'Jamajka', 'Jamajka', 'Jamaica', NULL, 'flag_jm_24.png', 'flag_jm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (95, 'YEM', 'YE', NULL, NULL, NULL, 'Jemen', 'Jemenská republika', 'Yemen', NULL, 'flag_ye_24.png', 'flag_ye_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (96, 'JEY', 'JE', NULL, NULL, NULL, 'Jersey', 'Bailiwick Jersey', 'Jersey', NULL, 'flag_je_24.png', 'flag_je_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (99, 'SGS', 'GS', NULL, NULL, NULL, 'Južná Georgia a Južné Sandwichove ostrovy', 'Južná Georgia a Južné Sandwichove ostrovy', 'Južná Georgia a Južné Sandwichove ostrovy', NULL, 'flag_gs_24.png', 'flag_gs_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (101, 'SSD', 'SS', NULL, NULL, NULL, 'Južný Sudán', 'Juhosudánska republika', 'Južný Sudán', NULL, 'flag_ss_24.png', 'flag_ss_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (102, 'CYM', 'KY', NULL, NULL, NULL, 'Kajmanie ostrovy', 'Kajmanie ostrovy', 'Kajmanie ostrovy', NULL, 'flag_ky_24.png', 'flag_ky_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (103, 'KHM', 'KH', NULL, NULL, NULL, 'Kambodža', 'Kamboǆské kráľovstvo', 'Cambodia', NULL, 'flag_kh_24.png', 'flag_kh_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (104, 'CMR', 'CM', NULL, NULL, NULL, 'Kamerun', 'Kamerunská republika', 'Kamerun', NULL, 'flag_cm_24.png', 'flag_cm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (109, 'KEN', 'KE', NULL, NULL, NULL, 'Keňa', 'Kenská republika', 'Kenya', NULL, 'flag_ke_24.png', 'flag_ke_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (110, 'KGZ', 'KG', NULL, NULL, NULL, 'Kirgizsko', 'Kirgizská republika', 'Kirgizsko', NULL, 'flag_kg_24.png', 'flag_kg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (111, 'KIR', 'KI', NULL, NULL, NULL, 'Kiribati', 'Kiribatská republika', 'Kiribati', NULL, 'flag_ki_24.png', 'flag_ki_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (112, 'CCK', 'CC', NULL, NULL, NULL, 'Kokosové ostrovy', 'Kokosové ostrovy', 'Kokosové ostrovy', NULL, 'flag_cc_24.png', 'flag_cc_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (114, 'COM', 'KM', NULL, NULL, NULL, 'Komory', 'Komorská únia', 'Komory', NULL, 'flag_km_24.png', 'flag_km_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (170, 'PSE', 'PS', NULL, NULL, NULL, 'Palestína', 'Palestínsky štát', 'Palestinian Territories', NULL, 'flag_ps_24.png', 'flag_ps_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (116, 'COG', 'CG', NULL, NULL, NULL, 'Kongo', 'Konžská republika', 'Kongo', NULL, 'flag_cg_24.png', 'flag_cg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (117, 'PRK', 'KP', NULL, NULL, NULL, 'Kórejská ľudovodemokratická republika', 'Kórejská ľudovodemokratická republika', 'North Korea', NULL, 'flag_kp_24.png', 'flag_kp_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (119, 'CRI', 'CR', NULL, NULL, NULL, 'Kostarika', 'Kostarická republika', 'Kostarika', NULL, 'flag_cr_24.png', 'flag_cr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (120, 'CUB', 'CU', NULL, NULL, NULL, 'Kuba', 'Kubánska republika', 'Cuba', NULL, 'flag_cu_24.png', 'flag_cu_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (121, 'KWT', 'KW', NULL, NULL, NULL, 'Kuvajt', 'Kuvajtský štát', 'Kuwait', NULL, 'flag_kw_24.png', 'flag_kw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (122, 'LAO', 'LA', NULL, NULL, NULL, 'Laos', 'Laoská ľudovodemokratická republika', 'Laos', NULL, 'flag_la_24.png', 'flag_la_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (123, 'LSO', 'LS', NULL, NULL, NULL, 'Lesotho', 'Lesothské kráľovstvo', 'Lesotho', NULL, 'flag_ls_24.png', 'flag_ls_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (124, 'LBN', 'LB', NULL, NULL, NULL, 'Libanon', 'Libanonská republika', 'Lebanon', NULL, 'flag_lb_24.png', 'flag_lb_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (125, 'LBR', 'LR', NULL, NULL, NULL, 'Libéria', 'Libérijská republika', 'Libéria', NULL, 'flag_lr_24.png', 'flag_lr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (126, 'LBY', 'LY', NULL, NULL, NULL, 'Líbya', 'Líbya', 'Libya', NULL, 'flag_ly_24.png', 'flag_ly_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (127, 'LIE', 'LI', NULL, NULL, NULL, 'Lichtenštajnsko', 'Lichtenštajnské kniežatstvo', 'Lichtenštajnsko', NULL, 'flag_li_24.png', 'flag_li_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (131, 'MAC', 'MO', NULL, NULL, NULL, 'Macao', 'Macao, Špeciàlna administratívna oblasŦ', 'Macao', NULL, 'flag_mo_24.png', 'flag_mo_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (132, 'MDG', 'MG', NULL, NULL, NULL, 'Madagaskar', 'Madagaskarská republika', 'Madagascar', NULL, 'flag_mg_24.png', 'flag_mg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (134, 'MYS', 'MY', NULL, NULL, NULL, 'Malajzia', 'Malajzia', 'Malaysia', NULL, 'flag_my_24.png', 'flag_my_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (135, 'MWI', 'MW', NULL, NULL, NULL, 'Malawi', 'Malawijská republika', 'Malawi', NULL, 'flag_mw_24.png', 'flag_mw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (136, 'MDV', 'MV', NULL, NULL, NULL, 'Maldivy', 'Maldivská republika', 'Maldivy', NULL, 'flag_mv_24.png', 'flag_mv_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (137, 'MLI', 'ML', NULL, NULL, NULL, 'Mali', 'Malijská republika', 'Mali', NULL, 'flag_ml_24.png', 'flag_ml_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (139, 'IMN', 'IM', NULL, NULL, NULL, 'Man', 'Ostrov Man', 'Man', NULL, 'flag_im_24.png', 'flag_im_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (141, 'MHL', 'MH', NULL, NULL, NULL, 'Marshallove ostrovy', 'Republika Marshallových ostrovov', 'Marshallove ostrovy', NULL, 'flag_mh_24.png', 'flag_mh_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (142, 'MTQ', 'MQ', NULL, NULL, NULL, 'Martinik', 'Martinique', 'Martinik', NULL, 'flag_mq_24.png', 'flag_mq_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (143, 'MUS', 'MU', NULL, NULL, NULL, 'Maurícius', 'Maurícijská republika', 'Maurícius', NULL, 'flag_mu_24.png', 'flag_mu_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (144, 'MRT', 'MR', NULL, NULL, NULL, 'Mauritánia', 'Mauritánska islamská republika', 'Mauritánia', NULL, 'flag_mr_24.png', 'flag_mr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (145, 'MYT', 'YT', NULL, NULL, NULL, 'Mayotte', 'Department Mayotte', 'Mayotte', NULL, 'flag_yt_24.png', 'flag_yt_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (146, 'UMI', 'UM', NULL, NULL, NULL, 'Menšie odľahlé ostrovy USA', 'Menšie odľahlé ostrovy Spjoených štátov', 'Menšie odľahlé ostrovy USA', NULL, 'flag_um_24.png', 'flag_um_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (148, 'FSM', 'FM', NULL, NULL, NULL, 'Mikronézia', 'Mikronézske federatívne štáty', 'Mikronézia', NULL, 'flag_fm_24.png', 'flag_fm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (149, 'MMR', 'MM', NULL, NULL, NULL, 'Mjanmarsko', 'Mjanmarská zväzová republika', 'Myanmar', NULL, 'flag_mm_24.png', 'flag_mm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (151, 'MCO', 'MC', NULL, NULL, NULL, 'Monako', 'Monacké kniežatstvo', 'Monako', NULL, 'flag_mc_24.png', 'flag_mc_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (152, 'MNG', 'MN', NULL, NULL, NULL, 'Mongolsko', 'Mongolsko', 'Mongolia', NULL, 'flag_mn_24.png', 'flag_mn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (153, 'MSR', 'MS', NULL, NULL, NULL, 'Montserrat', 'Montserrat', 'Montserrat', NULL, 'flag_ms_24.png', 'flag_ms_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (154, 'MOZ', 'MZ', NULL, NULL, NULL, 'Mozambik', 'Mozambická republika', 'Mozambique', NULL, 'flag_mz_24.png', 'flag_mz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17') ON CONFLICT ON CONSTRAINT "countries_pkey" DO NOTHING;
INSERT INTO "admin"."countries" ("source_id", "country_code", "country_code2", "sport_code_fifa", "sport_code_iihf", "sport_code_uefa", "name_sk", "name_sk_long", "name_en", "name_original", "flag_file", "flag_file_big", "flag_check", "is_active", "created_at", "updated_at") VALUES
    (155, 'NAM', 'NA', NULL, NULL, NULL, 'Namíbia', 'Namíbijská republika', 'Namibia', NULL, 'flag_na_24.png', 'flag_na_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (156, 'NRU', 'NR', NULL, NULL, NULL, 'Nauru', 'Naurská republika', 'Nauru', NULL, 'flag_nr_24.png', 'flag_nr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (158, 'NPL', 'NP', NULL, NULL, NULL, 'Nepál', 'Nepálska federatívna demokratická republika', 'Nepal', NULL, 'flag_np_24.png', 'flag_np_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (159, 'NER', 'NE', NULL, NULL, NULL, 'Niger', 'Nigérská republika', 'Niger', NULL, 'flag_ne_24.png', 'flag_ne_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (160, 'NGA', 'NG', NULL, NULL, NULL, 'Nigéria', 'Nigérijská federatívna republika', 'Nigeria', NULL, 'flag_ng_24.png', 'flag_ng_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (161, 'NIC', 'NI', NULL, NULL, NULL, 'Nikaragua', 'Nikaragujská republika', 'Nikaragua', NULL, 'flag_ni_24.png', 'flag_ni_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (162, 'NIU', 'NU', NULL, NULL, NULL, 'Niue', 'Niue', 'Niue', NULL, 'flag_nu_24.png', 'flag_nu_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (163, 'NFK', 'NF', NULL, NULL, NULL, 'Norfolk', 'Teritórium ostrova Norfolk', 'Norfolk', NULL, 'flag_nf_24.png', 'flag_nf_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (165, 'NCL', 'NC', NULL, NULL, NULL, 'Nová Kaledónia', 'Nová Kaledónia', 'Nová Kaledónia', NULL, 'flag_nc_24.png', 'flag_nc_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (167, 'OMN', 'OM', NULL, NULL, NULL, 'Omán', 'Ománsky sultanát', 'Omán', NULL, 'flag_om_24.png', 'flag_om_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (168, 'PAK', 'PK', NULL, NULL, NULL, 'Pakistan', 'Pakistanská islamská republika', 'Pakistan', NULL, 'flag_pk_24.png', 'flag_pk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (169, 'PLW', 'PW', NULL, NULL, NULL, 'Palau', 'Palauská republika', 'Palau', NULL, 'flag_pw_24.png', 'flag_pw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (172, 'VGB', 'VG', NULL, NULL, NULL, 'Britské Panenské ostrovy', 'Panenské ostrovy', 'Britské Panenské ostrovy', NULL, 'flag_vg_24.png', 'flag_vg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (173, 'PNG', 'PG', NULL, NULL, NULL, 'Papua-Nová Guinea', 'Nezávislý štát Papua-Nová Guinea', 'Papua-Nová Guinea', NULL, 'flag_pg_24.png', 'flag_pg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (175, 'PER', 'PE', NULL, NULL, NULL, 'Peru', 'Peruánska republika', 'Peru', NULL, 'flag_pe_24.png', 'flag_pe_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (176, 'PCN', 'PN', NULL, NULL, NULL, 'Pitcairnove ostrovy', 'Pitcairnove ostrovy', 'Pitcairnove ostrovy', NULL, 'flag_pn_24.png', 'flag_pn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (179, 'PRI', 'PR', NULL, NULL, NULL, 'Portoriko', 'Portorické spoločenstvo', 'Portoriko', NULL, 'flag_pr_24.png', 'flag_pr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (182, 'REU', 'RE', NULL, NULL, NULL, 'Réunion', 'Réunionský zámorský departmán', 'Réunion', NULL, 'flag_re_24.png', 'flag_re_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (183, 'GNQ', 'GQ', NULL, NULL, NULL, 'Rovníková Guinea', 'Republika rovníkovej Guiney', 'Rovníková Guinea', NULL, 'flag_gq_24.png', 'flag_gq_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (185, 'RUS', 'RU', NULL, NULL, NULL, 'Rusko', 'Ruská federácia', 'Russia', NULL, 'flag_ru_24.png', 'flag_ru_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (186, 'RWA', 'RW', NULL, NULL, NULL, 'Rwanda', 'Rwandská republika', 'Rwanda', NULL, 'flag_rw_24.png', 'flag_rw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (187, 'SPM', 'PM', NULL, NULL, NULL, 'Saint Pierre a Miquelon', 'Ostrovy Saint Pierre a Miquelon', 'Saint Pierre a Miquelon', NULL, 'flag_pm_24.png', 'flag_pm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (188, 'MAF', 'MF', NULL, NULL, NULL, 'Saint-Martin', 'Saint-Martin', 'Saint-Martin', NULL, 'flag_mf_24.png', 'flag_mf_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (189, 'SLB', 'SB', NULL, NULL, NULL, 'Šalamúnove ostrovy', 'Salomonove ostrovy', 'Šalamúnove ostrovy', NULL, 'flag_sb_24.png', 'flag_sb_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (190, 'SLV', 'SV', NULL, NULL, NULL, 'Salvádor', 'Salvádorská republika', 'Salvádor', NULL, 'flag_sv_24.png', 'flag_sv_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (191, 'WSM', 'WS', NULL, NULL, NULL, 'Samoa', 'Nezávislý štátSamoa', 'Samoa', NULL, 'flag_ws_24.png', 'flag_ws_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (197, 'MNP', 'MP', NULL, NULL, NULL, 'Severné Mariány', 'Spoločenstvo ostrovov Severné Mariány', 'Severné Mariány', NULL, 'flag_mp_24.png', 'flag_mp_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (198, 'SYC', 'SC', NULL, NULL, NULL, 'Seychely', 'Seychelská republika', 'Seychely', NULL, 'flag_sc_24.png', 'flag_sc_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (199, 'SLE', 'SL', NULL, NULL, NULL, 'Sierra Leone', 'Sierraleonská republika', 'Sierra Leone', NULL, 'flag_sl_24.png', 'flag_sl_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (200, 'SGP', 'SG', NULL, NULL, NULL, 'Singapur', 'Singapurská republika', 'Singapore', NULL, 'flag_sg_24.png', 'flag_sg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (201, 'SXM', 'SX', NULL, NULL, NULL, 'Sint Maarten', 'Sint Maarten', 'Sint Maarten', NULL, 'flag_sx_24.png', 'flag_sx_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (204, 'SOM', 'SO', NULL, NULL, NULL, 'Somálsko', 'Somálska federatívna republika', 'Somalia', NULL, 'flag_so_24.png', 'flag_so_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (205, 'ARE', 'AE', NULL, NULL, NULL, 'Spojené arabské emiráty', 'Spojené arabské emiráty', 'Spojené arabské emiráty', NULL, 'flag_ae_24.png', 'flag_ae_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (208, 'LKA', 'LK', NULL, NULL, NULL, 'Srí Lanka', 'Srílanská demokratická socialistická republika', 'Sri Lanka', NULL, 'flag_lk_24.png', 'flag_lk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (209, 'CAF', 'CF', NULL, NULL, NULL, 'Stredoafrická republika', 'Stredoafrická republika', 'Stredoafrická republika', NULL, 'flag_cf_24.png', 'flag_cf_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (210, 'SDN', 'SD', NULL, NULL, NULL, 'Sudán', 'Sudánska republika', 'Sudan', NULL, 'flag_sd_24.png', 'flag_sd_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (211, 'SUR', 'SR', NULL, NULL, NULL, 'Surinam', 'Surinamská republika', 'Surinam', NULL, 'flag_sr_24.png', 'flag_sr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (212, 'SJM', 'SJ', NULL, NULL, NULL, 'Svalbard a Jan Mayen', 'Svalbard a Jan Mayen', 'Svalbard a Jan Mayen', NULL, 'flag_sj_24.png', 'flag_sj_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (213, 'SWZ', 'SZ', NULL, NULL, NULL, 'Svazijsko', 'Svazijské kráľovstvo', 'Svazijsko', NULL, 'flag_sz_24.png', 'flag_sz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (214, 'SHN', 'SH', NULL, NULL, NULL, 'Svätá Helena', 'Svätá Helena (zámorské územie)', 'Svätá Helena', NULL, 'flag_sh_24.png', 'flag_sh_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (215, 'LCA', 'LC', NULL, NULL, NULL, 'Svätá Lucia', 'Svätá Lucia', 'Svätá Lucia', NULL, 'flag_lc_24.png', 'flag_lc_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (216, 'BLM', 'BL', NULL, NULL, NULL, 'Svätý Bartolomej', 'Svätý Bartolomej', 'Svätý Bartolomej', NULL, 'flag_bl_24.png', 'flag_bl_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (217, 'KNA', 'KN', NULL, NULL, NULL, 'Svätý Krištof a Nevis', 'Feder໡cia Svätého Krištofa a Nevisu', 'Svätý Krištof a Nevis', NULL, 'flag_kn_24.png', 'flag_kn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (218, 'STP', 'ST', NULL, NULL, NULL, 'Svätý Tomáš a Princov ostrov', 'Demokratická republika Svätého Tomáša A princovho ostrova', 'Svätý Tomáš a Princov ostrov', NULL, 'flag_st_24.png', 'flag_st_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (219, 'VCT', 'VC', NULL, NULL, NULL, 'Svätý Vincent a Grenadíny', 'Svätý Vincent a Grenadíny', 'Svätý Vincent a Grenadíny', NULL, 'flag_vc_24.png', 'flag_vc_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (220, 'SYR', 'SY', NULL, NULL, NULL, 'Sýria', 'Sýrska arabská republika', 'Syria', NULL, 'flag_sy_24.png', 'flag_sy_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (225, 'TJK', 'TJ', NULL, NULL, NULL, 'Tadžikistan', 'Taǆická republika', 'Tadžikistan', NULL, 'flag_tj_24.png', 'flag_tj_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (226, 'TWN', 'TW', NULL, NULL, NULL, 'Taiwan', 'Čínska republika', 'Taiwan', NULL, 'flag_tw_24.png', 'flag_tw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (228, 'TZA', 'TZ', NULL, NULL, NULL, 'Tanzánia', 'Tanzánijská zjednotená republika', 'Tanzania', NULL, 'flag_tz_24.png', 'flag_tz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (229, 'THA', 'TH', NULL, NULL, NULL, 'Thajsko', 'Thajské kráľovstvo', 'Thailand', NULL, 'flag_th_24.png', 'flag_th_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (230, 'TGO', 'TG', NULL, NULL, NULL, 'Togo', 'Togská republika', 'Togo', NULL, 'flag_tg_24.png', 'flag_tg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (231, 'TKL', 'TK', NULL, NULL, NULL, 'Tokelau', 'Tokelauské ostrovy', 'Tokelau', NULL, 'flag_tk_24.png', 'flag_tk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (232, 'TON', 'TO', NULL, NULL, NULL, 'Tonga', 'Tongské kráľovstvo', 'Tonga', NULL, 'flag_to_24.png', 'flag_to_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (233, 'TTO', 'TT', NULL, NULL, NULL, 'Trinidad a Tobago', 'Republika Trinidad a Tobaga', 'Trinidad a Tobago', NULL, 'flag_tt_24.png', 'flag_tt_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (236, 'TKM', 'TM', NULL, NULL, NULL, 'Turkménsko', 'Turkménsko', 'Turkménsko', NULL, 'flag_tm_24.png', 'flag_tm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (237, 'TCA', 'TC', NULL, NULL, NULL, 'Turks a Caicos', 'Ostrovy Turks a Caicos', 'Turks a Caicos', NULL, 'flag_tc_24.png', 'flag_tc_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (238, 'TUV', 'TV', NULL, NULL, NULL, 'Tuvalu', 'Tuvalu', 'Tuvalu', NULL, 'flag_tv_24.png', 'flag_tv_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (239, 'UGA', 'UG', NULL, NULL, NULL, 'Uganda', 'Ugandská republika', 'Uganda', NULL, 'flag_ug_24.png', 'flag_ug_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (243, 'VUT', 'VU', NULL, NULL, NULL, 'Vanuatu', 'Vanuatská republika', 'Vanuatu', NULL, 'flag_vu_24.png', 'flag_vu_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (244, 'VAT', 'VA', NULL, NULL, NULL, 'Vatikán', 'Svätá stolica (Vatikánsky mestský štát', 'Vatikán', NULL, 'flag_va_24.png', 'flag_va_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (246, 'VEN', 'VE', NULL, NULL, NULL, 'Venezuela', 'Venezuelská bolívarovská republika', 'Venezuela', NULL, 'flag_ve_24.png', 'flag_ve_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (247, 'CXR', 'CX', NULL, NULL, NULL, 'Vianočný ostrov', 'Teritórium Vianočného ostrova', 'Vianočný ostrov', NULL, 'flag_cx_24.png', 'flag_cx_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (248, 'VNM', 'VN', NULL, NULL, NULL, 'Vietnam', 'Vietnamská socialistická republika', 'Vietnam', NULL, 'flag_vn_24.png', 'flag_vn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (249, 'TLS', 'TL', NULL, NULL, NULL, 'Východný Timor', 'Východotimorská demokratická republika', 'Východný Timor', NULL, 'flag_tl_24.png', 'flag_tl_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (251, 'WLF', 'WF', NULL, NULL, NULL, 'Wallis a Futuna', 'Teritórium ostrovov Wallis a Futuna', 'Wallis a Futuna', NULL, 'flag_wf_24.png', 'flag_wf_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (252, 'ZMB', 'ZM', NULL, NULL, NULL, 'Zambia', 'Zambijská republika', 'Zambia', NULL, 'flag_zm_24.png', 'flag_zm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (253, 'ESH', 'EH', NULL, NULL, NULL, 'Západná Sahara', 'Západná Sahara', 'Západná Sahara', NULL, 'flag_eh_24.png', 'flag_eh_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (254, 'ZWE', 'ZW', NULL, NULL, NULL, 'Zimbabwe', 'Zimbabwianska republika', 'Zimbabwe', NULL, 'flag_zw_24.png', 'flag_zw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (4, 'DZA', 'DZ', 'ALG', NULL, NULL, 'Alžírsko', 'Alžírska demokratická ľudová republika', 'Algeria', NULL, 'flag_dz_24.png', 'flag_dz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (7, 'AND', 'AD', NULL, NULL, 'AND', 'Andorra', 'Andorrské kniežatstvo', 'Andorra', NULL, 'flag_ad_24.png', 'flag_ad_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (8, 'GB-ENG', 'GB-ENG', 'ENG', NULL, 'ENG', 'Anglicko', 'Anglicko', 'England', NULL, 'flag_gb-eng_24.png', 'flag_gb-eng_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (13, 'ARG', 'AR', 'ARG', NULL, NULL, 'Argentína', 'Argentínska republika', 'Argentina', NULL, 'flag_ar_24.png', 'flag_ar_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (14, 'ARM', 'AM', NULL, NULL, 'ARM', 'Arménsko', 'Arménska republika', 'Arménsko', NULL, 'flag_am_24.png', 'flag_am_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (16, 'AUS', 'AU', 'AUS', NULL, NULL, 'Austrália', 'Austrálsky zväz', 'Australia', NULL, 'flag_au_24.png', 'flag_au_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (17, 'AZE', 'AZ', NULL, NULL, 'AZE', 'Azerbajdžan', 'Azerbajǆanská republika', 'Azerbajdžan', NULL, 'flag_az_24.png', 'flag_az_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (22, 'BEL', 'BE', 'BEL', NULL, 'BEL', 'Belgicko', 'Belgické kráľovstvo', 'Belgium', NULL, 'flag_be_24.png', 'flag_be_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (27, 'BLR', 'BY', NULL, NULL, 'BLR', 'Bielorusko', 'Bieloruská republika', 'Belarus', NULL, 'flag_by_24.png', 'flag_by_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (30, 'BIH', 'BA', 'BIH', NULL, 'BIH', 'Bosna a Hercegovina', 'Republika Bosny a Hercegoviny', 'Bosna a Hercegovina', NULL, 'flag_ba_24.png', 'flag_ba_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (33, 'BRA', 'BR', 'BRA', NULL, NULL, 'Brazília', 'Brazílska federatívna republika', 'Brazil', NULL, 'flag_br_24.png', 'flag_br_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (36, 'BGR', 'BG', NULL, NULL, 'BUL', 'Bulharsko', 'Bulharská republika', 'Bulgaria', NULL, 'flag_bg_24.png', 'flag_bg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (40, 'CUW', 'CW', 'CUW', NULL, NULL, 'Curacao', 'Curacao', 'Curacao', NULL, 'flag_cw_24.png', 'flag_cw_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (41, 'CYP', 'CY', NULL, NULL, 'CYP', 'Cyprus', 'Cyperská republika', 'Cyprus', NULL, 'flag_cy_24.png', 'flag_cy_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (43, 'CZE', 'CZ', 'CZE', 'CZE', 'CZE', 'Česko', 'Česká republika', 'Czech Republic', NULL, 'flag_cz_24.png', 'flag_cz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (44, 'MNE', 'ME', NULL, NULL, 'MNE', 'Čierna Hora', 'Čierna Hora', 'Čierna Hora', NULL, 'flag_me_24.png', 'flag_me_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (47, 'DNK', 'DK', NULL, 'DEN', 'DEN', 'Dánsko', 'Dánske kráľovstvo', 'Denmark', NULL, 'flag_dk_24.png', 'flag_dk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (51, 'EGY', 'EG', 'EGY', NULL, NULL, 'Egypt', 'Egyptská arabská republika', 'Egypt', NULL, 'flag_eg_24.png', 'flag_eg_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (52, 'ECU', 'EC', 'ECU', NULL, NULL, 'Ekvádor', 'Ekvádorská republika', 'Ecuador', NULL, 'flag_ec_24.png', 'flag_ec_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (54, 'EST', 'EE', NULL, NULL, 'EST', 'Estónsko', 'Estónska republika', 'Estonia', NULL, 'flag_ee_24.png', 'flag_ee_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (56, 'FRO', 'FO', NULL, NULL, 'FRO', 'Faerské ostrovy', 'Faerské ostrovy', 'Faerské ostrovy', NULL, 'flag_fo_24.png', 'flag_fo_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (60, 'FIN', 'FI', NULL, 'FIN', 'FIN', 'Fínsko', 'Fínska republika', 'Finland', NULL, 'flag_fi_24.png', 'flag_fi_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (63, 'FRA', 'FR', 'FRA', NULL, 'FRA', 'Francúzsko', 'Francúzska republika', 'France', NULL, 'flag_fr_24.png', 'flag_fr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (66, 'GHA', 'GH', 'GHA', NULL, NULL, 'Ghana', 'Ghanská republika', 'Ghana', NULL, 'flag_gh_24.png', 'flag_gh_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (67, 'GIB', 'GI', NULL, NULL, 'GIB', 'Gibraltár', 'Gibraltár', 'Gibraltár', NULL, 'flag_gi_24.png', 'flag_gi_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (68, 'GRC', 'GR', NULL, NULL, 'GRE', 'Grécko', 'Grécka republika', 'Greece', NULL, 'flag_gr_24.png', 'flag_gr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (71, 'GEO', 'GE', NULL, NULL, 'GEO', 'Gruzínsko', 'Gruzínsko', 'Georgia', NULL, 'flag_ge_24.png', 'flag_ge_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (80, 'HTI', 'HT', 'HAI', NULL, NULL, 'Haiti', 'Haitská republika', 'Haiti', NULL, 'flag_ht_24.png', 'flag_ht_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (82, 'NLD', 'NL', 'NED', NULL, 'NED', 'Holandsko', 'Holandské kráľovstvo', 'Netherlands', NULL, 'flag_nl_24.png', 'flag_nl_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (85, 'HRV', 'HR', 'CRO', NULL, 'CRO', 'Chorvátsko', 'Chorvátska republika', 'Croatia', NULL, 'flag_hr_24.png', 'flag_hr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (88, 'IRQ', 'IQ', 'IRQ', NULL, NULL, 'Irak', 'Iracká republika', 'Iraq', NULL, 'flag_iq_24.png', 'flag_iq_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (89, 'IRN', 'IR', 'IRN', NULL, NULL, 'Irán', 'Iránska islamská republika', 'Iran', NULL, 'flag_ir_24.png', 'flag_ir_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17') ON CONFLICT ON CONSTRAINT "countries_pkey" DO NOTHING;
INSERT INTO "admin"."countries" ("source_id", "country_code", "country_code2", "sport_code_fifa", "sport_code_iihf", "sport_code_uefa", "name_sk", "name_sk_long", "name_en", "name_original", "flag_file", "flag_file_big", "flag_check", "is_active", "created_at", "updated_at") VALUES
    (90, 'IRL', 'IE', NULL, NULL, 'IRL', 'Írsko', 'Írska republika', 'Ireland', NULL, 'flag_ie_24.png', 'flag_ie_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (91, 'ISL', 'IS', NULL, NULL, 'ISL', 'Island', 'Islandská republika', 'Iceland', NULL, 'flag_is_24.png', 'flag_is_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (92, 'ISR', 'IL', NULL, NULL, 'ISR', 'Izrael', 'Izraelský štát', 'Israel', NULL, 'flag_il_24.png', 'flag_il_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (94, 'JPN', 'JP', 'JPN', NULL, NULL, 'Japonsko', 'Japonsko', 'Japan', NULL, 'flag_jp_24.png', 'flag_jp_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (97, 'JOR', 'JO', 'JOR', NULL, NULL, 'Jordánsko', 'Jordánske hášimovské kráľovstvo', 'Jordan', NULL, 'flag_jo_24.png', 'flag_jo_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (98, 'ZAF', 'ZA', 'RSA', NULL, NULL, 'Juhoafrická republika', 'Juhoafrická republika', 'South Africa', NULL, 'flag_za_24.png', 'flag_za_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (100, 'KOR', 'KR', 'KOR', NULL, NULL, 'Kórejská republika', 'Kórejská republika', 'South Korea', NULL, 'flag_kr_24.png', 'flag_kr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (105, 'CAN', 'CA', 'CAN', 'CAN', NULL, 'Kanada', 'Kanada', 'Canada', NULL, 'flag_ca_24.png', 'flag_ca_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (106, 'CPV', 'CV', 'CPV', NULL, NULL, 'Kapverdy', 'Kapverdská republika', 'Kapverdy', NULL, 'flag_cv_24.png', 'flag_cv_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (107, 'QAT', 'QA', 'QAT', NULL, NULL, 'Katar', 'Katarský štát', 'Katar', NULL, 'flag_qa_24.png', 'flag_qa_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (108, 'KAZ', 'KZ', NULL, NULL, 'KAZ', 'Kazachstan', 'Kazašská republika', 'Kazakhstan', NULL, 'flag_kz_24.png', 'flag_kz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (113, 'COL', 'CO', 'COL', NULL, NULL, 'Kolumbia', 'Kolumbijská republika', 'Colombia', NULL, 'flag_co_24.png', 'flag_co_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (115, 'COD', 'CD', 'COD', NULL, NULL, 'DR Kongo', 'Konžská demokratická republika', 'Democratic Republic of the Congo', NULL, 'flag_cd_24.png', 'flag_cd_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (118, 'UNK', 'XK', NULL, NULL, 'KOS', 'Kosovo', 'Republika Kosovo', 'Kosovo', NULL, 'flag_xk_24.png', 'flag_xk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (128, 'LTU', 'LT', NULL, NULL, 'LTU', 'Litva', 'Litovská republika', 'Lithuania', NULL, 'flag_lt_24.png', 'flag_lt_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (129, 'LVA', 'LV', NULL, 'LAT', 'LVA', 'Lotyšsko', 'Lotyšská republika', 'Latvia', NULL, 'flag_lv_24.png', 'flag_lv_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (130, 'LUX', 'LU', NULL, NULL, 'LUX', 'Luxembursko', 'Luxemburské veľkovojvodstvo', 'Luxembursko', NULL, 'flag_lu_24.png', 'flag_lu_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (133, 'HUN', 'HU', NULL, 'HUN', 'HUN', 'Maďarsko', 'Maďarsko', 'Hungary', NULL, 'flag_hu_24.png', 'flag_hu_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (138, 'MLT', 'MT', NULL, NULL, 'MLT', 'Malta', 'Maltská republika', 'Malta', NULL, 'flag_mt_24.png', 'flag_mt_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (140, 'MAR', 'MA', 'MAR', NULL, NULL, 'Maroko', 'Marocké kniežatstvo', 'Morocco', NULL, 'flag_ma_24.png', 'flag_ma_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (147, 'MEX', 'MX', 'MEX', NULL, NULL, 'Mexiko', 'Spojené štášy mexické', 'Mexico', NULL, 'flag_mx_24.png', 'flag_mx_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (150, 'MDA', 'MD', NULL, NULL, 'MDA', 'Moldavsko', 'Moldavská republika', 'Moldavsko', NULL, 'flag_md_24.png', 'flag_md_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (157, 'DEU', 'DE', 'GER', 'GER', 'GER', 'Nemecko', 'Nemecká spolková republika', 'Germany', NULL, 'flag_de_24.png', 'flag_de_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (164, 'NOR', 'NO', 'NOR', 'NOR', 'NOR', 'Nórsko', 'Nórske kráľovstvo', 'Norway', NULL, 'flag_no_24.png', 'flag_no_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (166, 'NZL', 'NZ', 'NZL', NULL, NULL, 'Nový Zéland', 'Nový Zéland', 'New Zealand', NULL, 'flag_nz_24.png', 'flag_nz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (171, 'PAN', 'PA', 'PAN', NULL, NULL, 'Panama', 'Panamská republika', 'Panama', NULL, 'flag_pa_24.png', 'flag_pa_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (174, 'PRY', 'PY', 'PAR', NULL, NULL, 'Paraguaj', 'Paraguajská republika', 'Paraguay', NULL, 'flag_py_24.png', 'flag_py_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (178, 'POL', 'PL', NULL, NULL, 'POL', 'Poľsko', 'Poľská republika', 'Poland', NULL, 'flag_pl_24.png', 'flag_pl_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (180, 'PRT', 'PT', 'POR', NULL, 'POR', 'Portugalsko', 'Portugalská republika', 'Portugal', NULL, 'flag_pt_24.png', 'flag_pt_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (181, 'AUT', 'AT', 'AUT', 'AUT', 'AUT', 'Rakúsko', 'Rakúska republika', 'Austria', NULL, 'flag_at_24.png', 'flag_at_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (184, 'ROU', 'RO', NULL, NULL, 'ROU', 'Rumunsko', 'Rumunsko', 'Romania', NULL, 'flag_ro_24.png', 'flag_ro_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (192, 'SMR', 'SM', NULL, NULL, 'SMR', 'San Maríno', 'Sanmarínska republika', 'San Maríno', NULL, 'flag_sm_24.png', 'flag_sm_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (193, 'SAU', 'SA', 'KSA', NULL, NULL, 'Saudská Arábia', 'Saudskoarabské kráľovstvo', 'Saudi Arabia', NULL, 'flag_sa_24.png', 'flag_sa_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (194, 'SEN', 'SN', 'SEN', NULL, NULL, 'Senegal', 'Senegalská republika', 'Senegal', NULL, 'flag_sn_24.png', 'flag_sn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (195, 'GB-NIR', 'GB-NIR', NULL, NULL, 'NIR', 'Severné Írsko', 'Severné Írsko', 'Northern Ireland', NULL, 'flag_gb-nir_24.png', 'flag_gb-nir_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (196, 'MKD', 'MK', NULL, NULL, 'MKD', 'Severné Macedónsko', 'Severomacedónska republika', 'Severné Macedónsko', NULL, 'flag_mk_24.png', 'flag_mk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (202, 'SVK', 'SK', NULL, 'SVK', 'SVK', 'Slovensko', 'Slovenská republika', 'Slovakia', NULL, 'flag_sk_24.png', 'flag_sk_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (203, 'SVN', 'SI', NULL, 'SLO', 'SVN', 'Slovinsko', 'Slovinská republika', 'Slovenia', NULL, 'flag_si_24.png', 'flag_si_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (206, 'USA', 'US', 'USA', 'USA', NULL, 'Spojené štáty', 'Spojené štáty Americké', 'United States', NULL, 'flag_us_24.png', 'flag_us_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (207, 'SRB', 'RS', NULL, NULL, 'SRB', 'Srbsko', 'Srbská republika', 'Serbia', NULL, 'flag_rs_24.png', 'flag_rs_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (221, 'GB-SCT', 'GB-SCT', 'SCO', NULL, 'SCO', 'Škótsko', 'Škótsko', 'Scotland', NULL, 'flag_gb-sct_24.png', 'flag_gb-sct_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (222, 'ESP', 'ES', 'ESP', NULL, 'ESP', 'Španielsko', 'Španielske kráľovstvo', 'Spain', NULL, 'flag_es_24.png', 'flag_es_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (223, 'CHE', 'CH', 'SUI', 'SUI', 'SUI', 'Švajčiarsko', 'Švajčiarska konfederácia', 'Switzerland', NULL, 'flag_ch_24.png', 'flag_ch_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (224, 'SWE', 'SE', 'SWE', 'SWE', 'SWE', 'Švédsko', 'Švédske kráľovstvo', 'Sweden', NULL, 'flag_se_24.png', 'flag_se_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (227, 'ITA', 'IT', NULL, 'ITA', 'ITA', 'Taliansko', 'Talianska republika', 'Italy', NULL, 'flag_it_24.png', 'flag_it_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (234, 'TUN', 'TN', 'TUN', NULL, NULL, 'Tunisko', 'Tuniská republika', 'Tunisia', NULL, 'flag_tn_24.png', 'flag_tn_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (235, 'TUR', 'TR', 'TUR', NULL, 'TUR', 'Turecko', 'Turecká republika', 'Turkey', NULL, 'flag_tr_24.png', 'flag_tr_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (240, 'UKR', 'UA', NULL, NULL, 'UKR', 'Ukrajina', 'Ukrajina', 'Ukraine', NULL, 'flag_ua_24.png', 'flag_ua_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (241, 'URY', 'UY', 'URU', NULL, NULL, 'Uruguaj', 'Uruguajská východná republika', 'Uruguay', NULL, 'flag_uy_24.png', 'flag_uy_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (242, 'UZB', 'UZ', 'UZB', NULL, NULL, 'Uzbekistan', 'Uzbecká republika', 'Uzbekistan', NULL, 'flag_uz_24.png', 'flag_uz_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (245, 'GBR', 'GB', NULL, 'GBR', NULL, 'Spojené kráľovstvo', 'Spojené kráľovstvo Veľkej Británie a SevernéhoÌrska', 'United Kingdom', NULL, 'flag_gb_24.png', 'flag_gb_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (250, 'GB-WLS', 'GB-WLS', NULL, NULL, 'WAL', 'Wales', 'Wales', 'Wales', NULL, 'flag_gb-wls_24.png', 'flag_gb-wls_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:07:17'),
    (1, 'AFG', 'AF', NULL, NULL, NULL, 'Afganistan', 'Afganská islamská republika', 'Afghanistan', NULL, 'flag_af_24.png', 'flag_af_240.png', 'OK', TRUE, '2026-08-26 12:07:17', '2026-08-26 12:32:18'),
    (NULL, 'CIV', 'CI', 'CIV', NULL, NULL, 'Pobrežie Slonoviny', 'Republika Pobrežie Slonoviny', 'Ivory Coast', 'République de Côte d''Ivoire', 'flag_ci_24.png', 'flag_ci_240.png', NULL, TRUE, '2026-08-26 12:07:17', '2026-08-26 17:14:03') ON CONFLICT ON CONSTRAINT "countries_pkey" DO NOTHING;

-- ── admin.uefa_clubs ───────────────────────────────
CREATE TABLE IF NOT EXISTS "admin"."uefa_clubs" (
    "club_id" SERIAL NOT NULL,
    "club_code" VARCHAR(20) NOT NULL,
    "club_name" VARCHAR(100) NOT NULL,
    "country_code" VARCHAR(6),
    "logo_file" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    "home_venue" VARCHAR(200)
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'uefa_clubs'
                      AND con.conname = 'uefa_clubs_pkey') THEN
        ALTER TABLE "admin"."uefa_clubs" ADD CONSTRAINT "uefa_clubs_pkey" PRIMARY KEY (club_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'uefa_clubs'
                      AND con.conname = 'uefa_clubs_code_format') THEN
        ALTER TABLE "admin"."uefa_clubs" ADD CONSTRAINT "uefa_clubs_code_format" CHECK (((club_code)::text ~ '^[A-Z0-9_-]{2,20}$'::text));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'uefa_clubs'
                      AND con.conname = 'uefa_clubs_country_code_fkey') THEN
        ALTER TABLE "admin"."uefa_clubs" ADD CONSTRAINT "uefa_clubs_country_code_fkey" FOREIGN KEY (country_code) REFERENCES admin.countries(country_code);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS uefa_clubs_active_idx ON admin.uefa_clubs USING btree (is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS uefa_clubs_code_idx ON admin.uefa_clubs USING btree (club_code);
CREATE INDEX IF NOT EXISTS uefa_clubs_country_idx ON admin.uefa_clubs USING btree (country_code);

-- 81 riadkov
INSERT INTO "admin"."uefa_clubs" ("club_id", "club_code", "club_name", "country_code", "logo_file", "is_active", "created_at", "updated_at", "home_venue") VALUES
    (44, 'EGNATIA', 'Egnatia', 'ALB', 'egnatia_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (70, 'DRITA', 'Drita', 'UNK', 'drita_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (47, 'GRNIK_ZABRZE', 'Górnik Zabrze', 'POL', 'grnik_zabrze_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (50, 'IBERIA_TBILISI', 'Iberia Tbilisi', 'GEO', 'iberia_tbilisi_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (53, 'KLAKSVK', 'Klaksvík', 'FRO', 'klaksvk_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (54, 'KUPS_KUOPIO', 'KuPS Kuopio', 'FIN', 'kups_kuopio_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (55, 'L_RED_IMPS', 'L. Red Imps', 'GIB', 'l_red_imps_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (57, 'LECH_POZNA', 'Lech Poznań', 'POL', 'lech_pozna_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (60, 'OMONIA', 'Omonia', 'CYP', 'omonia_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (63, 'SHAMROCK_ROVERS', 'Shamrock Rovers', 'IRL', 'shamrock_rovers_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (66, 'U_CRAIOVA', 'U. Craiova', 'ROU', 'u_craiova_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (67, 'VKINGUR_R', 'Víkingur R.', 'ISL', 'vkingur_r_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (68, 'ATERT_BISSEN', 'Atert Bissen', 'LUX', 'atert_bissen_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (69, 'BORAC', 'Borac', 'BIH', 'borac_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (56, 'LARNE', 'Larne', 'GB-NIR', 'larne_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (49, 'HEARTS', 'Hearts', 'GB-SCT', 'hearts_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (65, 'THUN', 'Thun', 'CHE', 'thun_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (71, 'FLORA_TALLINN', 'Flora Tallinn', 'EST', 'flora_tallinn_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (72, 'FLORIANA', 'Floriana', 'MLT', 'floriana_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (73, 'GYRI_ETO', 'Győri ETO', 'HUN', 'gyri_eto_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (74, 'INTER_ESCALDES', 'Inter Escaldes', 'AND', 'inter_escaldes_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (75, 'ML_VITEBSK', 'ML Vitebsk', 'BLR', 'ml_vitebsk_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (76, 'PETROCUB', 'Petrocub', 'MDA', 'petrocub_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (77, 'RIGA', 'Riga', 'LVA', 'riga_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (78, 'SUTJESKA', 'Sutjeska', 'MNE', 'sutjeska_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (80, 'TRE_FIORI', 'Tre Fiori', 'SMR', 'tre_fiori_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (81, 'VARDAR', 'Vardar', 'MKD', 'vardar_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (79, 'THE_NEW_SAINTS', 'The New Saints', 'GB-WLS', 'the_new_saints_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 13:39:48', NULL),
    (42, 'XCEL', 'NK Celje', 'SVN', 'celje_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 16:59:03', NULL),
    (31, 'CEL', 'Celtic FC', 'GB-SCT', 'celtic_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 16:59:21', NULL),
    (46, 'DIN', 'GNK Dinamo', 'HRV', 'gnk_dinamo_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 16:59:59', NULL),
    (48, 'XHAP', 'Hapoel Beer-Sheva FC', 'ISR', 'h_beer_sheva_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:00:24', NULL),
    (58, 'XLEV', 'PFC Levski Sofia', 'BGR', 'levski_sofia_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:01:22', NULL),
    (35, 'LYO', 'Olympique Lyonnais', 'FRA', 'lyon_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:01:37', NULL),
    (36, 'XNEC', 'N.E.C. Nijmegen', 'NLD', 'nec_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:02:04', NULL),
    (40, 'XAAR', 'AGF Aarhus', 'DNK', 'aarhus_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:03:42', NULL),
    (41, 'XARA', 'FC Ararat-Armenia', 'ARM', 'ararat_armenia_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:04:00', NULL),
    (43, 'ZVE', 'FK Crvena Zvezda', 'SRB', 'crvena_zvezda_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:04:27', NULL),
    (51, 'KAI', 'FC Kairat Almaty', 'KAZ', 'kairat_almaty_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:04:40', NULL),
    (52, 'XKAU', 'FK Kauno Žalgiris', 'LTU', 'kauno_algiris_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:05:01', NULL),
    (59, 'XMJA', 'Mjällby AIF', 'SWE', 'mjllby_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:05:27', NULL),
    (37, 'OLY', 'Olympiacos FC', 'GRC', 'olympiacos_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:05:44', NULL),
    (38, 'SPA', 'AC Sparta Praha', 'CZE', 'sparta_praha_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:06:00', NULL),
    (64, 'SGR', 'SK Sturm Graz', 'AUT', 'sturm_graz_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:06:15', NULL),
    (39, 'USG', 'R. Union Saint-Gilloise', 'BEL', 'union_sg_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-26 17:06:36', NULL),
    (1, 'ARS', 'Arsenal', 'GB-ENG', 'arsenal_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Emirates Stadium'),
    (2, 'AVL', 'Aston Villa', 'GB-ENG', 'aston_villa_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Villa Park'),
    (3, 'ATM', 'Atlético de Madrid', 'ESP', 'atleti_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Metropolitano Stadium'),
    (4, 'BVB', 'Borussia Dortmund', 'DEU', 'b_dortmund_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Signal Iduna Park'),
    (5, 'BAR', 'FC Barcelona', 'ESP', 'barcelona_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Camp Nou'),
    (6, 'BAY', 'FC Bayern München', 'DEU', 'bayern_mnchen_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Allianz Arena'),
    (7, 'BRU', 'Club Brugge KV', 'BEL', 'club_brugge_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Jan Breydel Stadion'),
    (10, 'GAL', 'Galatasaray A.Ş.', 'TUR', 'galatasaray_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Rams Park'),
    (9, 'FEY', 'Feyenoord', 'NLD', 'feyenoord_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'De Kuip'),
    (11, 'INT', 'FC Internazionale Milano', 'ITA', 'inter_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Stadio Giuseppe Meazza (San Siro)'),
    (12, 'RBL', 'RB Leipzig', 'DEU', 'leipzig_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Red Bull Arena'),
    (14, 'LIL', 'LOSC Lille', 'FRA', 'lille_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Stade Pierre-Mauroy'),
    (15, 'LIV', 'Liverpool FC', 'GB-ENG', 'liverpool_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Anfield'),
    (16, 'MCI', 'Manchester City', 'GB-ENG', 'man_city_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Etihad Stadium'),
    (17, 'MUN', 'Manchester United', 'GB-ENG', 'man_utd_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Old Trafford'),
    (18, 'NAP', 'SSC Napoli', 'ITA', 'napoli_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Stadio Diego Armando Maradona'),
    (19, 'PSG', 'Paris Saint-Germain', 'FRA', 'paris_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Parc des Princes'),
    (20, 'POR', 'FC Porto', 'PRT', 'porto_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Estádio do Dragão'),
    (27, 'SPO', 'Sporting Clube de Portugal', 'PRT', 'sporting_cp_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Estádio José Alvalade'),
    (21, 'PSV', 'PSV Eindhoven', 'NLD', 'psv_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Philips Stadion'),
    (22, 'BET', 'Real Betis Balompié', 'ESP', 'real_betis_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Estadio de La Cartuja'),
    (23, 'RMA', 'Real Madrid C.F.', 'ESP', 'real_madrid_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Estadio Santiago Bernabéu'),
    (24, 'ROM', 'AS Roma', 'ITA', 'roma_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Stadio Olimpico'),
    (25, 'SHK', 'FC Shakhtar Donetsk', 'UKR', 'shakhtar_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Stamford Bridge'),
    (26, 'SLA', 'SK Slavia Praha', 'CZE', 'slavia_praha_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Fortuna Arena'),
    (28, 'STU', 'VfB Stuttgart', 'DEU', 'stuttgart_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'MHPArena'),
    (29, 'VIL', 'Villarreal CF', 'ESP', 'villarreal_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Estadio de la Ceramica'),
    (34, 'BOD', 'FK Bodø/Glimt', 'NOR', 'bodglimt_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Aspmyra Stadion'),
    (45, 'FEN', 'Fenerbahçe SK', 'TUR', 'fenerbahe_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Chobani Stadium Fenerbahce Sukru Saracoglu'),
    (61, 'SLB', 'ŠK Slovan Bratislava', 'SVK', 's_bratislava_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:00:11', 'Tehelné pole'),
    (30, 'AEK', 'AEK Athens FC', 'GRC', 'aek_athens_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:10:16', 'Allwyn Arena'),
    (8, 'COM', 'Como 1907', 'ITA', 'como_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:10:28', 'Mapei Stadium / Stadio Giuseppe Sinigaglia'),
    (32, 'LAS', 'LASK', 'AUT', 'lask_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:10:36', 'Raiffeisen Arena'),
    (13, 'RCL', 'RC Lens', 'FRA', 'lens_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:10:52', 'Stade Bollaert-Delelis'),
    (62, 'SAB', 'Sabah FC', 'AZE', 'sabah_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:11:16', 'Bank Respublika Arena'),
    (33, 'VIK', 'Viking FK', 'NOR', 'viking_logo.png', TRUE, '2026-08-26 13:39:48', '2026-08-30 18:11:22', 'Lyse Arena') ON CONFLICT ON CONSTRAINT "uefa_clubs_pkey" DO NOTHING;
SELECT setval(pg_get_serial_sequence('admin.uefa_clubs', 'club_id'), COALESCE((SELECT MAX("club_id") FROM "admin"."uefa_clubs"), 1));

-- ── admin.group_viewers ────────────────────────────
CREATE TABLE IF NOT EXISTS "admin"."group_viewers" (
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "added_by" INTEGER,
    "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'group_viewers'
                      AND con.conname = 'group_viewers_pkey') THEN
        ALTER TABLE "admin"."group_viewers" ADD CONSTRAINT "group_viewers_pkey" PRIMARY KEY (group_id, user_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'group_viewers'
                      AND con.conname = 'group_viewers_added_by_fkey') THEN
        ALTER TABLE "admin"."group_viewers" ADD CONSTRAINT "group_viewers_added_by_fkey" FOREIGN KEY (added_by) REFERENCES admin.users(id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'group_viewers'
                      AND con.conname = 'group_viewers_group_id_fkey') THEN
        ALTER TABLE "admin"."group_viewers" ADD CONSTRAINT "group_viewers_group_id_fkey" FOREIGN KEY (group_id) REFERENCES admin.friend_groups(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'group_viewers'
                      AND con.conname = 'group_viewers_user_id_fkey') THEN
        ALTER TABLE "admin"."group_viewers" ADD CONSTRAINT "group_viewers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES admin.users(id) ON DELETE CASCADE;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS group_viewers_user_idx ON admin.group_viewers USING btree (user_id);

-- ── admin.livescore_log ────────────────────────────
CREATE TABLE IF NOT EXISTS "admin"."livescore_log" (
    "id" SERIAL NOT NULL,
    "checked_at" TIMESTAMP NOT NULL DEFAULT now(),
    "url" VARCHAR(500),
    "match_id" VARCHAR(20),
    "model" VARCHAR(100),
    "home_team" VARCHAR(100),
    "away_team" VARCHAR(100),
    "competition" VARCHAR(100),
    "started" BOOLEAN,
    "finished" BOOLEAN,
    "minute" SMALLINT,
    "minute_note" VARCHAR(50),
    "period" VARCHAR(50),
    "status" VARCHAR(50),
    "home_score" SMALLINT,
    "away_score" SMALLINT,
    "home_score_halftime" SMALLINT,
    "away_score_halftime" SMALLINT,
    "home_yellow_cards" SMALLINT,
    "away_yellow_cards" SMALLINT,
    "home_red_cards" SMALLINT,
    "away_red_cards" SMALLINT,
    "start_time_text" VARCHAR(100),
    "notes" TEXT,
    "raw" JSONB,
    "tokens" INTEGER,
    "took_ms" INTEGER
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'admin' AND rel.relname = 'livescore_log'
                      AND con.conname = 'livescore_log_pkey') THEN
        ALTER TABLE "admin"."livescore_log" ADD CONSTRAINT "livescore_log_pkey" PRIMARY KEY (id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS livescore_log_match_idx ON admin.livescore_log USING btree (match_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS livescore_log_time_idx ON admin.livescore_log USING btree (checked_at DESC);

-- ── lm2026-27.scoring_config ───────────────────────
CREATE TABLE IF NOT EXISTS "lm2026-27"."scoring_config" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "value" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'scoring_config'
                      AND con.conname = 'scoring_config_pkey') THEN
        ALTER TABLE "lm2026-27"."scoring_config" ADD CONSTRAINT "scoring_config_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'scoring_config'
                      AND con.conname = 'scoring_config_key_key') THEN
        ALTER TABLE "lm2026-27"."scoring_config" ADD CONSTRAINT "scoring_config_key_key" UNIQUE (key);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'scoring_config'
                      AND con.conname = 'scoring_config_updated_by_fkey') THEN
        ALTER TABLE "lm2026-27"."scoring_config" ADD CONSTRAINT "scoring_config_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES admin.users(id);
    END IF;
END $$;

-- 3 riadkov
INSERT INTO "lm2026-27"."scoring_config" ("id", "key", "value", "updated_by", "updated_at") VALUES
    (1, 'correct_result_group', 3, NULL, '2026-08-25 08:57:01'),
    (2, 'correct_result_playoff', 5, NULL, '2026-08-25 08:57:01'),
    (3, 'correct_goals_per_team', 1, NULL, '2026-08-25 08:57:01') ON CONFLICT ON CONSTRAINT "scoring_config_pkey" DO NOTHING;
SELECT setval(pg_get_serial_sequence('lm2026-27.scoring_config', 'id'), COALESCE((SELECT MAX("id") FROM "lm2026-27"."scoring_config"), 1));

-- ── lm2026-27.games_pdf ────────────────────────────
CREATE TABLE IF NOT EXISTS "lm2026-27"."games_pdf" (
    "game_number" INTEGER NOT NULL,
    "phase" VARCHAR(10) NOT NULL,
    "round_no" SMALLINT,
    "starts_at" TIMESTAMP NOT NULL,
    "tie_id" VARCHAR(20),
    "leg" SMALLINT,
    "venue" VARCHAR(200),
    "flashscore_url" VARCHAR(500),
    "home_team_id" INTEGER,
    "away_team_id" INTEGER
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games_pdf'
                      AND con.conname = 'games_pdf_pkey') THEN
        ALTER TABLE "lm2026-27"."games_pdf" ADD CONSTRAINT "games_pdf_pkey" PRIMARY KEY (game_number);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games_pdf'
                      AND con.conname = 'games_pdf_leg_check') THEN
        ALTER TABLE "lm2026-27"."games_pdf" ADD CONSTRAINT "games_pdf_leg_check" CHECK (((leg IS NULL) OR (leg = ANY (ARRAY[1, 2]))));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games_pdf'
                      AND con.conname = 'games_pdf_round_check') THEN
        ALTER TABLE "lm2026-27"."games_pdf" ADD CONSTRAINT "games_pdf_round_check" CHECK (((((phase)::text = 'LEAGUE'::text) AND ((round_no >= 1) AND (round_no <= 8))) OR (((phase)::text <> 'LEAGUE'::text) AND (round_no IS NULL))));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games_pdf'
                      AND con.conname = 'games_pdf_away_team_id_fkey') THEN
        ALTER TABLE "lm2026-27"."games_pdf" ADD CONSTRAINT "games_pdf_away_team_id_fkey" FOREIGN KEY (away_team_id) REFERENCES admin.uefa_clubs(club_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games_pdf'
                      AND con.conname = 'games_pdf_home_team_id_fkey') THEN
        ALTER TABLE "lm2026-27"."games_pdf" ADD CONSTRAINT "games_pdf_home_team_id_fkey" FOREIGN KEY (home_team_id) REFERENCES admin.uefa_clubs(club_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS games_pdf_phase_idx ON "lm2026-27".games_pdf USING btree (phase, round_no);
CREATE INDEX IF NOT EXISTS games_pdf_start_idx ON "lm2026-27".games_pdf USING btree (starts_at);

-- 189 riadkov
INSERT INTO "lm2026-27"."games_pdf" ("game_number", "phase", "round_no", "starts_at", "tie_id", "leg", "venue", "flashscore_url", "home_team_id", "away_team_id") VALUES
    (14, 'LEAGUE', 1, '2026-09-10 14:45:00', NULL, NULL, 'Philips Stadion', 'https://www.flashscore.com/match/football/psv-M9UEHJWi/shakhtar-4ENWX2OA/?mid=UTCOpiqp', 21, 25),
    (15, 'LEAGUE', 1, '2026-09-10 17:00:00', NULL, NULL, 'Allianz Arena', 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/bodo-glimt-S0WZMUNG/?mid=21qdVdR6', 6, 34),
    (16, 'LEAGUE', 1, '2026-09-10 17:00:00', NULL, NULL, 'Mapei Stadium / Stadio Giuseppe Sinigaglia', 'https://www.flashscore.com/match/football/como-ttyLthOA/rb-leipzig-KbS1suSm/?mid=WhVkZZ2L', 8, 12),
    (17, 'LEAGUE', 1, '2026-09-10 17:00:00', NULL, NULL, 'Old Trafford', 'https://www.flashscore.com/match/football/manchester-united-ppjDR086/sabah-baku-fNGcxbyr/?mid=EwQ5ud74', 17, 62),
    (18, 'LEAGUE', 1, '2026-09-10 17:00:00', NULL, NULL, 'Fortuna Arena', 'https://www.flashscore.com/match/football/lens-IBmris38/slavia-prague-viXGgnyB/?mid=YepM57w0', 26, 13),
    (19, 'LEAGUE', 2, '2026-10-13 14:45:00', NULL, NULL, 'Stade Bollaert-Delelis', 'https://www.flashscore.com/match/football/lens-IBmris38/sporting-cp-tljXuHBC/?mid=boMhjDLM', 13, 27),
    (20, 'LEAGUE', 2, '2026-10-13 14:45:00', NULL, NULL, 'Bank Respublika Arena', 'https://www.flashscore.com/match/football/sabah-baku-fNGcxbyr/slavia-prague-viXGgnyB/?mid=69rU3o8C', 62, 26),
    (21, 'LEAGUE', 2, '2026-10-13 17:00:00', NULL, NULL, 'Emirates Stadium', 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/lille-pfDZL71o/?mid=pOc8KuDl', 1, 14),
    (22, 'LEAGUE', 2, '2026-10-13 17:00:00', NULL, NULL, 'Metropolitano Stadium', 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/manchester-united-ppjDR086/?mid=C0GBpZVH', 3, 17),
    (23, 'LEAGUE', 2, '2026-10-13 17:00:00', NULL, NULL, 'Rams Park', 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/galatasaray-riaqqurF/?mid=hWJelHWh', 10, 5),
    (24, 'LEAGUE', 2, '2026-10-13 17:00:00', NULL, NULL, 'Stadio Giuseppe Meazza (San Siro)', 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/inter-Iw7eKK25/?mid=YkFBumlL', 11, 7),
    (25, 'LEAGUE', 2, '2026-10-13 17:00:00', NULL, NULL, 'Red Bull Arena', 'https://www.flashscore.com/match/football/psv-M9UEHJWi/rb-leipzig-KbS1suSm/?mid=SK2I6Y53', 12, 21),
    (26, 'LEAGUE', 2, '2026-10-13 17:00:00', NULL, NULL, 'Lyse Arena', 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/viking-bXAgOWwb/?mid=p8JTqdt0', 33, 6),
    (27, 'LEAGUE', 2, '2026-10-13 17:00:00', NULL, NULL, 'Estadio de la Ceramica', 'https://www.flashscore.com/match/football/napoli-69Dxbc61/villarreal-lUatW5jE/?mid=QcgCe8c2', 29, 18),
    (28, 'LEAGUE', 2, '2026-10-14 14:45:00', NULL, NULL, 'De Kuip', 'https://www.flashscore.com/match/football/como-ttyLthOA/feyenoord-8zjySeoN/?mid=rFNyQVP7', 9, 8),
    (29, 'LEAGUE', 2, '2026-10-14 14:45:00', NULL, NULL, 'Raiffeisen Arena', 'https://www.flashscore.com/match/football/lask-linz-MipWYeKQ/liverpool-lId4TMwf/?mid=6cITvAb3', 32, 15),
    (30, 'LEAGUE', 2, '2026-10-14 17:00:00', NULL, NULL, 'Stadio Olimpico', 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/real-madrid-W8mj7MDD/?mid=4j50U1OM', 24, 23),
    (31, 'LEAGUE', 2, '2026-10-14 17:00:00', NULL, NULL, 'Villa Park', 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/fenerbahce-MsbmracL/?mid=OhXJC6X0', 2, 45),
    (32, 'LEAGUE', 2, '2026-10-14 17:00:00', NULL, NULL, 'Estadio de La Cartuja', 'https://www.flashscore.com/match/football/betis-vJbTeCGP/fc-porto-S2NmScGp/?mid=xt5Mx0jU', 22, 20),
    (33, 'LEAGUE', 2, '2026-10-14 17:00:00', NULL, NULL, 'Aspmyra Stadion', 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/dortmund-nP1i5US1/?mid=QejW1kJr', 34, 4),
    (34, 'LEAGUE', 2, '2026-10-14 17:00:00', NULL, NULL, 'Etihad Stadium', 'https://www.flashscore.com/match/football/manchester-city-Wtn9Stg0/psg-CjhkPw0k/?mid=UH6LCxcK', 16, 19),
    (35, 'LEAGUE', 2, '2026-10-14 17:00:00', NULL, NULL, 'Stamford Bridge', 'https://www.flashscore.com/match/football/aek-ANpZncAM/shakhtar-4ENWX2OA/?mid=Y1LED1zo', 25, 30),
    (36, 'LEAGUE', 2, '2026-10-14 17:00:00', NULL, NULL, 'Tehelné pole', 'https://www.flashscore.com/match/football/slovan-bratislava-QRaWdwQf/vfb-stuttgart-nJQmYp1B/?mid=pfE25bqH', 61, 28),
    (37, 'LEAGUE', 3, '2026-10-20 14:45:00', NULL, NULL, 'Chobani Stadium Fenerbahce Sukru Saracoglu', 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/slavia-prague-viXGgnyB/?mid=2yMLTDQr', 45, 26),
    (38, 'LEAGUE', 3, '2026-10-20 14:45:00', NULL, NULL, 'Bank Respublika Arena', 'https://www.flashscore.com/match/football/dortmund-nP1i5US1/sabah-baku-fNGcxbyr/?mid=b9lv0Tme', 62, 4),
    (39, 'LEAGUE', 3, '2026-10-20 17:00:00', NULL, NULL, 'Stadio Olimpico', 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/slovan-bratislava-QRaWdwQf/?mid=CjoYQdhB', 24, 61),
    (40, 'LEAGUE', 3, '2026-10-20 17:00:00', NULL, NULL, 'Estádio do Dragão', 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/psv-M9UEHJWi/?mid=jP6EvMLH', 20, 21),
    (41, 'LEAGUE', 3, '2026-10-20 17:00:00', NULL, NULL, 'Anfield', 'https://www.flashscore.com/match/football/liverpool-lId4TMwf/villarreal-lUatW5jE/?mid=2swdQAqA', 15, 29),
    (42, 'LEAGUE', 3, '2026-10-20 17:00:00', NULL, NULL, 'Etihad Stadium', 'https://www.flashscore.com/match/football/aek-ANpZncAM/manchester-city-Wtn9Stg0/?mid=djVwRmZR', 16, 30),
    (43, 'LEAGUE', 3, '2026-10-20 17:00:00', NULL, NULL, 'Stadio Diego Armando Maradona', 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/napoli-69Dxbc61/?mid=QiGrsUa6', 18, 34),
    (44, 'LEAGUE', 3, '2026-10-20 17:00:00', NULL, NULL, 'Parc des Princes', 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/psg-CjhkPw0k/?mid=6u963YJ6', 19, 5),
    (45, 'LEAGUE', 3, '2026-10-20 17:00:00', NULL, NULL, 'MHPArena', 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/vfb-stuttgart-nJQmYp1B/?mid=8ODjcCFN', 28, 3),
    (46, 'LEAGUE', 3, '2026-10-21 14:45:00', NULL, NULL, 'Mapei Stadium / Stadio Giuseppe Sinigaglia', 'https://www.flashscore.com/match/football/como-ttyLthOA/manchester-united-ppjDR086/?mid=UTWLyE6T', 8, 17),
    (47, 'LEAGUE', 3, '2026-10-21 14:45:00', NULL, NULL, 'Stade Pierre-Mauroy', 'https://www.flashscore.com/match/football/galatasaray-riaqqurF/lille-pfDZL71o/?mid=nRzlASTh', 14, 10),
    (48, 'LEAGUE', 3, '2026-10-21 17:00:00', NULL, NULL, 'Villa Park', 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/viking-bXAgOWwb/?mid=d6VRAp2D', 2, 33),
    (49, 'LEAGUE', 3, '2026-10-21 17:00:00', NULL, NULL, 'Allianz Arena', 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/bayern-munich-nVp0wiqd/?mid=OIffEkYO', 6, 1),
    (50, 'LEAGUE', 3, '2026-10-21 17:00:00', NULL, NULL, 'Estadio de La Cartuja', 'https://www.flashscore.com/match/football/betis-vJbTeCGP/feyenoord-8zjySeoN/?mid=CjRjR5nf', 22, 9),
    (51, 'LEAGUE', 3, '2026-10-21 17:00:00', NULL, NULL, 'Jan Breydel Stadion', 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/lens-IBmris38/?mid=hC5ThCtS', 7, 13),
    (52, 'LEAGUE', 3, '2026-10-21 17:00:00', NULL, NULL, 'Stadio Giuseppe Meazza (San Siro)', 'https://www.flashscore.com/match/football/inter-Iw7eKK25/shakhtar-4ENWX2OA/?mid=4Y5szRBr', 11, 25),
    (53, 'LEAGUE', 3, '2026-10-21 17:00:00', NULL, NULL, 'Estadio Santiago Bernabéu', 'https://www.flashscore.com/match/football/rb-leipzig-KbS1suSm/real-madrid-W8mj7MDD/?mid=OC3pYqPc', 23, 12),
    (54, 'LEAGUE', 3, '2026-10-21 17:00:00', NULL, NULL, 'Estádio José Alvalade', 'https://www.flashscore.com/match/football/lask-linz-MipWYeKQ/sporting-cp-tljXuHBC/?mid=I7KxfeMc', 27, 32),
    (55, 'LEAGUE', 4, '2026-11-03 16:45:00', NULL, NULL, 'Rams Park', 'https://www.flashscore.com/match/football/galatasaray-riaqqurF/vfb-stuttgart-nJQmYp1B/?mid=SGSUoDnR', 10, 28),
    (56, 'LEAGUE', 4, '2026-11-03 16:45:00', NULL, NULL, 'Stamford Bridge', 'https://www.flashscore.com/match/football/shakhtar-4ENWX2OA/sporting-cp-tljXuHBC/?mid=QXNphZjA', 25, 27),
    (57, 'LEAGUE', 4, '2026-11-03 19:00:00', NULL, NULL, 'Metropolitano Stadium', 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/bayern-munich-nVp0wiqd/?mid=vg7E1ClJ', 3, 6),
    (58, 'LEAGUE', 4, '2026-11-03 19:00:00', NULL, NULL, 'Camp Nou', 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/barcelona-SKbpVP5K/?mid=tGbMn4el', 5, 2),
    (59, 'LEAGUE', 4, '2026-11-03 19:00:00', NULL, NULL, 'Aspmyra Stadion', 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/lille-pfDZL71o/?mid=YqbyqjVg', 34, 14),
    (60, 'LEAGUE', 4, '2026-11-03 19:00:00', NULL, NULL, 'De Kuip', 'https://www.flashscore.com/match/football/feyenoord-8zjySeoN/inter-Iw7eKK25/?mid=xK9rfn3E', 9, 11),
    (61, 'LEAGUE', 4, '2026-11-03 19:00:00', NULL, NULL, 'Raiffeisen Arena', 'https://www.flashscore.com/match/football/lask-linz-MipWYeKQ/slovan-bratislava-QRaWdwQf/?mid=6TK5I5v3', 32, 61),
    (62, 'LEAGUE', 4, '2026-11-03 19:00:00', NULL, NULL, 'Old Trafford', 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/manchester-united-ppjDR086/?mid=8rnngLzB', 17, 24),
    (63, 'LEAGUE', 4, '2026-11-03 19:00:00', NULL, NULL, 'Estadio de la Ceramica', 'https://www.flashscore.com/match/football/psg-CjhkPw0k/villarreal-lUatW5jE/?mid=Y7dW9kaT', 29, 19),
    (64, 'LEAGUE', 4, '2026-11-04 16:45:00', NULL, NULL, 'Allwyn Arena', 'https://www.flashscore.com/match/football/aek-ANpZncAM/real-madrid-W8mj7MDD/?mid=8nfvNJGd', 30, 23),
    (65, 'LEAGUE', 4, '2026-11-04 16:45:00', NULL, NULL, 'Chobani Stadium Fenerbahce Sukru Saracoglu', 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/liverpool-lId4TMwf/?mid=E3VsH66d', 45, 15),
    (66, 'LEAGUE', 4, '2026-11-04 19:00:00', NULL, NULL, 'Signal Iduna Park', 'https://www.flashscore.com/match/football/betis-vJbTeCGP/dortmund-nP1i5US1/?mid=Ao5br4Mh', 4, 22),
    (67, 'LEAGUE', 4, '2026-11-04 19:00:00', NULL, NULL, 'Estádio do Dragão', 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/napoli-69Dxbc61/?mid=6Zinb7I7', 20, 18),
    (68, 'LEAGUE', 4, '2026-11-04 19:00:00', NULL, NULL, 'Stade Bollaert-Delelis', 'https://www.flashscore.com/match/football/como-ttyLthOA/lens-IBmris38/?mid=QVtE7T8m', 13, 8),
    (69, 'LEAGUE', 4, '2026-11-04 19:00:00', NULL, NULL, 'Philips Stadion', 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/psv-M9UEHJWi/?mid=ptuqtEuP', 21, 7),
    (70, 'LEAGUE', 4, '2026-11-04 19:00:00', NULL, NULL, 'Red Bull Arena', 'https://www.flashscore.com/match/football/manchester-city-Wtn9Stg0/rb-leipzig-KbS1suSm/?mid=YVOHJ5R1', 12, 16),
    (71, 'LEAGUE', 4, '2026-11-04 19:00:00', NULL, NULL, 'Fortuna Arena', 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/slavia-prague-viXGgnyB/?mid=nBxtZvSs', 26, 1),
    (72, 'LEAGUE', 4, '2026-11-04 19:00:00', NULL, NULL, 'Lyse Arena', 'https://www.flashscore.com/match/football/sabah-baku-fNGcxbyr/viking-bXAgOWwb/?mid=4GCn9tph', 33, 62),
    (73, 'LEAGUE', 5, '2026-11-24 16:45:00', NULL, NULL, 'Aspmyra Stadion', 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/lask-linz-MipWYeKQ/?mid=pItlFEBk', 34, 32),
    (74, 'LEAGUE', 5, '2026-11-24 16:45:00', NULL, NULL, 'Rams Park', 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/galatasaray-riaqqurF/?mid=OCNDYmfK', 10, 2),
    (75, 'LEAGUE', 5, '2026-11-24 19:00:00', NULL, NULL, 'Emirates Stadium', 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/dortmund-nP1i5US1/?mid=vPVzwlTF', 1, 4),
    (76, 'LEAGUE', 5, '2026-11-24 19:00:00', NULL, NULL, 'Mapei Stadium / Stadio Giuseppe Sinigaglia', 'https://www.flashscore.com/match/football/aek-ANpZncAM/como-ttyLthOA/?mid=jiHA3xET', 8, 30),
    (77, 'LEAGUE', 5, '2026-11-24 19:00:00', NULL, NULL, 'De Kuip', 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/feyenoord-8zjySeoN/?mid=6grtKluR', 9, 20),
    (78, 'LEAGUE', 5, '2026-11-24 19:00:00', NULL, NULL, 'Etihad Stadium', 'https://www.flashscore.com/match/football/manchester-city-Wtn9Stg0/napoli-69Dxbc61/?mid=OxXVS94F', 16, 18),
    (79, 'LEAGUE', 5, '2026-11-24 19:00:00', NULL, NULL, 'Red Bull Arena', 'https://www.flashscore.com/match/football/lens-IBmris38/rb-leipzig-KbS1suSm/?mid=pxXsydY8', 12, 13),
    (80, 'LEAGUE', 5, '2026-11-24 19:00:00', NULL, NULL, 'Estadio Santiago Bernabéu', 'https://www.flashscore.com/match/football/psv-M9UEHJWi/real-madrid-W8mj7MDD/?mid=6PURSlmI', 23, 21),
    (81, 'LEAGUE', 5, '2026-11-24 19:00:00', NULL, NULL, 'Tehelné pole', 'https://www.flashscore.com/match/football/betis-vJbTeCGP/slovan-bratislava-QRaWdwQf/?mid=I9qIUvgn', 61, 22),
    (145, 'PO', NULL, '2027-02-16 19:00:00', 'PO-1', 1, NULL, NULL, NULL, NULL),
    (146, 'PO', NULL, '2027-02-16 19:00:00', 'PO-2', 1, NULL, NULL, NULL, NULL),
    (147, 'PO', NULL, '2027-02-16 19:00:00', 'PO-3', 1, NULL, NULL, NULL, NULL),
    (148, 'PO', NULL, '2027-02-16 19:00:00', 'PO-4', 1, NULL, NULL, NULL, NULL),
    (149, 'PO', NULL, '2027-02-17 19:00:00', 'PO-5', 1, NULL, NULL, NULL, NULL),
    (150, 'PO', NULL, '2027-02-17 19:00:00', 'PO-6', 1, NULL, NULL, NULL, NULL),
    (151, 'PO', NULL, '2027-02-17 19:00:00', 'PO-7', 1, NULL, NULL, NULL, NULL),
    (152, 'PO', NULL, '2027-02-17 19:00:00', 'PO-8', 1, NULL, NULL, NULL, NULL),
    (153, 'PO', NULL, '2027-02-23 19:00:00', 'PO-1', 2, NULL, NULL, NULL, NULL),
    (154, 'PO', NULL, '2027-02-23 19:00:00', 'PO-2', 2, NULL, NULL, NULL, NULL),
    (155, 'PO', NULL, '2027-02-23 19:00:00', 'PO-3', 2, NULL, NULL, NULL, NULL),
    (156, 'PO', NULL, '2027-02-23 19:00:00', 'PO-4', 2, NULL, NULL, NULL, NULL),
    (157, 'PO', NULL, '2027-02-24 19:00:00', 'PO-5', 2, NULL, NULL, NULL, NULL),
    (158, 'PO', NULL, '2027-02-24 19:00:00', 'PO-6', 2, NULL, NULL, NULL, NULL),
    (159, 'PO', NULL, '2027-02-24 19:00:00', 'PO-7', 2, NULL, NULL, NULL, NULL),
    (160, 'PO', NULL, '2027-02-24 19:00:00', 'PO-8', 2, NULL, NULL, NULL, NULL),
    (161, 'R16', NULL, '2027-03-09 19:00:00', 'R16-1', 1, NULL, NULL, NULL, NULL),
    (162, 'R16', NULL, '2027-03-09 19:00:00', 'R16-2', 1, NULL, NULL, NULL, NULL),
    (163, 'R16', NULL, '2027-03-09 19:00:00', 'R16-3', 1, NULL, NULL, NULL, NULL),
    (164, 'R16', NULL, '2027-03-09 19:00:00', 'R16-4', 1, NULL, NULL, NULL, NULL),
    (165, 'R16', NULL, '2027-03-10 19:00:00', 'R16-5', 1, NULL, NULL, NULL, NULL),
    (166, 'R16', NULL, '2027-03-10 19:00:00', 'R16-6', 1, NULL, NULL, NULL, NULL),
    (167, 'R16', NULL, '2027-03-10 19:00:00', 'R16-7', 1, NULL, NULL, NULL, NULL),
    (168, 'R16', NULL, '2027-03-10 19:00:00', 'R16-8', 1, NULL, NULL, NULL, NULL),
    (169, 'R16', NULL, '2027-03-16 19:00:00', 'R16-1', 2, NULL, NULL, NULL, NULL),
    (170, 'R16', NULL, '2027-03-16 19:00:00', 'R16-2', 2, NULL, NULL, NULL, NULL),
    (171, 'R16', NULL, '2027-03-16 19:00:00', 'R16-3', 2, NULL, NULL, NULL, NULL),
    (172, 'R16', NULL, '2027-03-16 19:00:00', 'R16-4', 2, NULL, NULL, NULL, NULL),
    (173, 'R16', NULL, '2027-03-17 19:00:00', 'R16-5', 2, NULL, NULL, NULL, NULL),
    (174, 'R16', NULL, '2027-03-17 19:00:00', 'R16-6', 2, NULL, NULL, NULL, NULL),
    (175, 'R16', NULL, '2027-03-17 19:00:00', 'R16-7', 2, NULL, NULL, NULL, NULL),
    (176, 'R16', NULL, '2027-03-17 19:00:00', 'R16-8', 2, NULL, NULL, NULL, NULL) ON CONFLICT ON CONSTRAINT "games_pdf_pkey" DO NOTHING;
INSERT INTO "lm2026-27"."games_pdf" ("game_number", "phase", "round_no", "starts_at", "tie_id", "leg", "venue", "flashscore_url", "home_team_id", "away_team_id") VALUES
    (177, 'QF', NULL, '2027-04-06 17:00:00', 'QF-1', 1, NULL, NULL, NULL, NULL),
    (178, 'QF', NULL, '2027-04-06 17:00:00', 'QF-2', 1, NULL, NULL, NULL, NULL),
    (179, 'QF', NULL, '2027-04-07 17:00:00', 'QF-3', 1, NULL, NULL, NULL, NULL),
    (180, 'QF', NULL, '2027-04-07 17:00:00', 'QF-4', 1, NULL, NULL, NULL, NULL),
    (181, 'QF', NULL, '2027-04-13 17:00:00', 'QF-1', 2, NULL, NULL, NULL, NULL),
    (182, 'QF', NULL, '2027-04-13 17:00:00', 'QF-2', 2, NULL, NULL, NULL, NULL),
    (183, 'QF', NULL, '2027-04-14 17:00:00', 'QF-3', 2, NULL, NULL, NULL, NULL),
    (184, 'QF', NULL, '2027-04-14 17:00:00', 'QF-4', 2, NULL, NULL, NULL, NULL),
    (185, 'SF', NULL, '2027-04-27 17:00:00', 'SF-1', 1, NULL, NULL, NULL, NULL),
    (186, 'SF', NULL, '2027-04-28 17:00:00', 'SF-2', 1, NULL, NULL, NULL, NULL),
    (187, 'SF', NULL, '2027-05-04 17:00:00', 'SF-1', 2, NULL, NULL, NULL, NULL),
    (188, 'SF', NULL, '2027-05-05 17:00:00', 'SF-2', 2, NULL, NULL, NULL, NULL),
    (189, 'F', NULL, '2027-06-05 17:00:00', NULL, NULL, 'Estadio Metropolitano, Madrid', NULL, NULL, NULL),
    (82, 'LEAGUE', 5, '2026-11-25 16:45:00', NULL, NULL, 'Bank Respublika Arena', 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/sabah-baku-fNGcxbyr/?mid=QqI3ne15', 62, 5),
    (83, 'LEAGUE', 5, '2026-11-25 16:45:00', NULL, NULL, 'Fortuna Arena', 'https://www.flashscore.com/match/football/slavia-prague-viXGgnyB/villarreal-lUatW5jE/?mid=vJEGXMRG', 26, 29),
    (84, 'LEAGUE', 5, '2026-11-25 19:00:00', NULL, NULL, 'Metropolitano Stadium', 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/viking-bXAgOWwb/?mid=zwfT2Gon', 3, 33),
    (85, 'LEAGUE', 5, '2026-11-25 19:00:00', NULL, NULL, 'Jan Breydel Stadion', 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/liverpool-lId4TMwf/?mid=6wSZISyp', 7, 15),
    (86, 'LEAGUE', 5, '2026-11-25 19:00:00', NULL, NULL, 'Stadio Giuseppe Meazza (San Siro)', 'https://www.flashscore.com/match/football/inter-Iw7eKK25/vfb-stuttgart-nJQmYp1B/?mid=xn4kY4te', 11, 28),
    (1, 'LEAGUE', 1, '2026-09-08 14:45:00', NULL, NULL, 'Allwyn Arena', 'https://www.flashscore.com/match/football/aek-ANpZncAM/lask-linz-MipWYeKQ/?mid=EgODGq9F', 30, 32),
    (2, 'LEAGUE', 1, '2026-09-08 14:45:00', NULL, NULL, 'Jan Breydel Stadion', 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/club-brugge-rgTHIK74/?mid=hYMyrzBC', 7, 2),
    (3, 'LEAGUE', 1, '2026-09-08 17:00:00', NULL, NULL, 'Signal Iduna Park', 'https://www.flashscore.com/match/football/dortmund-nP1i5US1/villarreal-lUatW5jE/?mid=lGdh9XQ8', 4, 29),
    (4, 'LEAGUE', 1, '2026-09-08 17:00:00', NULL, NULL, 'Estádio do Dragão', 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/manchester-city-Wtn9Stg0/?mid=SYL9LRdk', 20, 16),
    (5, 'LEAGUE', 1, '2026-09-08 17:00:00', NULL, NULL, 'Stade Pierre-Mauroy', 'https://www.flashscore.com/match/football/betis-vJbTeCGP/lille-pfDZL71o/?mid=StY6NNoJ', 14, 22),
    (6, 'LEAGUE', 1, '2026-09-08 17:00:00', NULL, NULL, 'Estadio Santiago Bernabéu', 'https://www.flashscore.com/match/football/inter-Iw7eKK25/real-madrid-W8mj7MDD/?mid=foBRjez1', 23, 11),
    (7, 'LEAGUE', 1, '2026-09-09 14:45:00', NULL, NULL, 'Camp Nou', 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/feyenoord-8zjySeoN/?mid=nD1UprQ0', 5, 9),
    (8, 'LEAGUE', 1, '2026-09-09 14:45:00', NULL, NULL, 'MHPArena', 'https://www.flashscore.com/match/football/vfb-stuttgart-nJQmYp1B/viking-bXAgOWwb/?mid=xUAf7KE4', 28, 33),
    (9, 'LEAGUE', 1, '2026-09-09 17:00:00', NULL, NULL, 'Anfield', 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/liverpool-lId4TMwf/?mid=6aa0PFtQ', 15, 3),
    (10, 'LEAGUE', 1, '2026-09-09 17:00:00', NULL, NULL, 'Stadio Diego Armando Maradona', 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/napoli-69Dxbc61/?mid=juiAv14K', 18, 1),
    (11, 'LEAGUE', 1, '2026-09-09 17:00:00', NULL, NULL, 'Parc des Princes', 'https://www.flashscore.com/match/football/psg-CjhkPw0k/slovan-bratislava-QRaWdwQf/?mid=vRfGDXa4', 19, 61),
    (12, 'LEAGUE', 1, '2026-09-09 17:00:00', NULL, NULL, 'Estádio José Alvalade', 'https://www.flashscore.com/match/football/galatasaray-riaqqurF/sporting-cp-tljXuHBC/?mid=QaIiWiUj', 27, 10),
    (13, 'LEAGUE', 1, '2026-09-10 14:45:00', NULL, NULL, 'Chobani Stadium Fenerbahce Sukru Saracoglu', 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/fenerbahce-MsbmracL/?mid=p4qtPzNN', 45, 24),
    (87, 'LEAGUE', 5, '2026-11-25 19:00:00', NULL, NULL, 'Stade Pierre-Mauroy', 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/lille-pfDZL71o/?mid=CfLLoIBm', 14, 6),
    (88, 'LEAGUE', 5, '2026-11-25 19:00:00', NULL, NULL, 'Parc des Princes', 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/psg-CjhkPw0k/?mid=v74Mijwo', 19, 24),
    (89, 'LEAGUE', 5, '2026-11-25 19:00:00', NULL, NULL, 'Stamford Bridge', 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/shakhtar-4ENWX2OA/?mid=rB9Y2j5S', 25, 45),
    (90, 'LEAGUE', 5, '2026-11-25 19:00:00', NULL, NULL, 'Estádio José Alvalade', 'https://www.flashscore.com/match/football/manchester-united-ppjDR086/sporting-cp-tljXuHBC/?mid=CEDJzDKq', 27, 17),
    (91, 'LEAGUE', 6, '2026-12-08 16:45:00', NULL, NULL, 'Lyse Arena', 'https://www.flashscore.com/match/football/feyenoord-8zjySeoN/viking-bXAgOWwb/?mid=f3UMmZHE', 33, 9),
    (92, 'LEAGUE', 6, '2026-12-08 16:45:00', NULL, NULL, 'Estadio de la Ceramica', 'https://www.flashscore.com/match/football/sabah-baku-fNGcxbyr/villarreal-lUatW5jE/?mid=65G8Zrc4', 29, 62),
    (93, 'LEAGUE', 6, '2026-12-08 19:00:00', NULL, NULL, 'Allwyn Arena', 'https://www.flashscore.com/match/football/aek-ANpZncAM/galatasaray-riaqqurF/?mid=baJ0tiAl', 30, 10),
    (94, 'LEAGUE', 6, '2026-12-08 19:00:00', NULL, NULL, 'Stadio Olimpico', 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/sporting-cp-tljXuHBC/?mid=0Irves6b', 24, 27),
    (95, 'LEAGUE', 6, '2026-12-08 19:00:00', NULL, NULL, 'Villa Park', 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/psg-CjhkPw0k/?mid=QsgOBBUG', 2, 19),
    (96, 'LEAGUE', 6, '2026-12-08 19:00:00', NULL, NULL, 'Camp Nou', 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/manchester-city-Wtn9Stg0/?mid=Qmhi7GKs', 5, 16),
    (97, 'LEAGUE', 6, '2026-12-08 19:00:00', NULL, NULL, 'Allianz Arena', 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/slavia-prague-viXGgnyB/?mid=zFs4TzdJ', 6, 26),
    (98, 'LEAGUE', 6, '2026-12-08 19:00:00', NULL, NULL, 'Old Trafford', 'https://www.flashscore.com/match/football/manchester-united-ppjDR086/rb-leipzig-KbS1suSm/?mid=tQRcsIxh', 17, 12),
    (99, 'LEAGUE', 6, '2026-12-08 19:00:00', NULL, NULL, 'Stadio Diego Armando Maradona', 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/napoli-69Dxbc61/?mid=ld6bmj4k', 18, 7),
    (100, 'LEAGUE', 6, '2026-12-09 16:45:00', NULL, NULL, 'Estadio de La Cartuja', 'https://www.flashscore.com/match/football/betis-vJbTeCGP/como-ttyLthOA/?mid=KGUbPqH6', 22, 8),
    (101, 'LEAGUE', 6, '2026-12-09 16:45:00', NULL, NULL, 'Tehelné pole', 'https://www.flashscore.com/match/football/shakhtar-4ENWX2OA/slovan-bratislava-QRaWdwQf/?mid=08D0y5Si', 61, 25),
    (102, 'LEAGUE', 6, '2026-12-09 19:00:00', NULL, NULL, 'Emirates Stadium', 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/real-madrid-W8mj7MDD/?mid=2BEZlZ4D', 1, 23),
    (103, 'LEAGUE', 6, '2026-12-09 19:00:00', NULL, NULL, 'Signal Iduna Park', 'https://www.flashscore.com/match/football/dortmund-nP1i5US1/inter-Iw7eKK25/?mid=ADHdWrB7', 4, 11),
    (104, 'LEAGUE', 6, '2026-12-09 19:00:00', NULL, NULL, 'Raiffeisen Arena', 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/lask-linz-MipWYeKQ/?mid=zkKTRiee', 32, 45),
    (105, 'LEAGUE', 6, '2026-12-09 19:00:00', NULL, NULL, 'Stade Bollaert-Delelis', 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/lens-IBmris38/?mid=hrpdDht2', 13, 34),
    (106, 'LEAGUE', 6, '2026-12-09 19:00:00', NULL, NULL, 'Anfield', 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/liverpool-lId4TMwf/?mid=dpzlSWEc', 15, 20),
    (107, 'LEAGUE', 6, '2026-12-09 19:00:00', NULL, NULL, 'Philips Stadion', 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/psv-M9UEHJWi/?mid=r3cy1fGb', 21, 3),
    (108, 'LEAGUE', 6, '2026-12-09 19:00:00', NULL, NULL, 'MHPArena', 'https://www.flashscore.com/match/football/lille-pfDZL71o/vfb-stuttgart-nJQmYp1B/?mid=GIbYfjPs', 28, 14),
    (109, 'LEAGUE', 7, '2027-01-19 16:45:00', NULL, NULL, 'Aspmyra Stadion', 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/bodo-glimt-S0WZMUNG/?mid=zBFraYpB', 34, 3),
    (110, 'LEAGUE', 7, '2027-01-19 16:45:00', NULL, NULL, 'Rams Park', 'https://www.flashscore.com/match/football/feyenoord-8zjySeoN/galatasaray-riaqqurF/?mid=v1XuClat', 10, 9),
    (111, 'LEAGUE', 7, '2027-01-19 19:00:00', NULL, NULL, 'Allwyn Arena', 'https://www.flashscore.com/match/football/aek-ANpZncAM/as-roma-zVqqL0ma/?mid=GnzCJEpo', 30, 24),
    (112, 'LEAGUE', 7, '2027-01-19 19:00:00', NULL, NULL, 'Villa Park', 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/dortmund-nP1i5US1/?mid=IB86tri5', 2, 4),
    (113, 'LEAGUE', 7, '2027-01-19 19:00:00', NULL, NULL, 'Estádio do Dragão', 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/slavia-prague-viXGgnyB/?mid=YupYLAAE', 20, 26),
    (114, 'LEAGUE', 7, '2027-01-19 19:00:00', NULL, NULL, 'Stadio Giuseppe Meazza (San Siro)', 'https://www.flashscore.com/match/football/inter-Iw7eKK25/liverpool-lId4TMwf/?mid=bF5b5fkf', 11, 15),
    (115, 'LEAGUE', 7, '2027-01-19 19:00:00', NULL, NULL, 'Stade Pierre-Mauroy', 'https://www.flashscore.com/match/football/lille-pfDZL71o/slovan-bratislava-QRaWdwQf/?mid=pz820C1K', 14, 61),
    (116, 'LEAGUE', 7, '2027-01-19 19:00:00', NULL, NULL, 'Estadio Santiago Bernabéu', 'https://www.flashscore.com/match/football/lask-linz-MipWYeKQ/real-madrid-W8mj7MDD/?mid=dQ1hWNgA', 23, 32),
    (117, 'LEAGUE', 7, '2027-01-19 19:00:00', NULL, NULL, 'MHPArena', 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/vfb-stuttgart-nJQmYp1B/?mid=dM96oUY1', 28, 7),
    (118, 'LEAGUE', 7, '2027-01-20 16:45:00', NULL, NULL, 'Chobani Stadium Fenerbahce Sukru Saracoglu', 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/villarreal-lUatW5jE/?mid=fXXe3KG8', 45, 29),
    (119, 'LEAGUE', 7, '2027-01-20 16:45:00', NULL, NULL, 'Bank Respublika Arena', 'https://www.flashscore.com/match/football/napoli-69Dxbc61/sabah-baku-fNGcxbyr/?mid=vwLGx99D', 62, 18),
    (120, 'LEAGUE', 7, '2027-01-20 19:00:00', NULL, NULL, 'Estadio de La Cartuja', 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/betis-vJbTeCGP/?mid=Q1aOGcCD', 22, 1),
    (121, 'LEAGUE', 7, '2027-01-20 19:00:00', NULL, NULL, 'Mapei Stadium / Stadio Giuseppe Sinigaglia', 'https://www.flashscore.com/match/football/como-ttyLthOA/psg-CjhkPw0k/?mid=Uwr24TMj', 8, 19),
    (122, 'LEAGUE', 7, '2027-01-20 19:00:00', NULL, NULL, 'Stade Bollaert-Delelis', 'https://www.flashscore.com/match/football/lens-IBmris38/manchester-city-Wtn9Stg0/?mid=QPB3s9J8', 13, 16),
    (123, 'LEAGUE', 7, '2027-01-20 19:00:00', NULL, NULL, 'Old Trafford', 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/manchester-united-ppjDR086/?mid=tCUkivlQ', 17, 6),
    (124, 'LEAGUE', 7, '2027-01-20 19:00:00', NULL, NULL, 'Red Bull Arena', 'https://www.flashscore.com/match/football/rb-leipzig-KbS1suSm/shakhtar-4ENWX2OA/?mid=vse4cUSk', 12, 25),
    (125, 'LEAGUE', 7, '2027-01-20 19:00:00', NULL, NULL, 'Estádio José Alvalade', 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/sporting-cp-tljXuHBC/?mid=p6Gmjw2t', 27, 5),
    (126, 'LEAGUE', 7, '2027-01-20 19:00:00', NULL, NULL, 'MHPArena', 'https://www.flashscore.com/match/football/psv-M9UEHJWi/viking-bXAgOWwb/?mid=zo6Q4CzG', 33, 21),
    (127, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Emirates Stadium', 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/sabah-baku-fNGcxbyr/?mid=IydGIJs1', 1, 62),
    (128, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Stadio Olimpico', 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/lille-pfDZL71o/?mid=4QsQSINb', 24, 14),
    (129, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Metropolitano Stadium', 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/fenerbahce-MsbmracL/?mid=KQJJrD0U', 3, 45),
    (130, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Camp Nou', 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/como-ttyLthOA/?mid=KQaxqMfD', 5, 8),
    (131, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Allianz Arena', 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/betis-vJbTeCGP/?mid=fytlXIdf', 6, 22),
    (132, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Jan Breydel Stadion', 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/club-brugge-rgTHIK74/?mid=Kb7LfYBF', 7, 34),
    (133, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Signal Iduna Park', 'https://www.flashscore.com/match/football/aek-ANpZncAM/dortmund-nP1i5US1/?mid=dt007BeL', 4, 30),
    (134, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'De Kuip', 'https://www.flashscore.com/match/football/feyenoord-8zjySeoN/rb-leipzig-KbS1suSm/?mid=QB6x3BMP', 9, 12),
    (135, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Raiffeisen Arena', 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/lask-linz-MipWYeKQ/?mid=GSTBES2l', 32, 20),
    (136, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Anfield', 'https://www.flashscore.com/match/football/lens-IBmris38/liverpool-lId4TMwf/?mid=zey4OlEM', 15, 13),
    (137, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Etihad Stadium', 'https://www.flashscore.com/match/football/manchester-city-Wtn9Stg0/sporting-cp-tljXuHBC/?mid=GCTNUVZ2', 16, 27),
    (138, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Stadio Diego Armando Maradona', 'https://www.flashscore.com/match/football/napoli-69Dxbc61/viking-bXAgOWwb/?mid=6PM8vVv1', 18, 33),
    (139, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Parc des Princes', 'https://www.flashscore.com/match/football/galatasaray-riaqqurF/psg-CjhkPw0k/?mid=6Dd8FgVi', 19, 10),
    (140, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Philips Stadion', 'https://www.flashscore.com/match/football/psv-M9UEHJWi/vfb-stuttgart-nJQmYp1B/?mid=zRFWrVDd', 21, 28),
    (141, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Stamford Bridge', 'https://www.flashscore.com/match/football/real-madrid-W8mj7MDD/shakhtar-4ENWX2OA/?mid=zZeWOunp', 25, 23),
    (142, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Fortuna Arena', 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/slavia-prague-viXGgnyB/?mid=vwTrTRHs', 26, 2),
    (143, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Tehelné pole', 'https://www.flashscore.com/match/football/inter-Iw7eKK25/slovan-bratislava-QRaWdwQf/?mid=AX7jhQXQ', 61, 11),
    (144, 'LEAGUE', 8, '2027-01-27 19:00:00', NULL, NULL, 'Estadio de la Ceramica', 'https://www.flashscore.com/match/football/manchester-united-ppjDR086/villarreal-lUatW5jE/?mid=M3TDwzxH', 29, 17) ON CONFLICT ON CONSTRAINT "games_pdf_pkey" DO NOTHING;

-- ── lm2026-27.games ────────────────────────────────
CREATE TABLE IF NOT EXISTS "lm2026-27"."games" (
    "game_id" INTEGER NOT NULL,
    "home_team_id" INTEGER,
    "away_team_id" INTEGER,
    "start_time" TIMESTAMP NOT NULL,
    "venue" VARCHAR(100) NOT NULL DEFAULT ''::character varying,
    "flashscore_url" VARCHAR(500),
    "tips_open" BOOLEAN NOT NULL DEFAULT true,
    "home_score_regular" INTEGER,
    "away_score_regular" INTEGER,
    "home_score_final" INTEGER,
    "away_score_final" INTEGER,
    "home_points" INTEGER,
    "away_points" INTEGER,
    "result_approved" BOOLEAN NOT NULL DEFAULT false,
    "game_type_code" VARCHAR(20) NOT NULL,
    "game_type_name" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    "ls_home" INTEGER,
    "ls_away" INTEGER,
    "ls_status" VARCHAR(30),
    "ls_updated_at" TIMESTAMP,
    "ls_next_poll" TIMESTAMP,
    "tie_id" VARCHAR(20),
    "leg" SMALLINT,
    "home_score_halftime" SMALLINT,
    "away_score_halftime" SMALLINT
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games'
                      AND con.conname = 'games_pkey') THEN
        ALTER TABLE "lm2026-27"."games" ADD CONSTRAINT "games_pkey" PRIMARY KEY (game_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games'
                      AND con.conname = 'ucl_games_halftime_check') THEN
        ALTER TABLE "lm2026-27"."games" ADD CONSTRAINT "ucl_games_halftime_check" CHECK ((((home_score_halftime IS NULL) OR ((home_score_halftime >= 0) AND (home_score_halftime <= 99))) AND ((away_score_halftime IS NULL) OR ((away_score_halftime >= 0) AND (away_score_halftime <= 99)))));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games'
                      AND con.conname = 'ucl_games_leg_check') THEN
        ALTER TABLE "lm2026-27"."games" ADD CONSTRAINT "ucl_games_leg_check" CHECK (((leg IS NULL) OR (leg = ANY (ARRAY[1, 2]))));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games'
                      AND con.conname = 'games_away_team_id_fkey') THEN
        ALTER TABLE "lm2026-27"."games" ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY (away_team_id) REFERENCES admin.uefa_clubs(club_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'games'
                      AND con.conname = 'games_home_team_id_fkey') THEN
        ALTER TABLE "lm2026-27"."games" ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY (home_team_id) REFERENCES admin.uefa_clubs(club_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS ucl_games_phase_idx ON "lm2026-27".games USING btree (game_type_code);
CREATE INDEX IF NOT EXISTS ucl_games_start_idx ON "lm2026-27".games USING btree (start_time, game_id);
CREATE INDEX IF NOT EXISTS ucl_games_tie_idx ON "lm2026-27".games USING btree (tie_id, leg);

-- ── lm2026-27.group_standings ──────────────────────
CREATE TABLE IF NOT EXISTS "lm2026-27"."group_standings" (
    "phase" VARCHAR(10) NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "gp" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 0,
    "d" INTEGER NOT NULL DEFAULT 0,
    "l" INTEGER NOT NULL DEFAULT 0,
    "gf" INTEGER NOT NULL DEFAULT 0,
    "ga" INTEGER NOT NULL DEFAULT 0,
    "pts" INTEGER NOT NULL DEFAULT 0,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    "team_id" INTEGER NOT NULL
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'group_standings'
                      AND con.conname = 'group_standings_pkey') THEN
        ALTER TABLE "lm2026-27"."group_standings" ADD CONSTRAINT "group_standings_pkey" PRIMARY KEY (phase, team_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'group_standings'
                      AND con.conname = 'group_standings_team_id_fkey') THEN
        ALTER TABLE "lm2026-27"."group_standings" ADD CONSTRAINT "group_standings_team_id_fkey" FOREIGN KEY (team_id) REFERENCES admin.uefa_clubs(club_id);
    END IF;
END $$;

-- ── lm2026-27.tips ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "lm2026-27"."tips" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "game_id" INTEGER NOT NULL,
    "home_score_tip" INTEGER NOT NULL,
    "away_score_tip" INTEGER NOT NULL,
    "points_earned" INTEGER,
    "entered_by_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'tips'
                      AND con.conname = 'tips_pkey') THEN
        ALTER TABLE "lm2026-27"."tips" ADD CONSTRAINT "tips_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'tips'
                      AND con.conname = 'tips_user_id_game_id_key') THEN
        ALTER TABLE "lm2026-27"."tips" ADD CONSTRAINT "tips_user_id_game_id_key" UNIQUE (user_id, game_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'tips'
                      AND con.conname = 'tips_game_id_fkey') THEN
        ALTER TABLE "lm2026-27"."tips" ADD CONSTRAINT "tips_game_id_fkey" FOREIGN KEY (game_id) REFERENCES "lm2026-27".games(game_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace
                    WHERE ns.nspname = 'lm2026-27' AND rel.relname = 'tips'
                      AND con.conname = 'tips_user_id_fkey') THEN
        ALTER TABLE "lm2026-27"."tips" ADD CONSTRAINT "tips_user_id_fkey" FOREIGN KEY (user_id) REFERENCES admin.users(id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS ucl_tips_game_idx ON "lm2026-27".tips USING btree (game_id);
CREATE INDEX IF NOT EXISTS ucl_tips_user_idx ON "lm2026-27".tips USING btree (user_id);

-- ── Prava aplikacneho pouzivatela ──────────────────────
-- Aplikacia sa pripaja ako dbbet-admin a potrebuje DML nad vsetkym v schéme.
GRANT USAGE ON SCHEMA "lm2026-27" TO "dbbet-admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "lm2026-27" TO "dbbet-admin";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "lm2026-27" TO "dbbet-admin";
ALTER DEFAULT PRIVILEGES IN SCHEMA "lm2026-27"
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "dbbet-admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON admin.countries, admin.uefa_clubs,
      admin.group_viewers, admin.livescore_log TO "dbbet-admin";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA admin TO "dbbet-admin";

-- ── Skryte skupiny ─────────────────────────────────────
-- friend_groups uz na produkcii existuje, pribuda jediny stlpec.
ALTER TABLE admin.friend_groups
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public';

INSERT INTO admin.schema_versions (version, description) VALUES
    (70, 'UCL 2026/27 - nasadenie do produkcie (nahrada za 044-069)')
    ON CONFLICT DO NOTHING;

COMMIT;
