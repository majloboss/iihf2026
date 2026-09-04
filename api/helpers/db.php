<?php
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'pgsql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME,
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}

// Existuje stlpec? Sluzi na to, aby appka bezala pred aj po migracii, ktora
// stlpec pridava — migracie spusta clovek rucne a nasadenie kodu s nimi
// nemusi prist naraz.
//
// Vysledok sa drzi v pamati na cely request: information_schema sa inak dopytuje
// pri kazdom volani.
function stlpec_existuje(PDO $pdo, string $schema, string $tabulka, string $stlpec): bool {
    static $cache = [];
    $kluc = "$schema.$tabulka.$stlpec";
    if (isset($cache[$kluc])) return $cache[$kluc];

    $q = $pdo->prepare('SELECT 1 FROM information_schema.columns
                         WHERE table_schema = ? AND table_name = ? AND column_name = ?');
    $q->execute([$schema, $tabulka, $stlpec]);
    return $cache[$kluc] = (bool)$q->fetchColumn();
}
