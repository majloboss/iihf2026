-- Migration 015: FlashScore URLs pre skupinovú fázu (games 1-56)
-- Zdroj: https://www.flashscore.sk/hokej/svet/majstrovstva-sveta/program/
-- Radenie: abecedne podľa slovenského slugu tímu
-- Hry 57-64 (play-off) treba doplniť manuálne po zostavení play-off parov
-- AND flashscore_url IS NULL: neprepisuje manualne zadane URL

-- Slugy tímov (overené z FlashScore):
-- AUT: rakusko-xWM7kVPi        CAN: kanada-dSsR389c
-- CZE: cesko-OdY4GUuO          DEN: dansko-2mX8FleU
-- FIN: finsko-rRWMzYQu         GBR: velka-britania-C2UJnT9A
-- GER: nemecko-vgQVYBeh        HUN: madarsko-fBiWomPG
-- ITA: taliansko-IqPZXVAb      LAT: lotyssko-44JaYkQ4
-- NOR: norsko-nDtCX9uB         SLO: slovinsko-x2ZOU7PT
-- SVK: slovensko-ruzLVmAN      SUI: svajciarsko-buO3jBAo
-- SWE: svedsko-vBLjQRXp        USA: usa-GYgp4SO3

UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/nemecko-vgQVYBeh/'   WHERE game_number = 1  AND flashscore_url IS NULL; -- FIN vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/svedsko-vBLjQRXp/'   WHERE game_number = 2  AND flashscore_url IS NULL; -- CAN vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svajciarsko-buO3jBAo/usa-GYgp4SO3/' WHERE game_number = 3  AND flashscore_url IS NULL; -- SUI vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/dansko-2mX8FleU/'    WHERE game_number = 4  AND flashscore_url IS NULL; -- CZE vs DEN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/velka-britania-C2UJnT9A/' WHERE game_number = 5  AND flashscore_url IS NULL; -- AUT vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/slovensko-ruzLVmAN/' WHERE game_number = 6  AND flashscore_url IS NULL; -- NOR vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/madarsko-fBiWomPG/'  WHERE game_number = 7  AND flashscore_url IS NULL; -- FIN vs HUN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/taliansko-IqPZXVAb/' WHERE game_number = 8  AND flashscore_url IS NULL; -- CAN vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/svajciarsko-buO3jBAo/' WHERE game_number = 9  AND flashscore_url IS NULL; -- LAT vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/slovinsko-x2ZOU7PT/'  WHERE game_number = 10 AND flashscore_url IS NULL; -- CZE vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/usa-GYgp4SO3/velka-britania-C2UJnT9A/' WHERE game_number = 11 AND flashscore_url IS NULL; -- USA vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/taliansko-IqPZXVAb/' WHERE game_number = 12 AND flashscore_url IS NULL; -- SVK vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/rakusko-xWM7kVPi/'  WHERE game_number = 13 AND flashscore_url IS NULL; -- HUN vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/svedsko-vBLjQRXp/'   WHERE game_number = 14 AND flashscore_url IS NULL; -- DEN vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/nemecko-vgQVYBeh/'  WHERE game_number = 15 AND flashscore_url IS NULL; -- LAT vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/slovinsko-x2ZOU7PT/' WHERE game_number = 16 AND flashscore_url IS NULL; -- NOR vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/usa-GYgp4SO3/'       WHERE game_number = 17 AND flashscore_url IS NULL; -- FIN vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/kanada-dSsR389c/'    WHERE game_number = 18 AND flashscore_url IS NULL; -- DEN vs CAN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/svajciarsko-buO3jBAo/' WHERE game_number = 19 AND flashscore_url IS NULL; -- GER vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/svedsko-vBLjQRXp/'   WHERE game_number = 20 AND flashscore_url IS NULL; -- CZE vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/rakusko-xWM7kVPi/' WHERE game_number = 21 AND flashscore_url IS NULL; -- LAT vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/taliansko-IqPZXVAb/' WHERE game_number = 22 AND flashscore_url IS NULL; -- NOR vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/velka-britania-C2UJnT9A/' WHERE game_number = 23 AND flashscore_url IS NULL; -- HUN vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/slovinsko-x2ZOU7PT/' WHERE game_number = 24 AND flashscore_url IS NULL; -- SVK vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/svajciarsko-buO3jBAo/' WHERE game_number = 25 AND flashscore_url IS NULL; -- AUT vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/taliansko-IqPZXVAb/'  WHERE game_number = 26 AND flashscore_url IS NULL; -- CZE vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/usa-GYgp4SO3/'       WHERE game_number = 27 AND flashscore_url IS NULL; -- GER vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovinsko-x2ZOU7PT/svedsko-vBLjQRXp/' WHERE game_number = 28 AND flashscore_url IS NULL; -- SLO vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/lotyssko-44JaYkQ4/'  WHERE game_number = 29 AND flashscore_url IS NULL; -- FIN vs LAT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/norsko-nDtCX9uB/'    WHERE game_number = 30 AND flashscore_url IS NULL; -- CAN vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svajciarsko-buO3jBAo/velka-britania-C2UJnT9A/' WHERE game_number = 31 AND flashscore_url IS NULL; -- SUI vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/slovensko-ruzLVmAN/' WHERE game_number = 32 AND flashscore_url IS NULL; -- DEN vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/nemecko-vgQVYBeh/'  WHERE game_number = 33 AND flashscore_url IS NULL; -- HUN vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/slovinsko-x2ZOU7PT/' WHERE game_number = 34 AND flashscore_url IS NULL; -- CAN vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/velka-britania-C2UJnT9A/' WHERE game_number = 35 AND flashscore_url IS NULL; -- FIN vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svedsko-vBLjQRXp/taliansko-IqPZXVAb/' WHERE game_number = 36 AND flashscore_url IS NULL; -- SWE vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/usa-GYgp4SO3/'     WHERE game_number = 37 AND flashscore_url IS NULL; -- LAT vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/slovinsko-x2ZOU7PT/' WHERE game_number = 38 AND flashscore_url IS NULL; -- DEN vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/svajciarsko-buO3jBAo/' WHERE game_number = 39 AND flashscore_url IS NULL; -- HUN vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/slovensko-ruzLVmAN/'  WHERE game_number = 40 AND flashscore_url IS NULL; -- CZE vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/rakusko-xWM7kVPi/'  WHERE game_number = 41 AND flashscore_url IS NULL; -- GER vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/svedsko-vBLjQRXp/'  WHERE game_number = 42 AND flashscore_url IS NULL; -- NOR vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/velka-britania-C2UJnT9A/' WHERE game_number = 43 AND flashscore_url IS NULL; -- LAT vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/taliansko-IqPZXVAb/' WHERE game_number = 44 AND flashscore_url IS NULL; -- DEN vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/rakusko-xWM7kVPi/'  WHERE game_number = 45 AND flashscore_url IS NULL; -- FIN vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/slovensko-ruzLVmAN/' WHERE game_number = 46 AND flashscore_url IS NULL; -- CAN vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/usa-GYgp4SO3/'     WHERE game_number = 47 AND flashscore_url IS NULL; -- HUN vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/norsko-nDtCX9uB/'     WHERE game_number = 48 AND flashscore_url IS NULL; -- CZE vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/velka-britania-C2UJnT9A/' WHERE game_number = 49 AND flashscore_url IS NULL; -- GER vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovinsko-x2ZOU7PT/taliansko-IqPZXVAb/' WHERE game_number = 50 AND flashscore_url IS NULL; -- SLO vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/madarsko-fBiWomPG/' WHERE game_number = 51 AND flashscore_url IS NULL; -- LAT vs HUN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/norsko-nDtCX9uB/'    WHERE game_number = 52 AND flashscore_url IS NULL; -- DEN vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/usa-GYgp4SO3/'      WHERE game_number = 53 AND flashscore_url IS NULL; -- AUT vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/svedsko-vBLjQRXp/' WHERE game_number = 54 AND flashscore_url IS NULL; -- SVK vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/svajciarsko-buO3jBAo/' WHERE game_number = 55 AND flashscore_url IS NULL; -- FIN vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/kanada-dSsR389c/'     WHERE game_number = 56 AND flashscore_url IS NULL; -- CZE vs CAN

-- Play-off (57-64): doplnit manualne po zostaveni parov
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 57 AND flashscore_url IS NULL; -- QF1
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 58 AND flashscore_url IS NULL; -- QF2
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 59 AND flashscore_url IS NULL; -- QF3
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 60 AND flashscore_url IS NULL; -- QF4
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 61 AND flashscore_url IS NULL; -- SF1
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 62 AND flashscore_url IS NULL; -- SF2
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 63 AND flashscore_url IS NULL; -- Bronz
-- UPDATE iihf2026.games SET flashscore_url = '...' WHERE game_number = 64 AND flashscore_url IS NULL; -- Final
