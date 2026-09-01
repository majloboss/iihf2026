const fs=require('fs'),{Client}=require('pg');
const conf=fs.readFileSync('../api/config/db.php','utf8');
const val=k=>conf.match(new RegExp("define..'"+k+"'..s*,..s*'([^']*)'".replace(/\.\./g,'\\')))[1];
