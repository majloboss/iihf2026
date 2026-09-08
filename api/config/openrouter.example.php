<?php
// OpenRouter — kluc a model pre analyzu livescore stranok.
// Skutocny subor openrouter.php nepatri do gitu (obsahuje kluc).
//
// Kluc: https://openrouter.ai/keys
// Modely: https://openrouter.ai/models

define('OPENROUTER_KEY',   'sk-or-v1-...');

// POZOR na priponu :free — ktore modely su bezplatne sa v case meni. Ked
// model prestane byt free, OpenRouter vrati 404 a livescore ticho prestane
// fungovat. Presne to sa stalo 8.9.2026 modelu minimax-m3:free.
//
// Na livescore treba model, ktory spolahlivo vrati JSON. Bezplatne modely
// sa neosvedcili — nvidia/nemotron-3-super-120b:free namiesto JSON zacal
// nahlas uvazovat a odpoved sa orezala na limite tokenov.
//
// minimax-m3: 0,30 USD za 1M vstupnych tokenov, 1,20 za 1M vystupnych,
// cize priblizne 0,0025 USD za jedno volanie livescore.
define('OPENROUTER_MODEL', 'minimax/minimax-m3');
define('OPENROUTER_URL',   'https://openrouter.ai/api/v1/chat/completions');
