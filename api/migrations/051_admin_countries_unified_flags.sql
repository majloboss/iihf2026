-- Migration 051: jednotne nazvy vlajok pre admin.countries
-- Zdroj: existujuce FIFA vlajky, potom IIHF vlajky.
-- Nove subory maju format flag_<country_code>.png.

UPDATE admin.countries
SET flag_file = CASE country_code
    WHEN 'ALG' THEN 'flag_alg.png'
    WHEN 'ARG' THEN 'flag_arg.png'
    WHEN 'AUS' THEN 'flag_aus.png'
    WHEN 'AUT' THEN 'flag_aut.png'
    WHEN 'BEL' THEN 'flag_bel.png'
    WHEN 'BIH' THEN 'flag_bih.png'
    WHEN 'BRA' THEN 'flag_bra.png'
    WHEN 'CAN' THEN 'flag_can.png'
    WHEN 'CIV' THEN 'flag_civ.png'
    WHEN 'COD' THEN 'flag_cod.png'
    WHEN 'COL' THEN 'flag_col.png'
    WHEN 'CPV' THEN 'flag_cpv.png'
    WHEN 'CRO' THEN 'flag_cro.png'
    WHEN 'CUW' THEN 'flag_cuw.png'
    WHEN 'CZE' THEN 'flag_cze.png'
    WHEN 'DEN' THEN 'flag_den.png'
    WHEN 'ECU' THEN 'flag_ecu.png'
    WHEN 'EGY' THEN 'flag_egy.png'
    WHEN 'ENG' THEN 'flag_eng.png'
    WHEN 'ESP' THEN 'flag_esp.png'
    WHEN 'FIN' THEN 'flag_fin.png'
    WHEN 'FRA' THEN 'flag_fra.png'
    WHEN 'GBR' THEN 'flag_gbr.png'
    WHEN 'GER' THEN 'flag_ger.png'
    WHEN 'GHA' THEN 'flag_gha.png'
    WHEN 'HAI' THEN 'flag_hai.png'
    WHEN 'HUN' THEN 'flag_hun.png'
    WHEN 'IRN' THEN 'flag_irn.png'
    WHEN 'IRQ' THEN 'flag_irq.png'
    WHEN 'ITA' THEN 'flag_ita.png'
    WHEN 'JOR' THEN 'flag_jor.png'
    WHEN 'JPN' THEN 'flag_jpn.png'
    WHEN 'KOR' THEN 'flag_kor.png'
    WHEN 'KSA' THEN 'flag_ksa.png'
    WHEN 'LAT' THEN 'flag_lat.png'
    WHEN 'MAR' THEN 'flag_mar.png'
    WHEN 'MEX' THEN 'flag_mex.png'
    WHEN 'NED' THEN 'flag_ned.png'
    WHEN 'NOR' THEN 'flag_nor.png'
    WHEN 'NZL' THEN 'flag_nzl.png'
    WHEN 'PAN' THEN 'flag_pan.png'
    WHEN 'PAR' THEN 'flag_par.png'
    WHEN 'POR' THEN 'flag_por.png'
    WHEN 'QAT' THEN 'flag_qat.png'
    WHEN 'RSA' THEN 'flag_rsa.png'
    WHEN 'SCO' THEN 'flag_sco.png'
    WHEN 'SEN' THEN 'flag_sen.png'
    WHEN 'SLO' THEN 'flag_slo.png'
    WHEN 'SUI' THEN 'flag_sui.png'
    WHEN 'SVK' THEN 'flag_svk.png'
    WHEN 'SWE' THEN 'flag_swe.png'
    WHEN 'TUN' THEN 'flag_tun.png'
    WHEN 'TUR' THEN 'flag_tur.png'
    WHEN 'URU' THEN 'flag_uru.png'
    WHEN 'USA' THEN 'flag_usa.png'
    WHEN 'UZB' THEN 'flag_uzb.png'
    ELSE flag_file
END,
updated_at = NOW()
WHERE country_code IN (
    'ALG','ARG','AUS','AUT','BEL','BIH','BRA','CAN','CIV','COD','COL','CPV','CRO','CUW',
    'CZE','DEN','ECU','EGY','ENG','ESP','FIN','FRA','GBR','GER','GHA','HAI','HUN','IRN',
    'IRQ','ITA','JOR','JPN','KOR','KSA','LAT','MAR','MEX','NED','NOR','NZL','PAN','PAR',
    'POR','QAT','RSA','SCO','SEN','SLO','SUI','SVK','SWE','TUN','TUR','URU','USA','UZB'
);

INSERT INTO admin.schema_versions (version, description)
VALUES (51, 'Admin countries: jednotne flag_CODE.png pre dostupne FIFA a IIHF vlajky')
ON CONFLICT (version) DO NOTHING;
