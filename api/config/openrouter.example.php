<?php
// OpenRouter — kluc a model pre analyzu livescore stranok.
// Skutocny subor openrouter.php nepatri do gitu (obsahuje kluc).
//
// Kluc: https://openrouter.ai/keys
// Modely: https://openrouter.ai/models

define('OPENROUTER_KEY',   'sk-or-v1-...');
// Bezplatne modely maju priponu :free. Maju nizsie limity na pocet
// poziadaviek za minutu, na testovanie livescore to staci.
define('OPENROUTER_MODEL', 'google/gemma-4-31b-it:free');
define('OPENROUTER_URL',   'https://openrouter.ai/api/v1/chat/completions');
