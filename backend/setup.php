<?php
/**
 * ============================================================
 *  ANIME GUESSER — Setup BDD standalone
 *  Lance : php setup.php
 *  Crée toutes les tables + insère les données de test
 * ============================================================
 */

// ──────────────────────────────────────────────────────────────
//  CONFIG — modifie ces valeurs
// ──────────────────────────────────────────────────────────────
define('DB_HOST',     'localhost');
define('DB_PORT',     '3306');
define('DB_NAME',     'anime_guesser');
define('DB_USER',     'root');
define('DB_PASS',     '');
define('DB_CHARSET',  'utf8mb4');

// ──────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────
function log_info(string $msg): void  { echo "\033[32m[✓]\033[0m $msg\n"; }
function log_warn(string $msg): void  { echo "\033[33m[!]\033[0m $msg\n"; }
function log_error(string $msg): void { echo "\033[31m[✗]\033[0m $msg\n"; exit(1); }
function log_title(string $msg): void { echo "\n\033[36m── $msg ──\033[0m\n"; }

function hash_password(string $plain): string {
    return password_hash($plain, PASSWORD_BCRYPT, ['cost' => 12]);
}

// ──────────────────────────────────────────────────────────────
//  CONNEXION — crée la BDD si elle n'existe pas
// ──────────────────────────────────────────────────────────────
log_title('Connexion MySQL');

try {
    $dsn_no_db = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=" . DB_CHARSET;
    $pdo_root = new PDO($dsn_no_db, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    // Par :
$pdo_root->exec("DROP DATABASE IF EXISTS `" . DB_NAME . "`");
$pdo_root->exec("CREATE DATABASE `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
log_warn("Base '" . DB_NAME . "' supprimée et recrée.");
    log_info("Base de données '" . DB_NAME . "' prête.");

    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    log_info("Connexion établie.");
} catch (PDOException $e) {
    log_error("Connexion impossible : " . $e->getMessage());
}

// ──────────────────────────────────────────────────────────────
//  MIGRATIONS — création des tables
// ──────────────────────────────────────────────────────────────
log_title('Création des tables');

$tables = [

'users' => "CREATE TABLE IF NOT EXISTS `users` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `pseudo`        VARCHAR(50)  NOT NULL UNIQUE,
    `email`         VARCHAR(150) NOT NULL UNIQUE,
    `password`      VARCHAR(255) NOT NULL,
    `role`          ENUM('admin','moderateur','joueur') NOT NULL DEFAULT 'joueur',
    `avatar`        VARCHAR(255) NULL,
    `xp`            INT UNSIGNED NOT NULL DEFAULT 0,
    `is_banned`     TINYINT(1)   NOT NULL DEFAULT 0,
    `banned_reason` TEXT         NULL,
    `banned_at`     TIMESTAMP    NULL,
    `last_login_at` TIMESTAMP    NULL,
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'personal_access_tokens' => "CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
    `id`            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tokenable_type` VARCHAR(255) NOT NULL,
    `tokenable_id`  BIGINT UNSIGNED NOT NULL,
    `name`          VARCHAR(255) NOT NULL,
    `token`         VARCHAR(64)  NOT NULL UNIQUE,
    `abilities`     TEXT         NULL,
    `last_used_at`  TIMESTAMP    NULL,
    `expires_at`    TIMESTAMP    NULL,
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `tokenable` (`tokenable_type`, `tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'animes' => "CREATE TABLE IF NOT EXISTS `animes` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `title`         VARCHAR(255) NOT NULL,
    `title_en`      VARCHAR(255) NULL,
    `synopsis`      TEXT         NOT NULL,
    `year`          YEAR         NULL,
    `genre`         VARCHAR(100) NULL,
    `studio`        VARCHAR(100) NULL,
    `episodes`      SMALLINT     NULL,
    `image_url`     VARCHAR(500) NULL,
    `difficulty`    ENUM('facile','moyen','difficile') NOT NULL DEFAULT 'moyen',
    `mal_id`        INT UNSIGNED NULL COMMENT 'MyAnimeList ID pour futur scraping',
    `anilist_id`    INT UNSIGNED NULL COMMENT 'AniList ID pour futur scraping',
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'characters' => "CREATE TABLE IF NOT EXISTS `characters` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `anime_id`      INT UNSIGNED NOT NULL,
    `name`          VARCHAR(150) NOT NULL,
    `role`          ENUM('main','supporting','antagonist') NOT NULL DEFAULT 'main',
    `image_url`     VARCHAR(500) NULL,
    `description`   TEXT         NULL,
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'rounds' => "CREATE TABLE IF NOT EXISTS `rounds` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `anime_id`      INT UNSIGNED NOT NULL,
    `character_id`  INT UNSIGNED NULL,
    `mode`          ENUM('screenshot','description','portrait') NOT NULL,
    `question_data` JSON         NULL COMMENT 'données spécifiques au mode',
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`anime_id`)     REFERENCES `animes`(`id`)     ON DELETE CASCADE,
    FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'game_sessions' => "CREATE TABLE IF NOT EXISTS `game_sessions` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`       INT UNSIGNED NOT NULL,
    `mode`          ENUM('screenshot','description','portrait') NOT NULL,
    `score_total`   INT UNSIGNED NOT NULL DEFAULT 0,
    `rounds_played` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `rounds_correct` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `started_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ended_at`      TIMESTAMP    NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'session_answers' => "CREATE TABLE IF NOT EXISTS `session_answers` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `session_id`    INT UNSIGNED NOT NULL,
    `round_id`      INT UNSIGNED NOT NULL,
    `answer`        VARCHAR(255) NOT NULL,
    `is_correct`    TINYINT(1)   NOT NULL DEFAULT 0,
    `time_taken_ms` INT UNSIGNED NOT NULL DEFAULT 0,
    `points_earned` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`round_id`)   REFERENCES `rounds`(`id`)        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'server_metrics' => "CREATE TABLE IF NOT EXISTS `server_metrics` (
    `id`                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `cpu_load_1`        FLOAT        NULL COMMENT 'load avg 1 min',
    `cpu_load_5`        FLOAT        NULL COMMENT 'load avg 5 min',
    `cpu_load_15`       FLOAT        NULL COMMENT 'load avg 15 min',
    `ram_used_mb`       INT UNSIGNED NULL,
    `ram_total_mb`      INT UNSIGNED NULL,
    `active_connections` SMALLINT UNSIGNED NULL,
    `disk_used_gb`      FLOAT        NULL,
    `disk_total_gb`     FLOAT        NULL,
    `recorded_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_recorded_at` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'player_metrics' => "CREATE TABLE IF NOT EXISTS `player_metrics` (
    `id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `date`                DATE         NOT NULL UNIQUE,
    `new_registrations`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `active_players`      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `games_played`        INT UNSIGNED NOT NULL DEFAULT 0,
    `avg_score`           FLOAT        NULL,
    `avg_session_duration_s` INT UNSIGNED NULL,
    INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

'reports' => "CREATE TABLE IF NOT EXISTS `reports` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `reporter_id`   INT UNSIGNED NOT NULL,
    `target_id`     INT UNSIGNED NOT NULL,
    `reason`        TEXT         NOT NULL,
    `status`        ENUM('pending','resolved','dismissed') NOT NULL DEFAULT 'pending',
    `resolved_by`   INT UNSIGNED NULL,
    `resolved_at`   TIMESTAMP    NULL,
    `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`target_id`)   REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

];

foreach ($tables as $name => $sql) {
    try {
        $pdo->exec($sql);
        log_info("Table `$name` OK.");
    } catch (PDOException $e) {
        log_error("Erreur table `$name` : " . $e->getMessage());
    }
}

// ──────────────────────────────────────────────────────────────
//  SEEDERS
// ──────────────────────────────────────────────────────────────

// ── Comptes utilisateurs ──────────────────────────────────────
log_title('Seeding users');

$users = [
    ['pseudo' => 'admin',       'email' => 'admin@animeguesser.local',  'password' => hash_password('Admin1234!'),  'role' => 'admin'],
    ['pseudo' => 'moderator1',  'email' => 'mod1@animeguesser.local',   'password' => hash_password('Mod1234!'),    'role' => 'moderateur'],
    ['pseudo' => 'moderator2',  'email' => 'mod2@animeguesser.local',   'password' => hash_password('Mod1234!'),    'role' => 'moderateur'],
    ['pseudo' => 'naruto_fan',  'email' => 'naruto@test.local',         'password' => hash_password('Pass1234!'),   'role' => 'joueur'],
    ['pseudo' => 'otaku42',     'email' => 'otaku42@test.local',        'password' => hash_password('Pass1234!'),   'role' => 'joueur'],
    ['pseudo' => 'weebmaster',  'email' => 'weeb@test.local',           'password' => hash_password('Pass1234!'),   'role' => 'joueur'],
    ['pseudo' => 'senpai_gamer','email' => 'senpai@test.local',         'password' => hash_password('Pass1234!'),   'role' => 'joueur'],
    ['pseudo' => 'kawaii_user', 'email' => 'kawaii@test.local',         'password' => hash_password('Pass1234!'),   'role' => 'joueur'],
    ['pseudo' => 'desu_desu',   'email' => 'desu@test.local',           'password' => hash_password('Pass1234!'),   'role' => 'joueur'],
    ['pseudo' => 'banned_test', 'email' => 'banned@test.local',         'password' => hash_password('Pass1234!'),   'role' => 'joueur', 'is_banned' => 1, 'banned_reason' => 'Triche détectée', 'banned_at' => date('Y-m-d H:i:s')],
];

$stmt = $pdo->prepare("INSERT IGNORE INTO `users` (pseudo, email, password, role, xp, is_banned, banned_reason, banned_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
foreach ($users as $u) {
    $xp = rand(0, 5000);
    $banned = $u['is_banned'] ?? 0;
    $banned_reason = $u['banned_reason'] ?? null;
    $banned_at = $u['banned_at'] ?? null;
    $last_login = date('Y-m-d H:i:s', strtotime('-' . rand(0, 30) . ' days'));
    $stmt->execute([$u['pseudo'], $u['email'], $u['password'], $u['role'], $xp, $banned, $banned_reason, $banned_at, $last_login]);
}
log_info(count($users) . " utilisateurs insérés.");

// ── Animés ───────────────────────────────────────────────────
log_title('Seeding animes');

$animes_data = [
    // FACILE
    ['Naruto',              'Un jeune ninja orphelin porte en lui un démon renard à neuf queues. Sa vie entière est une lutte pour être reconnu et devenir Hokage, le chef de son village.',                                                                  1999, 'Shonen',   'Pierrot',       220, 'https://cdn.myanimelist.net/images/anime/13/17405.jpg',         'facile'],
    ['Dragon Ball Z',       'Goku, guerrier Saiyen, défend la Terre contre des envahisseurs extraterrestres toujours plus puissants. Les combats atteignent des niveaux cosmiques.',                                                                          1989, 'Shonen',   'Toei Animation',291, 'https://cdn.myanimelist.net/images/anime/1277/95895.jpg',        'facile'],
    ['One Piece',           'Monkey D. Luffy, garçon élastique aux pouvoirs du Fruit du Démon, rêve de trouver le légendaire trésor One Piece pour devenir Roi des Pirates.',                                                                               1999, 'Shonen',   'Toei Animation',null,'https://cdn.myanimelist.net/images/anime/6/73245.jpg',           'facile'],
    ['Bleach',              'Ichigo Kurosaki, lycéen ordinaire, obtient accidentellement les pouvoirs d\'un Shinigami et doit combattre des esprits malveillants appelés Hollows.',                                                                          2004, 'Shonen',   'Pierrot',       366, 'https://cdn.myanimelist.net/images/anime/3/40451.jpg',           'facile'],
    ['Sword Art Online',    'Des milliers de joueurs se retrouvent piégés dans un MMORPG en réalité virtuelle où mourir dans le jeu signifie mourir pour de vrai. Kirito doit s\'en échapper.',                                                             2012, 'Isekai',   'A-1 Pictures',  25,  'https://cdn.myanimelist.net/images/anime/11/39717.jpg',          'facile'],
    ['Attack on Titan',     'Dans un monde où l\'humanité vit recluse derrière d\'immenses murailles pour se protéger des Titans, des géants dévorant les humains, Eren Jäger jure de les exterminer.',                                                     2013, 'Shonen',   'Wit Studio',    25,  'https://cdn.myanimelist.net/images/anime/10/47347.jpg',          'facile'],
    ['Death Note',          'Light Yagami trouve un carnet qui tue quiconque y voit son nom écrit. Il décide de créer un monde sans crime, se prenant pour un dieu. Le détective L s\'y oppose.',                                                           2006, 'Thriller', 'Madhouse',      37,  'https://cdn.myanimelist.net/images/anime/9/9453.jpg',            'facile'],
    ['Fullmetal Alchemist: Brotherhood','Deux frères alchimistes cherchent la Pierre Philosophale pour retrouver leurs corps perdus. Ils découvrent une conspiration qui menace tout un pays.',                                                              2009, 'Shonen',   'Bones',         64,  'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',        'facile'],
    ['My Hero Academia',    'Dans un monde où 80% de la population a un super-pouvoir dit Alter, un garçon né sans pouvoir aspire à devenir le plus grand héros.',                                                                                          2016, 'Shonen',   'Bones',         113, 'https://cdn.myanimelist.net/images/anime/10/78745.jpg',          'facile'],
    ['Demon Slayer',        'Tanjiro Kamado devient tueur de démons après que sa famille fut massacrée. Sa sœur Nezuko, transformée en démon, conserve son humanité. Il cherche un remède.',                                                                 2019, 'Shonen',   'ufotable',      26,  'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',        'facile'],

    // MOYEN
    ['Re:Zero',             'Subaru Natsuki est téléporté dans un autre monde et découvre qu\'il peut revenir en arrière dans le temps à chaque mort. Un cadeau qui devient un fardeau.',                                                                   2016, 'Isekai',   'White Fox',     25,  'https://cdn.myanimelist.net/images/anime/11/79410.jpg',          'moyen'],
    ['Steins;Gate',         'Un groupe d\'amis bricoleurs découvre accidentellement comment envoyer des messages dans le passé. Leurs expériences déclenchent des conséquences catastrophiques.',                                                            2011, 'Sci-fi',   'White Fox',     24,  'https://cdn.myanimelist.net/images/anime/5/73199.jpg',           'moyen'],
    ['Hunter x Hunter',     'Gon Freecss rêve de devenir Hunter comme son père disparu. Il découvre un monde d\'aventures, de pouvoirs Nen et de personnages profondément complexes.',                                                                      2011, 'Shonen',   'Madhouse',      148, 'https://cdn.myanimelist.net/images/anime/11/33657.jpg',          'moyen'],
    ['Code Geass',          'Lelouch, prince exilé, obtient le pouvoir de donner des ordres absolus. Il mène une révolution masquée contre l\'empire Britannia pour venger sa mère.',                                                                       2006, 'Mecha',    'Sunrise',       25,  'https://cdn.myanimelist.net/images/anime/5/50331.jpg',           'moyen'],
    ['Violet Evergarden',   'Violet, ancienne soldate ne connaissant que la guerre, apprend à comprendre les émotions humaines en devenant Poupée de Mémoire, écrivant les lettres des autres.',                                                            2018, 'Drame',    'KyoAni',        13,  'https://cdn.myanimelist.net/images/anime/1795/95088.jpg',        'moyen'],
    ['No Game No Life',     'Deux frères NEET, géniaux joueurs, sont transportés dans un monde régi uniquement par les jeux. Ils partent à la conquête de ce monde avec leur intelligence.',                                                                2014, 'Isekai',   'Madhouse',      12,  'https://cdn.myanimelist.net/images/anime/1074/111944.jpg',       'moyen'],
    ['Made in Abyss',       'Riko, fille d\'exploratrice légendaire, descend dans l\'Abîme, un gouffre mystérieux plein de reliques et de créatures. Elle rencontre un robot humanoïde amnésique.',                                                         2017, 'Aventure', 'Kinema Citrus', 13,  'https://cdn.myanimelist.net/images/anime/6/86733.jpg',           'moyen'],
    ['Overlord',            'Un joueur se retrouve piégé dans son jeu favori à la fermeture des serveurs. Il devient Ainz Ooal Gown, un liche surpuissant, et cherche à comprendre ce nouveau monde.',                                                     2015, 'Isekai',   'Madhouse',      13,  'https://cdn.myanimelist.net/images/anime/7/88019.jpg',           'moyen'],
    ['Mob Psycho 100',      'Shigeo "Mob" Kageyama, collégien discret, est un esper extraordinairement puissant. Il refoule ses émotions par peur de perdre le contrôle.',                                                                                 2016, 'Shonen',   'Bones',         12,  'https://cdn.myanimelist.net/images/anime/8/80356.jpg',           'moyen'],
    ['The Rising of the Shield Hero','Naofumi est invoqué comme Héros du Bouclier mais accusé à tort et abandonné de tous. Il reconstruit sa force avec une équipe de laissés-pour-compte.',                                                              2019, 'Isekai',   'Kinema Citrus', 25,  'https://cdn.myanimelist.net/images/anime/1245/96960.jpg',        'moyen'],

    // DIFFICILE
    ['Neon Genesis Evangelion','Dans un futur post-apocalyptique, des adolescents pilotent des robots géants pour combattre des entités appelées Anges. Une exploration profonde de la psyché humaine.',                                                     1995, 'Mecha',    'Gainax',        26,  'https://cdn.myanimelist.net/images/anime/1314/108941.jpg',       'difficile'],
    ['Serial Experiments Lain','Lain, adolescente introvertie, reçoit un email d\'une camarade décédée. Elle plonge dans le Wired, réseau mondial, et questionne la frontière entre réalité et virtualité.',                                               1998, 'Cyberpunk','Triangle Staff', 13,  'https://cdn.myanimelist.net/images/anime/1935/108745.jpg',       'difficile'],
    ['Monogatari Series',   'Koyomi Araragi, lycéen demi-vampire, aide des jeunes filles aux prises avec des aberrations surnaturelles. Réflexions sur le langage, l\'identité et les relations.',                                                          2009, 'Mystère',  'Shaft',         15,  'https://cdn.myanimelist.net/images/anime/11/75199.jpg',          'difficile'],
    ['Legend of the Galactic Heroes','Conflit épique entre deux puissances galactiques sur plusieurs décennies. Portrait politique et militaire complexe sans manichéisme.',                                                                               1988, 'Sci-fi',   'Artland',       110, 'https://cdn.myanimelist.net/images/anime/1988/95633.jpg',        'difficile'],
    ['Texhnolyze',          'Dans une ville souterraine en décomposition, des factions se battent pour le contrôle. Une œuvre sombre et quasi sans dialogue sur la décadence humaine.',                                                                     2003, 'Cyberpunk','Madhouse',       22,  'https://cdn.myanimelist.net/images/anime/1890/99997.jpg',        'difficile'],
    ['Haibane Renmei',      'Des êtres ailés appelés Haibane apparaissent dans une ville mystérieuse entourée de murs. Une méditation poétique sur la culpabilité, la grâce et l\'acceptation.',                                                           2002, 'Drame',    'Radix',         13,  'https://cdn.myanimelist.net/images/anime/3/7163.jpg',            'difficile'],
    ['The Tatami Galaxy',   'Un étudiant revit encore et encore ses deux premières années d\'université en cherchant sa vie de campus idéale. Une exploration non-linéaire des regrets.',                                                                   2010, 'Comédie',  'Madhouse',      11,  'https://cdn.myanimelist.net/images/anime/1990/96469.jpg',        'difficile'],
    ['Kaiba',               'Kaiba se réveille sans souvenirs dans un monde où les mémoires sont stockées dans des puces échangeables. Une quête identitaire visuellement surréaliste.',                                                                    2008, 'Sci-fi',   'Madhouse',      12,  'https://cdn.myanimelist.net/images/anime/1970/96369.jpg',        'difficile'],
    ['Paranoia Agent',      'Une série d\'agressions commises par un mystérieux garçon en rollers sème la panique dans Tokyo. Une critique sociale de Satoshi Kon sur le refus de la réalité.',                                                             2004, 'Thriller', 'Madhouse',      13,  'https://cdn.myanimelist.net/images/anime/1280/109218.jpg',       'difficile'],
    ['Ergo Proxy',          'Re-l Mayer enquête sur des meurtres commis par des androïdes dans une cité sous dôme post-apocalyptique. Elle découvre la vérité sur l\'humanité et les Proxies.',                                                             2006, 'Cyberpunk','Manglobe',       23,  'https://cdn.myanimelist.net/images/anime/6/10069.jpg',           'difficile'],
];

$stmt_anime = $pdo->prepare("INSERT IGNORE INTO `animes` (title, synopsis, year, genre, studio, episodes, image_url, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
$anime_ids = [];
foreach ($animes_data as $a) {
    $stmt_anime->execute($a);
    $id = $pdo->lastInsertId();
    if ($id == 0) {
        // Déjà existant, on récupère l'id
        $s = $pdo->prepare("SELECT id FROM animes WHERE title = ?");
        $s->execute([$a[0]]);
        $row = $s->fetch();
        $id = $row['id'];
    }
    $anime_ids[$a[0]] = $id;
}
log_info(count($animes_data) . " animés insérés.");

// ── Personnages ───────────────────────────────────────────────
log_title('Seeding characters');

$characters_data = [
    ['Naruto',              'Naruto Uzumaki',    'main',       'https://cdn.myanimelist.net/images/characters/2/284121.jpg',  'Ninja porteur du Kyûbi, il rêve de devenir Hokage.'],
    ['Naruto',              'Sasuke Uchiha',     'main',       'https://cdn.myanimelist.net/images/characters/9/131317.jpg',  'Dernier survivant du clan Uchiha, hanté par la vengeance.'],
    ['Naruto',              'Kakashi Hatake',    'supporting', 'https://cdn.myanimelist.net/images/characters/7/284129.jpg',  'Jonin d\'élite et chef de l\'Équipe 7.'],
    ['Dragon Ball Z',       'Goku',              'main',       'https://cdn.myanimelist.net/images/characters/15/72029.jpg',  'Guerrier Saiyen défenseur de la Terre.'],
    ['Dragon Ball Z',       'Vegeta',            'main',       'https://cdn.myanimelist.net/images/characters/1/43880.jpg',   'Prince des Saiyens, rival et allié de Goku.'],
    ['One Piece',           'Monkey D. Luffy',   'main',       'https://cdn.myanimelist.net/images/characters/9/310307.jpg',  'Capitaine des pirates au chapeau de paille.'],
    ['One Piece',           'Roronoa Zoro',      'supporting', 'https://cdn.myanimelist.net/images/characters/3/100534.jpg',  'Épéiste aux trois sabres, bras droit de Luffy.'],
    ['Attack on Titan',     'Eren Jäger',        'main',       'https://cdn.myanimelist.net/images/characters/10/92218.jpg',  'Soldat déterminé à exterminer tous les Titans.'],
    ['Attack on Titan',     'Mikasa Ackerman',   'supporting', 'https://cdn.myanimelist.net/images/characters/9/215563.jpg',  'Combattante prodige, protectrice d\'Eren.'],
    ['Attack on Titan',     'Levi Ackerman',     'supporting', 'https://cdn.myanimelist.net/images/characters/2/241413.jpg',  'Soldat légendaire surnommé l\'Humanité la plus forte.'],
    ['Death Note',          'Light Yagami',      'main',       'https://cdn.myanimelist.net/images/characters/8/37547.jpg',   'Lycéen génial qui se prend pour un dieu de la justice.'],
    ['Death Note',          'L',                 'main',       'https://cdn.myanimelist.net/images/characters/7/37539.jpg',   'Détective mystérieux numéro un mondial.'],
    ['Fullmetal Alchemist: Brotherhood','Edward Elric','main', 'https://cdn.myanimelist.net/images/characters/12/242603.jpg', 'Alchimiste de l\'État à la recherche de la Pierre Philosophale.'],
    ['Fullmetal Alchemist: Brotherhood','Alphonse Elric','main','https://cdn.myanimelist.net/images/characters/8/242604.jpg', 'Âme liée à une armure de métal, frère d\'Edward.'],
    ['Steins;Gate',         'Rintaro Okabe',     'main',       'https://cdn.myanimelist.net/images/characters/15/185851.jpg', 'Chercheur fou qui découvre le voyage dans le temps.'],
    ['Steins;Gate',         'Kurisu Makise',     'main',       'https://cdn.myanimelist.net/images/characters/14/185852.jpg', 'Neuroscientifique prodige, tsundere assumée.'],
    ['Demon Slayer',        'Tanjiro Kamado',    'main',       'https://cdn.myanimelist.net/images/characters/1/419420.jpg',  'Tueur de démons à la recherche d\'un remède pour sa sœur.'],
    ['Demon Slayer',        'Nezuko Kamado',     'main',       'https://cdn.myanimelist.net/images/characters/2/419421.jpg',  'Sœur de Tanjiro transformée en démon conservant son humanité.'],
    ['My Hero Academia',    'Izuku Midoriya',    'main',       'https://cdn.myanimelist.net/images/characters/6/339023.jpg',  'Garçon né sans pouvoir devenant le plus grand héros.'],
    ['My Hero Academia',    'Katsuki Bakugo',    'main',       'https://cdn.myanimelist.net/images/characters/6/339031.jpg',  'Rival explosif de Deku, ambitieux et agressif.'],
    ['Re:Zero',             'Subaru Natsuki',    'main',       'https://cdn.myanimelist.net/images/characters/9/327972.jpg',  'Héros malgré lui avec le pouvoir de ressusciter.'],
    ['Re:Zero',             'Emilia',            'main',       'https://cdn.myanimelist.net/images/characters/8/327973.jpg',  'Demi-elfe candidate royale, amour de Subaru.'],
    ['Violet Evergarden',   'Violet Evergarden', 'main',       'https://cdn.myanimelist.net/images/characters/13/339223.jpg', 'Ancienne soldate apprenant la signification de l\'amour.'],
    ['Neon Genesis Evangelion','Shinji Ikari',   'main',       'https://cdn.myanimelist.net/images/characters/12/339201.jpg', 'Pilote introverti de l\'Eva-01, fils de Gendo.'],
    ['Neon Genesis Evangelion','Rei Ayanami',    'supporting', 'https://cdn.myanimelist.net/images/characters/5/339202.jpg',  'Pilote mystérieuse à l\'identité troublante.'],
    ['Neon Genesis Evangelion','Asuka Langley',  'supporting', 'https://cdn.myanimelist.net/images/characters/7/339203.jpg',  'Pilote allemande fière et compétitive.'],
    ['Code Geass',          'Lelouch vi Britannia','main',     'https://cdn.myanimelist.net/images/characters/15/339301.jpg', 'Prince exilé utilisant son Geass pour renverser l\'empire.'],
    ['Hunter x Hunter',     'Gon Freecss',       'main',       'https://cdn.myanimelist.net/images/characters/7/339401.jpg',  'Garçon innocent à la recherche de son père Hunter.'],
    ['Hunter x Hunter',     'Killua Zoldyck',    'main',       'https://cdn.myanimelist.net/images/characters/3/339402.jpg',  'Assassin né de la famille Zoldyck, meilleur ami de Gon.'],
    ['Mob Psycho 100',      'Shigeo Kageyama',   'main',       'https://cdn.myanimelist.net/images/characters/3/345123.jpg',  'Esper surpuissant qui refoule ses émotions.'],
];

$stmt_char = $pdo->prepare("INSERT IGNORE INTO `characters` (anime_id, name, role, image_url, description) VALUES (?, ?, ?, ?, ?)");
foreach ($characters_data as $c) {
    $anime_title = $c[0];
    if (!isset($anime_ids[$anime_title])) continue;
    $stmt_char->execute([$anime_ids[$anime_title], $c[1], $c[2], $c[3], $c[4]]);
}
log_info(count($characters_data) . " personnages insérés.");

// ── Rounds de jeu ─────────────────────────────────────────────
log_title('Seeding rounds');

$stmt_round = $pdo->prepare("INSERT IGNORE INTO `rounds` (anime_id, mode, question_data) VALUES (?, ?, ?)");
$round_count = 0;

foreach ($animes_data as $a) {
    $anime_id = $anime_ids[$a[0]] ?? null;
    if (!$anime_id) continue;

    // Mode description
    $stmt_round->execute([$anime_id, 'description', json_encode([
        'hint' => substr($a[1], 0, 120) . '...',
        'full' => $a[1],
    ])]);
    $round_count++;

    // Mode screenshot (URL d'image de l'animé)
    $stmt_round->execute([$anime_id, 'screenshot', json_encode([
        'image_url' => $a[6],
        'blur_level' => rand(1, 5),
    ])]);
    $round_count++;
}

// Mode portrait (lié aux personnages)
$stmt_chars_all = $pdo->query("SELECT id, anime_id, name, image_url FROM characters LIMIT 30");
foreach ($stmt_chars_all->fetchAll() as $ch) {
    $stmt_round->execute([$ch['anime_id'], 'portrait', json_encode([
        'character_id'   => $ch['id'],
        'character_name' => $ch['name'],
        'image_url'      => $ch['image_url'],
    ])]);
    $round_count++;
}

log_info("$round_count rounds insérés.");

// ── Sessions et réponses fictives ─────────────────────────────
log_title('Seeding game_sessions & answers');

$all_round_ids = $pdo->query("SELECT id FROM rounds")->fetchAll(PDO::FETCH_COLUMN);
$all_user_ids  = $pdo->query("SELECT id FROM users WHERE role = 'joueur'")->fetchAll(PDO::FETCH_COLUMN);
$modes = ['screenshot', 'description', 'portrait'];

$session_count = 0;
$answer_count  = 0;

foreach ($all_user_ids as $uid) {
    $sessions_nb = rand(5, 20);
    for ($s = 0; $s < $sessions_nb; $s++) {
        $mode = $modes[array_rand($modes)];
        $started_at = date('Y-m-d H:i:s', strtotime('-' . rand(0, 60) . ' days -' . rand(0, 23) . ' hours'));
        $duration   = rand(60, 600);
        $ended_at   = date('Y-m-d H:i:s', strtotime($started_at) + $duration);

        $pdo->prepare("INSERT INTO game_sessions (user_id, mode, started_at, ended_at) VALUES (?, ?, ?, ?)")
            ->execute([$uid, $mode, $started_at, $ended_at]);
        $session_id = $pdo->lastInsertId();
        $session_count++;

        $rounds_nb = rand(5, 10);
        $score = 0;
        $correct = 0;
        shuffle($all_round_ids);
        $picked_rounds = array_slice($all_round_ids, 0, $rounds_nb);

        foreach ($picked_rounds as $rid) {
            $is_correct    = rand(0, 1);
            $time_ms       = rand(1000, 15000);
            $points        = $is_correct ? max(0, 1000 - intdiv($time_ms, 20)) : 0;
            $score        += $points;
            $correct      += $is_correct;

            $pdo->prepare("INSERT INTO session_answers (session_id, round_id, answer, is_correct, time_taken_ms, points_earned) VALUES (?, ?, ?, ?, ?, ?)")
                ->execute([$session_id, $rid, $is_correct ? 'Bonne réponse' : 'Mauvaise réponse', $is_correct, $time_ms, $points]);
            $answer_count++;
        }

        $pdo->prepare("UPDATE game_sessions SET score_total=?, rounds_played=?, rounds_correct=? WHERE id=?")
            ->execute([$score, $rounds_nb, $correct, $session_id]);

        // Mise à jour XP joueur
        $pdo->prepare("UPDATE users SET xp = xp + ? WHERE id = ?")->execute([$score, $uid]);
    }
}
log_info("$session_count sessions, $answer_count réponses insérées.");

// ── Métriques serveur (30 jours d'historique) ─────────────────
log_title('Seeding server_metrics');

$stmt_metric = $pdo->prepare("INSERT INTO server_metrics (cpu_load_1, cpu_load_5, cpu_load_15, ram_used_mb, ram_total_mb, active_connections, disk_used_gb, disk_total_gb, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$metric_count = 0;
for ($h = 720; $h >= 0; $h -= 1) { // toutes les heures sur 30 jours
    $base_cpu = rand(5, 40) / 10;
    $stmt_metric->execute([
        round($base_cpu + (rand(-5,5)/10), 2),
        round($base_cpu + (rand(-3,3)/10), 2),
        round($base_cpu + (rand(-2,2)/10), 2),
        rand(400, 1800),
        2048,
        rand(1, 30),
        round(rand(10, 40) + rand(0,9)/10, 1),
        100.0,
        date('Y-m-d H:i:s', strtotime("-{$h} hours")),
    ]);
    $metric_count++;
}
log_info("$metric_count entrées de métriques serveur insérées.");

// ── Métriques joueurs (30 jours) ──────────────────────────────
log_title('Seeding player_metrics');

$stmt_pm = $pdo->prepare("INSERT IGNORE INTO player_metrics (date, new_registrations, active_players, games_played, avg_score, avg_session_duration_s) VALUES (?, ?, ?, ?, ?, ?)");
for ($d = 30; $d >= 0; $d--) {
    $stmt_pm->execute([
        date('Y-m-d', strtotime("-{$d} days")),
        rand(0, 15),
        rand(5, 80),
        rand(20, 300),
        round(rand(200, 800) + rand(0,9)/10, 1),
        rand(90, 450),
    ]);
}
log_info("31 jours de métriques joueurs insérés.");

// ── Signalements ──────────────────────────────────────────────
log_title('Seeding reports');

if (count($all_user_ids) >= 2) {
    $stmt_report = $pdo->prepare("INSERT INTO reports (reporter_id, target_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?)");
    $reasons = ['Triche présumée', 'Langage inapproprié', 'Spam dans le chat', 'Pseudo offensant', 'Comportement toxique'];
    $statuses = ['pending', 'resolved', 'dismissed'];
    for ($r = 0; $r < 10; $r++) {
        $reporter = $all_user_ids[array_rand($all_user_ids)];
        do { $target = $all_user_ids[array_rand($all_user_ids)]; } while ($target == $reporter);
        $stmt_report->execute([$reporter, $target, $reasons[array_rand($reasons)], $statuses[array_rand($statuses)], date('Y-m-d H:i:s', strtotime('-' . rand(0,20) . ' days'))]);
    }
    log_info("10 signalements insérés.");
}

// ──────────────────────────────────────────────────────────────
//  RÉSUMÉ
// ──────────────────────────────────────────────────────────────
log_title('Setup terminé');
echo "\n";
echo "  Comptes de test :\n";
echo "  ┌────────────────┬─────────────────────────────┬─────────────┬──────────────┐\n";
echo "  │ Pseudo         │ Email                       │ Rôle        │ Mot de passe │\n";
echo "  ├────────────────┼─────────────────────────────┼─────────────┼──────────────┤\n";
echo "  │ admin          │ admin@animeguesser.local     │ admin       │ Admin1234!   │\n";
echo "  │ moderator1     │ mod1@animeguesser.local      │ moderateur  │ Mod1234!     │\n";
echo "  │ naruto_fan     │ naruto@test.local            │ joueur      │ Pass1234!    │\n";
echo "  └────────────────┴─────────────────────────────┴─────────────┴──────────────┘\n";
echo "\n";
log_info("Lance 'php setup.php' à nouveau pour re-seeder sans erreur (INSERT IGNORE).");
echo "\n";
