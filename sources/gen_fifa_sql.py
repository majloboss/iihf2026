from datetime import datetime, timedelta

teams = [
    ('MEX','Mexico','A'),('RSA','South Africa','A'),('KOR','South Korea','A'),('CZE','Czech Republic','A'),
    ('CAN','Canada','B'),('BIH','Bosnia & Herzegovina','B'),('QAT','Qatar','B'),('SUI','Switzerland','B'),
    ('BRA','Brazil','C'),('MAR','Morocco','C'),('HAI','Haiti','C'),('SCO','Scotland','C'),
    ('USA','USA','D'),('PAR','Paraguay','D'),('AUS','Australia','D'),('TUR','Turkey','D'),
    ('GER','Germany','E'),('CUW','Curacao','E'),('CIV','Ivory Coast','E'),('ECU','Ecuador','E'),
    ('NED','Netherlands','F'),('JPN','Japan','F'),('SWE','Sweden','F'),('TUN','Tunisia','F'),
    ('BEL','Belgium','G'),('EGY','Egypt','G'),('IRN','Iran','G'),('NZL','New Zealand','G'),
    ('ESP','Spain','H'),('CPV','Cape Verde','H'),('KSA','Saudi Arabia','H'),('URU','Uruguay','H'),
    ('FRA','France','I'),('SEN','Senegal','I'),('IRQ','Iraq','I'),('NOR','Norway','I'),
    ('ARG','Argentina','J'),('ALG','Algeria','J'),('AUT','Austria','J'),('JOR','Jordan','J'),
    ('POR','Portugal','K'),('COD','DR Congo','K'),('UZB','Uzbekistan','K'),('COL','Colombia','K'),
    ('ENG','England','L'),('CRO','Croatia','L'),('GHA','Ghana','L'),('PAN','Panama','L'),
]

games = [
    ('A','2026-06-11','13:00',-6,'MEX','RSA','Mexico City'),
    ('A','2026-06-11','20:00',-6,'KOR','CZE','Guadalajara'),
    ('A','2026-06-18','12:00',-4,'CZE','RSA','Atlanta'),
    ('A','2026-06-18','19:00',-6,'MEX','KOR','Guadalajara'),
    ('A','2026-06-24','19:00',-6,'CZE','MEX','Mexico City'),
    ('A','2026-06-24','19:00',-6,'RSA','KOR','Monterrey'),
    ('B','2026-06-12','15:00',-4,'CAN','BIH','Toronto'),
    ('B','2026-06-13','12:00',-7,'QAT','SUI','San Francisco'),
    ('B','2026-06-18','12:00',-7,'SUI','BIH','Los Angeles'),
    ('B','2026-06-18','15:00',-7,'CAN','QAT','Vancouver'),
    ('B','2026-06-24','12:00',-7,'SUI','CAN','Vancouver'),
    ('B','2026-06-24','12:00',-7,'BIH','QAT','Seattle'),
    ('C','2026-06-13','18:00',-4,'BRA','MAR','New York/New Jersey'),
    ('C','2026-06-13','21:00',-4,'HAI','SCO','Boston'),
    ('C','2026-06-19','18:00',-4,'SCO','MAR','Boston'),
    ('C','2026-06-19','20:30',-4,'BRA','HAI','Philadelphia'),
    ('C','2026-06-24','18:00',-4,'SCO','BRA','Miami'),
    ('C','2026-06-24','18:00',-4,'MAR','HAI','Atlanta'),
    ('D','2026-06-12','18:00',-7,'USA','PAR','Los Angeles'),
    ('D','2026-06-13','21:00',-7,'AUS','TUR','Vancouver'),
    ('D','2026-06-19','12:00',-7,'USA','AUS','Seattle'),
    ('D','2026-06-19','20:00',-7,'TUR','PAR','San Francisco'),
    ('D','2026-06-25','19:00',-7,'TUR','USA','Los Angeles'),
    ('D','2026-06-25','19:00',-7,'PAR','AUS','San Francisco'),
    ('E','2026-06-14','12:00',-5,'GER','CUW','Houston'),
    ('E','2026-06-14','19:00',-4,'CIV','ECU','Philadelphia'),
    ('E','2026-06-20','16:00',-4,'GER','CIV','Toronto'),
    ('E','2026-06-20','19:00',-5,'ECU','CUW','Kansas City'),
    ('E','2026-06-25','16:00',-4,'CUW','CIV','Philadelphia'),
    ('E','2026-06-25','16:00',-4,'ECU','GER','New York/New Jersey'),
    ('F','2026-06-14','15:00',-5,'NED','JPN','Dallas'),
    ('F','2026-06-14','20:00',-6,'SWE','TUN','Monterrey'),
    ('F','2026-06-20','12:00',-5,'NED','SWE','Houston'),
    ('F','2026-06-20','22:00',-6,'TUN','JPN','Monterrey'),
    ('F','2026-06-25','18:00',-5,'JPN','SWE','Dallas'),
    ('F','2026-06-25','18:00',-5,'TUN','NED','Kansas City'),
    ('G','2026-06-15','12:00',-7,'BEL','EGY','Seattle'),
    ('G','2026-06-15','18:00',-7,'IRN','NZL','Los Angeles'),
    ('G','2026-06-21','12:00',-7,'BEL','IRN','Los Angeles'),
    ('G','2026-06-21','18:00',-7,'NZL','EGY','Vancouver'),
    ('G','2026-06-26','20:00',-7,'EGY','IRN','Seattle'),
    ('G','2026-06-26','20:00',-7,'NZL','BEL','Vancouver'),
    ('H','2026-06-15','12:00',-4,'ESP','CPV','Atlanta'),
    ('H','2026-06-15','18:00',-4,'KSA','URU','Miami'),
    ('H','2026-06-21','12:00',-4,'ESP','KSA','Atlanta'),
    ('H','2026-06-21','18:00',-4,'URU','CPV','Miami'),
    ('H','2026-06-26','19:00',-5,'CPV','KSA','Houston'),
    ('H','2026-06-26','18:00',-6,'URU','ESP','Guadalajara'),
    ('I','2026-06-16','15:00',-4,'FRA','SEN','New York/New Jersey'),
    ('I','2026-06-16','18:00',-4,'IRQ','NOR','Boston'),
    ('I','2026-06-22','17:00',-4,'FRA','IRQ','Philadelphia'),
    ('I','2026-06-22','20:00',-4,'NOR','SEN','New York/New Jersey'),
    ('I','2026-06-26','15:00',-4,'NOR','FRA','Boston'),
    ('I','2026-06-26','15:00',-4,'SEN','IRQ','Toronto'),
    ('J','2026-06-16','20:00',-5,'ARG','ALG','Kansas City'),
    ('J','2026-06-16','21:00',-7,'AUT','JOR','San Francisco'),
    ('J','2026-06-22','12:00',-5,'ARG','AUT','Dallas'),
    ('J','2026-06-22','20:00',-7,'JOR','ALG','San Francisco'),
    ('J','2026-06-27','21:00',-5,'ALG','AUT','Kansas City'),
    ('J','2026-06-27','21:00',-5,'JOR','ARG','Dallas'),
    ('K','2026-06-17','12:00',-5,'POR','COD','Houston'),
    ('K','2026-06-17','20:00',-6,'UZB','COL','Mexico City'),
    ('K','2026-06-23','12:00',-5,'POR','UZB','Houston'),
    ('K','2026-06-23','20:00',-6,'COL','COD','Guadalajara'),
    ('K','2026-06-27','19:30',-4,'COL','POR','Miami'),
    ('K','2026-06-27','19:30',-4,'COD','UZB','Atlanta'),
    ('L','2026-06-17','15:00',-5,'ENG','CRO','Dallas'),
    ('L','2026-06-17','19:00',-4,'GHA','PAN','Toronto'),
    ('L','2026-06-23','16:00',-4,'ENG','GHA','Boston'),
    ('L','2026-06-23','19:00',-4,'PAN','CRO','Toronto'),
    ('L','2026-06-27','17:00',-4,'PAN','ENG','New York/New Jersey'),
    ('L','2026-06-27','17:00',-4,'CRO','GHA','Philadelphia'),
]

knockout = [
    (73,'R32','Round of 32','2026-06-28','22:00',-4,'Miami'),
    (74,'R32','Round of 32','2026-06-28','22:00',-5,'Kansas City'),
    (75,'R32','Round of 32','2026-06-29','22:00',-4,'New York/New Jersey'),
    (76,'R32','Round of 32','2026-06-29','22:00',-5,'Dallas'),
    (77,'R32','Round of 32','2026-06-30','22:00',-7,'Los Angeles'),
    (78,'R32','Round of 32','2026-06-30','22:00',-7,'Seattle'),
    (79,'R32','Round of 32','2026-07-01','22:00',-5,'Houston'),
    (80,'R32','Round of 32','2026-07-01','22:00',-4,'Atlanta'),
    (81,'R32','Round of 32','2026-07-01','22:00',-7,'Vancouver'),
    (82,'R32','Round of 32','2026-07-02','22:00',-4,'Boston'),
    (83,'R32','Round of 32','2026-07-02','22:00',-6,'Mexico City'),
    (84,'R32','Round of 32','2026-07-02','22:00',-4,'Toronto'),
    (85,'R32','Round of 32','2026-07-03','22:00',-7,'San Francisco'),
    (86,'R32','Round of 32','2026-07-03','22:00',-5,'Kansas City'),
    (87,'R32','Round of 32','2026-07-03','22:00',-4,'Philadelphia'),
    (88,'R32','Round of 32','2026-07-03','22:00',-6,'Guadalajara'),
    (89,'R16','Round of 16','2026-07-04','22:00',-4,'New York/New Jersey'),
    (90,'R16','Round of 16','2026-07-04','22:00',-5,'Dallas'),
    (91,'R16','Round of 16','2026-07-05','22:00',-5,'Houston'),
    (92,'R16','Round of 16','2026-07-05','22:00',-7,'Los Angeles'),
    (93,'R16','Round of 16','2026-07-06','22:00',-4,'Miami'),
    (94,'R16','Round of 16','2026-07-06','22:00',-4,'Boston'),
    (95,'R16','Round of 16','2026-07-07','22:00',-4,'Atlanta'),
    (96,'R16','Round of 16','2026-07-07','22:00',-7,'Seattle'),
    (97,'QF','Quarter-final','2026-07-09','22:00',-4,'New York/New Jersey'),
    (98,'QF','Quarter-final','2026-07-10','22:00',-5,'Dallas'),
    (99,'QF','Quarter-final','2026-07-10','22:00',-4,'Miami'),
    (100,'QF','Quarter-final','2026-07-11','22:00',-7,'Los Angeles'),
    (101,'SF','Semi-final','2026-07-14','22:00',-4,'Atlanta'),
    (102,'SF','Semi-final','2026-07-15','22:00',-4,'New York/New Jersey'),
    (103,'BM','Bronze Medal','2026-07-18','19:00',-4,'Miami'),
    (104,'F','Final','2026-07-19','19:00',-4,'New York/New Jersey'),
]

def to_utc(date_str, time_str, utc_offset):
    h, m = map(int, time_str.split(':'))
    dt = datetime.strptime(date_str, '%Y-%m-%d').replace(hour=h, minute=m)
    dt_utc = dt - timedelta(hours=utc_offset)
    return dt_utc.strftime('%Y-%m-%d %H:%M:00')

team_id = {t[0]: i+1 for i, t in enumerate(teams)}

out = []
out.append('-- Migration 025: FIFA 2026 timy a zapasy')
out.append('-- 48 timov, 72 skupinovych + 32 knockout zapasov (104 celkom)')
out.append('')

# Teams
rows = []
for i, (code, name, grp) in enumerate(teams):
    ne = name.replace("'", "''")
    rows.append("    ({}, '{}', '{}', '{}')".format(i+1, code, ne, grp))
out.append('INSERT INTO fifa2026.teams (team_id, team_code, team_name, group_name) VALUES')
out.append(',\n'.join(rows) + ';')
out.append('')
out.append("SELECT setval(pg_get_serial_sequence('fifa2026.teams', 'team_id'), MAX(team_id)) FROM fifa2026.teams;")
out.append('')

# Games
all_rows = []
for gid, (grp, date, time, offset, home, away, venue) in enumerate(games, 1):
    utc = to_utc(date, time, offset)
    hid = team_id[home]
    aid = team_id[away]
    ve = venue.replace("'", "''")
    all_rows.append("    ({}, {}, {}, '{}', '{}', TRUE, FALSE, 'GROUP_{}', 'Skupina {}')".format(
        gid, hid, aid, utc, ve, grp, grp))

for kid, code, name, date, time, offset, venue in knockout:
    utc = to_utc(date, time, offset)
    ve = venue.replace("'", "''")
    ne = name.replace("'", "''")
    all_rows.append("    ({}, NULL, NULL, '{}', '{}', FALSE, FALSE, '{}', '{}')".format(
        kid, utc, ve, code, ne))

out.append('INSERT INTO fifa2026.games (game_id, home_team_id, away_team_id, start_time, venue, tips_open, result_approved, game_type_code, game_type_name) VALUES')
out.append(',\n'.join(all_rows) + ';')
out.append('')
out.append("INSERT INTO admin.schema_versions (version, description)")
out.append("VALUES (25, 'FIFA 2026: 48 timov, 104 zapasov (72 skupinove + 32 knockout)')")
out.append("ON CONFLICT (version) DO NOTHING;")

sql = '\n'.join(out)
with open(r'D:\AI\Claudecode\dev_betclub\api\migrations\025_fifa_data.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print("OK - {} riadkov, {} znakov".format(len(out), len(sql)))
