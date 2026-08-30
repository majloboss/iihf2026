-- Migration 066: URL zapasov a stadiony do games_pdf
--
-- Migracia iba aktualizuje riadky, takze ju zvladne aj tools/run_migration.cjs
-- (po migracii 064, ktora dala aplikacnemu pouzivatelovi potrebne prava).
--
-- Zdroj: sources/lm2026-27/lm_url.csv — ku kazdemu zapasu ligovej fazy odkaz na
-- Flashscore a stadion. Overene skriptom tools/check_lm_url_csv.cjs proti
-- rozpisu z PDF: 144 zapasov, dvojice, datumy aj casy sa zhoduju.
--
-- Stadion sa uklada ku KAZDEMU zapasu, nie ku klubu. Klub totiz nemusi hrat
-- doma na svojom stadione: Viking hostí PSV 20.01.2027 na MHPArena v Stuttgarte,
-- kym zvysne tri domace zapasy hra na Lyse Arena.
--
-- Vyradovacia cast tu nie je — kluby ani dejiska sa dozvieme az po zrebe.
-- Vynimkou je finale, ktoreho stadion uz zapisala migracia 062.

BEGIN;

UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aek-ANpZncAM/lask-linz-MipWYeKQ/?mid=EgODGq9F',
       venue = 'Allwyn Arena' WHERE game_number = 1; -- AEK Athens - LASK
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/club-brugge-rgTHIK74/?mid=hYMyrzBC',
       venue = 'Jan Breydel Stadion' WHERE game_number = 2; -- Club Brugge KV - Aston Villa
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/dortmund-nP1i5US1/villarreal-lUatW5jE/?mid=lGdh9XQ8',
       venue = 'Signal Iduna Park' WHERE game_number = 3; -- Dortmund - Villarreal
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/manchester-city-Wtn9Stg0/?mid=SYL9LRdk',
       venue = 'Estádio do Dragão' WHERE game_number = 4; -- FC Porto - Manchester City
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/betis-vJbTeCGP/lille-pfDZL71o/?mid=StY6NNoJ',
       venue = 'Stade Pierre-Mauroy' WHERE game_number = 5; -- Lille - Betis
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/inter-Iw7eKK25/real-madrid-W8mj7MDD/?mid=foBRjez1',
       venue = 'Estadio Santiago Bernabéu' WHERE game_number = 6; -- Real Madrid - Inter
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/feyenoord-8zjySeoN/?mid=nD1UprQ0',
       venue = 'Camp Nou' WHERE game_number = 7; -- Barcelona - Feyenoord
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/vfb-stuttgart-nJQmYp1B/viking-bXAgOWwb/?mid=xUAf7KE4',
       venue = 'MHPArena' WHERE game_number = 8; -- Stuttgart - Viking
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/liverpool-lId4TMwf/?mid=6aa0PFtQ',
       venue = 'Anfield' WHERE game_number = 9; -- Liverpool - Atl. Madrid
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/napoli-69Dxbc61/?mid=juiAv14K',
       venue = 'Stadio Diego Armando Maradona' WHERE game_number = 10; -- Napoli - Arsenal
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/psg-CjhkPw0k/slovan-bratislava-QRaWdwQf/?mid=vRfGDXa4',
       venue = 'Parc des Princes' WHERE game_number = 11; -- PSG - Slovan Bratislava
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/galatasaray-riaqqurF/sporting-cp-tljXuHBC/?mid=QaIiWiUj',
       venue = 'Estádio José Alvalade' WHERE game_number = 12; -- Sporting CP - Galatasaray
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/fenerbahce-MsbmracL/?mid=p4qtPzNN',
       venue = 'Chobani Stadium Fenerbahce Sukru Saracoglu' WHERE game_number = 13; -- Fenerbahce - AS Roma
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/psv-M9UEHJWi/shakhtar-4ENWX2OA/?mid=UTCOpiqp',
       venue = 'Philips Stadion' WHERE game_number = 14; -- PSV - Shakhtar Donetsk
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/bodo-glimt-S0WZMUNG/?mid=21qdVdR6',
       venue = 'Allianz Arena' WHERE game_number = 15; -- Bayern Munich - Bodo/Glimt
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/como-ttyLthOA/rb-leipzig-KbS1suSm/?mid=WhVkZZ2L',
       venue = 'Mapei Stadium / Stadio Giuseppe Sinigaglia' WHERE game_number = 16; -- Como - RB Leipzig
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/manchester-united-ppjDR086/sabah-baku-fNGcxbyr/?mid=EwQ5ud74',
       venue = 'Old Trafford' WHERE game_number = 17; -- Manchester Utd - Sabah Baku
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lens-IBmris38/slavia-prague-viXGgnyB/?mid=YepM57w0',
       venue = 'Fortuna Arena' WHERE game_number = 18; -- Slavia Prague - Lens
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lens-IBmris38/sporting-cp-tljXuHBC/?mid=boMhjDLM',
       venue = 'Stade Bollaert-Delelis' WHERE game_number = 19; -- Lens - Sporting CP
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/sabah-baku-fNGcxbyr/slavia-prague-viXGgnyB/?mid=69rU3o8C',
       venue = 'Bank Respublika Arena' WHERE game_number = 20; -- Sabah Baku - Slavia Prague
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/lille-pfDZL71o/?mid=pOc8KuDl',
       venue = 'Emirates Stadium' WHERE game_number = 21; -- Arsenal - Lille
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/manchester-united-ppjDR086/?mid=C0GBpZVH',
       venue = 'Metropolitano Stadium' WHERE game_number = 22; -- Atl. Madrid - Manchester Utd
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/galatasaray-riaqqurF/?mid=hWJelHWh',
       venue = 'Rams Park' WHERE game_number = 23; -- Galatasaray - Barcelona
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/inter-Iw7eKK25/?mid=YkFBumlL',
       venue = 'Stadio Giuseppe Meazza (San Siro)' WHERE game_number = 24; -- Inter - Club Brugge KV
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/psv-M9UEHJWi/rb-leipzig-KbS1suSm/?mid=SK2I6Y53',
       venue = 'Red Bull Arena' WHERE game_number = 25; -- RB Leipzig - PSV
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/viking-bXAgOWwb/?mid=p8JTqdt0',
       venue = 'Lyse Arena' WHERE game_number = 26; -- Viking - Bayern Munich
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/napoli-69Dxbc61/villarreal-lUatW5jE/?mid=QcgCe8c2',
       venue = 'Estadio de la Ceramica' WHERE game_number = 27; -- Villarreal - Napoli
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/como-ttyLthOA/feyenoord-8zjySeoN/?mid=rFNyQVP7',
       venue = 'De Kuip' WHERE game_number = 28; -- Feyenoord - Como
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lask-linz-MipWYeKQ/liverpool-lId4TMwf/?mid=6cITvAb3',
       venue = 'Raiffeisen Arena' WHERE game_number = 29; -- LASK - Liverpool
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/real-madrid-W8mj7MDD/?mid=4j50U1OM',
       venue = 'Stadio Olimpico' WHERE game_number = 30; -- AS Roma - Real Madrid
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/fenerbahce-MsbmracL/?mid=OhXJC6X0',
       venue = 'Villa Park' WHERE game_number = 31; -- Aston Villa - Fenerbahce
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/betis-vJbTeCGP/fc-porto-S2NmScGp/?mid=xt5Mx0jU',
       venue = 'Estadio de La Cartuja' WHERE game_number = 32; -- Betis - FC Porto
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/dortmund-nP1i5US1/?mid=QejW1kJr',
       venue = 'Aspmyra Stadion' WHERE game_number = 33; -- Bodo/Glimt - Dortmund
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/manchester-city-Wtn9Stg0/psg-CjhkPw0k/?mid=UH6LCxcK',
       venue = 'Etihad Stadium' WHERE game_number = 34; -- Manchester City - PSG
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aek-ANpZncAM/shakhtar-4ENWX2OA/?mid=Y1LED1zo',
       venue = 'Stamford Bridge' WHERE game_number = 35; -- Shakhtar Donetsk - AEK Athens
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/slovan-bratislava-QRaWdwQf/vfb-stuttgart-nJQmYp1B/?mid=pfE25bqH',
       venue = 'Tehelné pole' WHERE game_number = 36; -- Slovan Bratislava - Stuttgart
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/slavia-prague-viXGgnyB/?mid=2yMLTDQr',
       venue = 'Chobani Stadium Fenerbahce Sukru Saracoglu' WHERE game_number = 37; -- Fenerbahce - Slavia Prague
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/dortmund-nP1i5US1/sabah-baku-fNGcxbyr/?mid=b9lv0Tme',
       venue = 'Bank Respublika Arena' WHERE game_number = 38; -- Sabah Baku - Dortmund
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/slovan-bratislava-QRaWdwQf/?mid=CjoYQdhB',
       venue = 'Stadio Olimpico' WHERE game_number = 39; -- AS Roma - Slovan Bratislava
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/psv-M9UEHJWi/?mid=jP6EvMLH',
       venue = 'Estádio do Dragão' WHERE game_number = 40; -- FC Porto - PSV
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/liverpool-lId4TMwf/villarreal-lUatW5jE/?mid=2swdQAqA',
       venue = 'Anfield' WHERE game_number = 41; -- Liverpool - Villarreal
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aek-ANpZncAM/manchester-city-Wtn9Stg0/?mid=djVwRmZR',
       venue = 'Etihad Stadium' WHERE game_number = 42; -- Manchester City - AEK Athens
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/napoli-69Dxbc61/?mid=QiGrsUa6',
       venue = 'Stadio Diego Armando Maradona' WHERE game_number = 43; -- Napoli - Bodo/Glimt
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/psg-CjhkPw0k/?mid=6u963YJ6',
       venue = 'Parc des Princes' WHERE game_number = 44; -- PSG - Barcelona
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/vfb-stuttgart-nJQmYp1B/?mid=8ODjcCFN',
       venue = 'MHPArena' WHERE game_number = 45; -- Stuttgart - Atl. Madrid
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/como-ttyLthOA/manchester-united-ppjDR086/?mid=UTWLyE6T',
       venue = 'Mapei Stadium / Stadio Giuseppe Sinigaglia' WHERE game_number = 46; -- Como - Manchester Utd
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/galatasaray-riaqqurF/lille-pfDZL71o/?mid=nRzlASTh',
       venue = 'Stade Pierre-Mauroy' WHERE game_number = 47; -- Lille - Galatasaray
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/viking-bXAgOWwb/?mid=d6VRAp2D',
       venue = 'Villa Park' WHERE game_number = 48; -- Aston Villa - Viking
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/bayern-munich-nVp0wiqd/?mid=OIffEkYO',
       venue = 'Allianz Arena' WHERE game_number = 49; -- Bayern Munich - Arsenal
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/betis-vJbTeCGP/feyenoord-8zjySeoN/?mid=CjRjR5nf',
       venue = 'Estadio de La Cartuja' WHERE game_number = 50; -- Betis - Feyenoord
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/lens-IBmris38/?mid=hC5ThCtS',
       venue = 'Jan Breydel Stadion' WHERE game_number = 51; -- Club Brugge KV - Lens
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/inter-Iw7eKK25/shakhtar-4ENWX2OA/?mid=4Y5szRBr',
       venue = 'Stadio Giuseppe Meazza (San Siro)' WHERE game_number = 52; -- Inter - Shakhtar Donetsk
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/rb-leipzig-KbS1suSm/real-madrid-W8mj7MDD/?mid=OC3pYqPc',
       venue = 'Estadio Santiago Bernabéu' WHERE game_number = 53; -- Real Madrid - RB Leipzig
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lask-linz-MipWYeKQ/sporting-cp-tljXuHBC/?mid=I7KxfeMc',
       venue = 'Estádio José Alvalade' WHERE game_number = 54; -- Sporting CP - LASK
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/galatasaray-riaqqurF/vfb-stuttgart-nJQmYp1B/?mid=SGSUoDnR',
       venue = 'Rams Park' WHERE game_number = 55; -- Galatasaray - Stuttgart
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/shakhtar-4ENWX2OA/sporting-cp-tljXuHBC/?mid=QXNphZjA',
       venue = 'Stamford Bridge' WHERE game_number = 56; -- Shakhtar Donetsk - Sporting CP
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/bayern-munich-nVp0wiqd/?mid=vg7E1ClJ',
       venue = 'Metropolitano Stadium' WHERE game_number = 57; -- Atl. Madrid - Bayern Munich
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/barcelona-SKbpVP5K/?mid=tGbMn4el',
       venue = 'Camp Nou' WHERE game_number = 58; -- Barcelona - Aston Villa
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/lille-pfDZL71o/?mid=YqbyqjVg',
       venue = 'Aspmyra Stadion' WHERE game_number = 59; -- Bodo/Glimt - Lille
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/feyenoord-8zjySeoN/inter-Iw7eKK25/?mid=xK9rfn3E',
       venue = 'De Kuip' WHERE game_number = 60; -- Feyenoord - Inter
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lask-linz-MipWYeKQ/slovan-bratislava-QRaWdwQf/?mid=6TK5I5v3',
       venue = 'Raiffeisen Arena' WHERE game_number = 61; -- LASK - Slovan Bratislava
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/manchester-united-ppjDR086/?mid=8rnngLzB',
       venue = 'Old Trafford' WHERE game_number = 62; -- Manchester Utd - AS Roma
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/psg-CjhkPw0k/villarreal-lUatW5jE/?mid=Y7dW9kaT',
       venue = 'Estadio de la Ceramica' WHERE game_number = 63; -- Villarreal - PSG
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aek-ANpZncAM/real-madrid-W8mj7MDD/?mid=8nfvNJGd',
       venue = 'Allwyn Arena' WHERE game_number = 64; -- AEK Athens - Real Madrid
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/liverpool-lId4TMwf/?mid=E3VsH66d',
       venue = 'Chobani Stadium Fenerbahce Sukru Saracoglu' WHERE game_number = 65; -- Fenerbahce - Liverpool
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/betis-vJbTeCGP/dortmund-nP1i5US1/?mid=Ao5br4Mh',
       venue = 'Signal Iduna Park' WHERE game_number = 66; -- Dortmund - Betis
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/napoli-69Dxbc61/?mid=6Zinb7I7',
       venue = 'Estádio do Dragão' WHERE game_number = 67; -- FC Porto - Napoli
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/como-ttyLthOA/lens-IBmris38/?mid=QVtE7T8m',
       venue = 'Stade Bollaert-Delelis' WHERE game_number = 68; -- Lens - Como
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/psv-M9UEHJWi/?mid=ptuqtEuP',
       venue = 'Philips Stadion' WHERE game_number = 69; -- PSV - Club Brugge KV
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/manchester-city-Wtn9Stg0/rb-leipzig-KbS1suSm/?mid=YVOHJ5R1',
       venue = 'Red Bull Arena' WHERE game_number = 70; -- RB Leipzig - Manchester City
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/slavia-prague-viXGgnyB/?mid=nBxtZvSs',
       venue = 'Fortuna Arena' WHERE game_number = 71; -- Slavia Prague - Arsenal
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/sabah-baku-fNGcxbyr/viking-bXAgOWwb/?mid=4GCn9tph',
       venue = 'Lyse Arena' WHERE game_number = 72; -- Viking - Sabah Baku
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/lask-linz-MipWYeKQ/?mid=pItlFEBk',
       venue = 'Aspmyra Stadion' WHERE game_number = 73; -- Bodo/Glimt - LASK
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/galatasaray-riaqqurF/?mid=OCNDYmfK',
       venue = 'Rams Park' WHERE game_number = 74; -- Galatasaray - Aston Villa
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/dortmund-nP1i5US1/?mid=vPVzwlTF',
       venue = 'Emirates Stadium' WHERE game_number = 75; -- Arsenal - Dortmund
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aek-ANpZncAM/como-ttyLthOA/?mid=jiHA3xET',
       venue = 'Mapei Stadium / Stadio Giuseppe Sinigaglia' WHERE game_number = 76; -- Como - AEK Athens
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/feyenoord-8zjySeoN/?mid=6grtKluR',
       venue = 'De Kuip' WHERE game_number = 77; -- Feyenoord - FC Porto
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/manchester-city-Wtn9Stg0/napoli-69Dxbc61/?mid=OxXVS94F',
       venue = 'Etihad Stadium' WHERE game_number = 78; -- Manchester City - Napoli
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lens-IBmris38/rb-leipzig-KbS1suSm/?mid=pxXsydY8',
       venue = 'Red Bull Arena' WHERE game_number = 79; -- RB Leipzig - Lens
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/psv-M9UEHJWi/real-madrid-W8mj7MDD/?mid=6PURSlmI',
       venue = 'Estadio Santiago Bernabéu' WHERE game_number = 80; -- Real Madrid - PSV
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/betis-vJbTeCGP/slovan-bratislava-QRaWdwQf/?mid=I9qIUvgn',
       venue = 'Tehelné pole' WHERE game_number = 81; -- Slovan Bratislava - Betis
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/sabah-baku-fNGcxbyr/?mid=QqI3ne15',
       venue = 'Bank Respublika Arena' WHERE game_number = 82; -- Sabah Baku - Barcelona
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/slavia-prague-viXGgnyB/villarreal-lUatW5jE/?mid=vJEGXMRG',
       venue = 'Fortuna Arena' WHERE game_number = 83; -- Slavia Prague - Villarreal
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/viking-bXAgOWwb/?mid=zwfT2Gon',
       venue = 'Metropolitano Stadium' WHERE game_number = 84; -- Atl. Madrid - Viking
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/liverpool-lId4TMwf/?mid=6wSZISyp',
       venue = 'Jan Breydel Stadion' WHERE game_number = 85; -- Club Brugge KV - Liverpool
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/inter-Iw7eKK25/vfb-stuttgart-nJQmYp1B/?mid=xn4kY4te',
       venue = 'Stadio Giuseppe Meazza (San Siro)' WHERE game_number = 86; -- Inter - Stuttgart
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/lille-pfDZL71o/?mid=CfLLoIBm',
       venue = 'Stade Pierre-Mauroy' WHERE game_number = 87; -- Lille - Bayern Munich
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/psg-CjhkPw0k/?mid=v74Mijwo',
       venue = 'Parc des Princes' WHERE game_number = 88; -- PSG - AS Roma
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/shakhtar-4ENWX2OA/?mid=rB9Y2j5S',
       venue = 'Stamford Bridge' WHERE game_number = 89; -- Shakhtar Donetsk - Fenerbahce
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/manchester-united-ppjDR086/sporting-cp-tljXuHBC/?mid=CEDJzDKq',
       venue = 'Estádio José Alvalade' WHERE game_number = 90; -- Sporting CP - Manchester Utd
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/feyenoord-8zjySeoN/viking-bXAgOWwb/?mid=f3UMmZHE',
       venue = 'Lyse Arena' WHERE game_number = 91; -- Viking - Feyenoord
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/sabah-baku-fNGcxbyr/villarreal-lUatW5jE/?mid=65G8Zrc4',
       venue = 'Estadio de la Ceramica' WHERE game_number = 92; -- Villarreal - Sabah Baku
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aek-ANpZncAM/galatasaray-riaqqurF/?mid=baJ0tiAl',
       venue = 'Allwyn Arena' WHERE game_number = 93; -- AEK Athens - Galatasaray
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/sporting-cp-tljXuHBC/?mid=0Irves6b',
       venue = 'Stadio Olimpico' WHERE game_number = 94; -- AS Roma - Sporting CP
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/psg-CjhkPw0k/?mid=QsgOBBUG',
       venue = 'Villa Park' WHERE game_number = 95; -- Aston Villa - PSG
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/manchester-city-Wtn9Stg0/?mid=Qmhi7GKs',
       venue = 'Camp Nou' WHERE game_number = 96; -- Barcelona - Manchester City
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/slavia-prague-viXGgnyB/?mid=zFs4TzdJ',
       venue = 'Allianz Arena' WHERE game_number = 97; -- Bayern Munich - Slavia Prague
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/manchester-united-ppjDR086/rb-leipzig-KbS1suSm/?mid=tQRcsIxh',
       venue = 'Old Trafford' WHERE game_number = 98; -- Manchester Utd - RB Leipzig
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/napoli-69Dxbc61/?mid=ld6bmj4k',
       venue = 'Stadio Diego Armando Maradona' WHERE game_number = 99; -- Napoli - Club Brugge KV
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/betis-vJbTeCGP/como-ttyLthOA/?mid=KGUbPqH6',
       venue = 'Estadio de La Cartuja' WHERE game_number = 100; -- Betis - Como
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/shakhtar-4ENWX2OA/slovan-bratislava-QRaWdwQf/?mid=08D0y5Si',
       venue = 'Tehelné pole' WHERE game_number = 101; -- Slovan Bratislava - Shakhtar Donetsk
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/real-madrid-W8mj7MDD/?mid=2BEZlZ4D',
       venue = 'Emirates Stadium' WHERE game_number = 102; -- Arsenal - Real Madrid
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/dortmund-nP1i5US1/inter-Iw7eKK25/?mid=ADHdWrB7',
       venue = 'Signal Iduna Park' WHERE game_number = 103; -- Dortmund - Inter
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/lask-linz-MipWYeKQ/?mid=zkKTRiee',
       venue = 'Raiffeisen Arena' WHERE game_number = 104; -- LASK - Fenerbahce
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/lens-IBmris38/?mid=hrpdDht2',
       venue = 'Stade Bollaert-Delelis' WHERE game_number = 105; -- Lens - Bodo/Glimt
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/liverpool-lId4TMwf/?mid=dpzlSWEc',
       venue = 'Anfield' WHERE game_number = 106; -- Liverpool - FC Porto
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/psv-M9UEHJWi/?mid=r3cy1fGb',
       venue = 'Philips Stadion' WHERE game_number = 107; -- PSV - Atl. Madrid
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lille-pfDZL71o/vfb-stuttgart-nJQmYp1B/?mid=GIbYfjPs',
       venue = 'MHPArena' WHERE game_number = 108; -- Stuttgart - Lille
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/bodo-glimt-S0WZMUNG/?mid=zBFraYpB',
       venue = 'Aspmyra Stadion' WHERE game_number = 109; -- Bodo/Glimt - Atl. Madrid
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/feyenoord-8zjySeoN/galatasaray-riaqqurF/?mid=v1XuClat',
       venue = 'Rams Park' WHERE game_number = 110; -- Galatasaray - Feyenoord
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aek-ANpZncAM/as-roma-zVqqL0ma/?mid=GnzCJEpo',
       venue = 'Allwyn Arena' WHERE game_number = 111; -- AEK Athens - AS Roma
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/dortmund-nP1i5US1/?mid=IB86tri5',
       venue = 'Villa Park' WHERE game_number = 112; -- Aston Villa - Dortmund
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/slavia-prague-viXGgnyB/?mid=YupYLAAE',
       venue = 'Estádio do Dragão' WHERE game_number = 113; -- FC Porto - Slavia Prague
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/inter-Iw7eKK25/liverpool-lId4TMwf/?mid=bF5b5fkf',
       venue = 'Stadio Giuseppe Meazza (San Siro)' WHERE game_number = 114; -- Inter - Liverpool
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lille-pfDZL71o/slovan-bratislava-QRaWdwQf/?mid=pz820C1K',
       venue = 'Stade Pierre-Mauroy' WHERE game_number = 115; -- Lille - Slovan Bratislava
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lask-linz-MipWYeKQ/real-madrid-W8mj7MDD/?mid=dQ1hWNgA',
       venue = 'Estadio Santiago Bernabéu' WHERE game_number = 116; -- Real Madrid - LASK
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/club-brugge-rgTHIK74/vfb-stuttgart-nJQmYp1B/?mid=dM96oUY1',
       venue = 'MHPArena' WHERE game_number = 117; -- Stuttgart - Club Brugge KV
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fenerbahce-MsbmracL/villarreal-lUatW5jE/?mid=fXXe3KG8',
       venue = 'Chobani Stadium Fenerbahce Sukru Saracoglu' WHERE game_number = 118; -- Fenerbahce - Villarreal
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/napoli-69Dxbc61/sabah-baku-fNGcxbyr/?mid=vwLGx99D',
       venue = 'Bank Respublika Arena' WHERE game_number = 119; -- Sabah Baku - Napoli
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/betis-vJbTeCGP/?mid=Q1aOGcCD',
       venue = 'Estadio de La Cartuja' WHERE game_number = 120; -- Betis - Arsenal
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/como-ttyLthOA/psg-CjhkPw0k/?mid=Uwr24TMj',
       venue = 'Mapei Stadium / Stadio Giuseppe Sinigaglia' WHERE game_number = 121; -- Como - PSG
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lens-IBmris38/manchester-city-Wtn9Stg0/?mid=QPB3s9J8',
       venue = 'Stade Bollaert-Delelis' WHERE game_number = 122; -- Lens - Manchester City
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/manchester-united-ppjDR086/?mid=tCUkivlQ',
       venue = 'Old Trafford' WHERE game_number = 123; -- Manchester Utd - Bayern Munich
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/rb-leipzig-KbS1suSm/shakhtar-4ENWX2OA/?mid=vse4cUSk',
       venue = 'Red Bull Arena' WHERE game_number = 124; -- RB Leipzig - Shakhtar Donetsk
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/sporting-cp-tljXuHBC/?mid=p6Gmjw2t',
       venue = 'Estádio José Alvalade' WHERE game_number = 125; -- Sporting CP - Barcelona
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/psv-M9UEHJWi/viking-bXAgOWwb/?mid=zo6Q4CzG',
       venue = 'MHPArena' WHERE game_number = 126; -- Viking - PSV
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/arsenal-hA1Zm19f/sabah-baku-fNGcxbyr/?mid=IydGIJs1',
       venue = 'Emirates Stadium' WHERE game_number = 127; -- Arsenal - Sabah Baku
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/as-roma-zVqqL0ma/lille-pfDZL71o/?mid=4QsQSINb',
       venue = 'Stadio Olimpico' WHERE game_number = 128; -- AS Roma - Lille
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/atl-madrid-jaarqpLQ/fenerbahce-MsbmracL/?mid=KQJJrD0U',
       venue = 'Metropolitano Stadium' WHERE game_number = 129; -- Atl. Madrid - Fenerbahce
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/barcelona-SKbpVP5K/como-ttyLthOA/?mid=KQaxqMfD',
       venue = 'Camp Nou' WHERE game_number = 130; -- Barcelona - Como
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bayern-munich-nVp0wiqd/betis-vJbTeCGP/?mid=fytlXIdf',
       venue = 'Allianz Arena' WHERE game_number = 131; -- Bayern Munich - Betis
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/bodo-glimt-S0WZMUNG/club-brugge-rgTHIK74/?mid=Kb7LfYBF',
       venue = 'Jan Breydel Stadion' WHERE game_number = 132; -- Club Brugge KV - Bodo/Glimt
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aek-ANpZncAM/dortmund-nP1i5US1/?mid=dt007BeL',
       venue = 'Signal Iduna Park' WHERE game_number = 133; -- Dortmund - AEK Athens
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/feyenoord-8zjySeoN/rb-leipzig-KbS1suSm/?mid=QB6x3BMP',
       venue = 'De Kuip' WHERE game_number = 134; -- Feyenoord - RB Leipzig
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/fc-porto-S2NmScGp/lask-linz-MipWYeKQ/?mid=GSTBES2l',
       venue = 'Raiffeisen Arena' WHERE game_number = 135; -- LASK - FC Porto
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/lens-IBmris38/liverpool-lId4TMwf/?mid=zey4OlEM',
       venue = 'Anfield' WHERE game_number = 136; -- Liverpool - Lens
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/manchester-city-Wtn9Stg0/sporting-cp-tljXuHBC/?mid=GCTNUVZ2',
       venue = 'Etihad Stadium' WHERE game_number = 137; -- Manchester City - Sporting CP
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/napoli-69Dxbc61/viking-bXAgOWwb/?mid=6PM8vVv1',
       venue = 'Stadio Diego Armando Maradona' WHERE game_number = 138; -- Napoli - Viking
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/galatasaray-riaqqurF/psg-CjhkPw0k/?mid=6Dd8FgVi',
       venue = 'Parc des Princes' WHERE game_number = 139; -- PSG - Galatasaray
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/psv-M9UEHJWi/vfb-stuttgart-nJQmYp1B/?mid=zRFWrVDd',
       venue = 'Philips Stadion' WHERE game_number = 140; -- PSV - Stuttgart
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/real-madrid-W8mj7MDD/shakhtar-4ENWX2OA/?mid=zZeWOunp',
       venue = 'Stamford Bridge' WHERE game_number = 141; -- Shakhtar Donetsk - Real Madrid
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/aston-villa-W00wmLO0/slavia-prague-viXGgnyB/?mid=vwTrTRHs',
       venue = 'Fortuna Arena' WHERE game_number = 142; -- Slavia Prague - Aston Villa
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/inter-Iw7eKK25/slovan-bratislava-QRaWdwQf/?mid=AX7jhQXQ',
       venue = 'Tehelné pole' WHERE game_number = 143; -- Slovan Bratislava - Inter
UPDATE "lm2026-27".games_pdf SET flashscore_url = 'https://www.flashscore.com/match/football/manchester-united-ppjDR086/villarreal-lUatW5jE/?mid=M3TDwzxH',
       venue = 'Estadio de la Ceramica' WHERE game_number = 144; -- Villarreal - Manchester Utd

-- Kontrola: vsetkych 144 ligovych zapasov ma URL aj stadion.
DO $$
DECLARE bez_url INTEGER; bez_stadiona INTEGER;
BEGIN
    SELECT COUNT(*) INTO bez_url FROM "lm2026-27".games_pdf
     WHERE phase = 'LEAGUE' AND (flashscore_url IS NULL OR flashscore_url = '');
    IF bez_url > 0 THEN RAISE EXCEPTION '% ligovych zapasov nema URL', bez_url; END IF;

    SELECT COUNT(*) INTO bez_stadiona FROM "lm2026-27".games_pdf
     WHERE phase = 'LEAGUE' AND (venue IS NULL OR venue = '');
    IF bez_stadiona > 0 THEN RAISE EXCEPTION '% ligovych zapasov nema stadion', bez_stadiona; END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (66, 'URL zapasov a stadiony ligovej fazy LM v games_pdf')
ON CONFLICT (version) DO NOTHING;

COMMIT;
