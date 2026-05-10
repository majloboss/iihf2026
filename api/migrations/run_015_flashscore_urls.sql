-- Migration 015: FlashScore URLs pre skupinovú fázu (games 1-56)
-- Zdroj: https://www.flashscore.sk/hokej/svet/majstrovstva-sveta/program/
-- Radenie: abecedne podľa slovenského slugu tímu
-- Hry 57-64 (play-off) treba doplniť manuálne po zostavení play-off parov

-- Slugy tímov (overené z FlashScore):
-- AUT: rakusko-xWM7kVPi        CAN: kanada-dSsR389c
-- CZE: cesko-OdY4GUuO          DEN: dansko-2mX8FleU
-- FIN: finsko-rRWMzYQu         GBR: velka-britania-C2UJnT9A
-- GER: nemecko-vgQVYBeh        HUN: madarsko-fBiWomPG
-- ITA: taliansko-IqPZXVAb      LAT: lotyssko-44JaYkQ4
-- NOR: norsko-nDtCX9uB         SLO: slovinsko-x2ZOU7PT
-- SVK: slovensko-ruzLVmAN      SUI: svajciarsko-buO3jBAo
-- SWE: svedsko-vBLjQRXp        USA: usa-GYgp4SO3

UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/nemecko-vgQVYBeh/'   WHERE game_number = 1;   -- FIN vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/svedsko-vBLjQRXp/'   WHERE game_number = 2;   -- CAN vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svajciarsko-buO3jBAo/usa-GYgp4SO3/' WHERE game_number = 3;   -- SUI vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/dansko-2mX8FleU/'    WHERE game_number = 4;   -- CZE vs DEN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/velka-britania-C2UJnT9A/' WHERE game_number = 5; -- AUT vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/slovensko-ruzLVmAN/' WHERE game_number = 6;  -- NOR vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/madarsko-fBiWomPG/'  WHERE game_number = 7;  -- FIN vs HUN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/taliansko-IqPZXVAb/' WHERE game_number = 8;  -- CAN vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/svajciarsko-buO3jBAo/' WHERE game_number = 9; -- LAT vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/slovinsko-x2ZOU7PT/'  WHERE game_number = 10; -- CZE vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/usa-GYgp4SO3/velka-britania-C2UJnT9A/' WHERE game_number = 11; -- USA vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/taliansko-IqPZXVAb/' WHERE game_number = 12; -- SVK vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/rakusko-xWM7kVPi/'  WHERE game_number = 13; -- HUN vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/svedsko-vBLjQRXp/'   WHERE game_number = 14; -- DEN vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/nemecko-vgQVYBeh/'  WHERE game_number = 15; -- LAT vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/slovinsko-x2ZOU7PT/' WHERE game_number = 16; -- NOR vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/usa-GYgp4SO3/'       WHERE game_number = 17; -- FIN vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/kanada-dSsR389c/'    WHERE game_number = 18; -- DEN vs CAN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/svajciarsko-buO3jBAo/' WHERE game_number = 19; -- GER vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/svedsko-vBLjQRXp/'   WHERE game_number = 20; -- CZE vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/rakusko-xWM7kVPi/' WHERE game_number = 21; -- LAT vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/taliansko-IqPZXVAb/' WHERE game_number = 22; -- NOR vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/velka-britania-C2UJnT9A/' WHERE game_number = 23; -- HUN vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/slovinsko-x2ZOU7PT/' WHERE game_number = 24; -- SVK vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/svajciarsko-buO3jBAo/' WHERE game_number = 25; -- AUT vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/taliansko-IqPZXVAb/'  WHERE game_number = 26; -- CZE vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/usa-GYgp4SO3/'       WHERE game_number = 27; -- GER vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovinsko-x2ZOU7PT/svedsko-vBLjQRXp/' WHERE game_number = 28; -- SLO vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/lotyssko-44JaYkQ4/'  WHERE game_number = 29; -- FIN vs LAT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/norsko-nDtCX9uB/'    WHERE game_number = 30; -- CAN vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svajciarsko-buO3jBAo/velka-britania-C2UJnT9A/' WHERE game_number = 31; -- SUI vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/slovensko-ruzLVmAN/' WHERE game_number = 32; -- DEN vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/nemecko-vgQVYBeh/'  WHERE game_number = 33; -- HUN vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/slovinsko-x2ZOU7PT/' WHERE game_number = 34; -- CAN vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/velka-britania-C2UJnT9A/' WHERE game_number = 35; -- FIN vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svedsko-vBLjQRXp/taliansko-IqPZXVAb/' WHERE game_number = 36; -- SWE vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/usa-GYgp4SO3/'     WHERE game_number = 37; -- LAT vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/slovinsko-x2ZOU7PT/' WHERE game_number = 38; -- DEN vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/svajciarsko-buO3jBAo/' WHERE game_number = 39; -- HUN vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/slovensko-ruzLVmAN/'  WHERE game_number = 40; -- CZE vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/rakusko-xWM7kVPi/'  WHERE game_number = 41; -- GER vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/svedsko-vBLjQRXp/'  WHERE game_number = 42; -- NOR vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/velka-britania-C2UJnT9A/' WHERE game_number = 43; -- LAT vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/taliansko-IqPZXVAb/' WHERE game_number = 44; -- DEN vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/rakusko-xWM7kVPi/'  WHERE game_number = 45; -- FIN vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/slovensko-ruzLVmAN/' WHERE game_number = 46; -- CAN vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/usa-GYgp4SO3/'     WHERE game_number = 47; -- HUN vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/norsko-nDtCX9uB/'     WHERE game_number = 48; -- CZE vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/velka-britania-C2UJnT9A/' WHERE game_number = 49; -- GER vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovinsko-x2ZOU7PT/taliansko-IqPZXVAb/' WHERE game_number = 50; -- SLO vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/madarsko-fBiWomPG/' WHERE game_number = 51; -- LAT vs HUN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/norsko-nDtCX9uB/'    WHERE game_number = 52; -- DEN vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/usa-GYgp4SO3/'      WHERE game_number = 53; -- AUT vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/svedsko-vBLjQRXp/' WHERE game_number = 54; -- SVK vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/svajciarsko-buO3jBAo/' WHERE game_number = 55; -- FIN vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/kanada-dSsR389c/'     WHERE game_number = 56; -- CZE vs CAN

-- Play-off (57-64): doplnit manualne po zostaveni parov
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 57; -- QF1
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 58; -- QF2
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 59; -- QF3
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 60; -- QF4
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 61; -- SF1
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 62; -- SF2
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 63; -- Bronz
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 64; -- Final
