<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Users ─────────────────────────────────────────────
        $users = [
            ['pseudo' => 'admin',       'email' => 'admin@animeguesser.local',  'password' => Hash::make('Admin1234!'),  'role' => 'admin',       'xp' => 9999],
            ['pseudo' => 'moderator1',  'email' => 'mod1@animeguesser.local',   'password' => Hash::make('Mod1234!'),    'role' => 'moderateur',  'xp' => 3200],
            ['pseudo' => 'moderator2',  'email' => 'mod2@animeguesser.local',   'password' => Hash::make('Mod1234!'),    'role' => 'moderateur',  'xp' => 1800],
            ['pseudo' => 'naruto_fan',  'email' => 'naruto@test.local',         'password' => Hash::make('Pass1234!'),   'role' => 'joueur',      'xp' => 4200],
            ['pseudo' => 'otaku42',     'email' => 'otaku42@test.local',        'password' => Hash::make('Pass1234!'),   'role' => 'joueur',      'xp' => 2750],
            ['pseudo' => 'weebmaster', 'email' => 'weeb@test.local',            'password' => Hash::make('Pass1234!'),   'role' => 'joueur',      'xp' => 1100],
            ['pseudo' => 'senpai_gamer','email'=> 'senpai@test.local',          'password' => Hash::make('Pass1234!'),   'role' => 'joueur',      'xp' => 800],
            ['pseudo' => 'kawaii_user', 'email' => 'kawaii@test.local',         'password' => Hash::make('Pass1234!'),   'role' => 'joueur',      'xp' => 550],
            ['pseudo' => 'banned_test', 'email' => 'banned@test.local',         'password' => Hash::make('Pass1234!'),   'role' => 'joueur',      'xp' => 0, 'is_banned' => 1, 'banned_reason' => 'Triche détectée'],
        ];
        DB::table('users')->insertOrIgnore(array_map(fn($u) => array_merge([
            'is_banned' => 0, 'banned_reason' => null, 'banned_at' => null,
            'last_login_at' => now()->subDays(rand(0, 30)),
            'created_at' => now()->subDays(rand(30, 90)),
            'updated_at' => now(),
        ], $u), $users));

        // ── Animés ────────────────────────────────────────────
        $animes = [
            ['Naruto', 'Un jeune ninja orphelin porte en lui un démon renard. Sa vie entière est une lutte pour être reconnu et devenir Hokage.', 1999, 'Shonen', 'Pierrot', 220, 'facile'],
            ['Dragon Ball Z', 'Goku défend la Terre contre des envahisseurs extraterrestres toujours plus puissants. Les combats atteignent des niveaux cosmiques.', 1989, 'Shonen', 'Toei Animation', 291, 'facile'],
            ['One Piece', 'Monkey D. Luffy, garçon élastique, rêve de trouver le légendaire trésor One Piece pour devenir Roi des Pirates.', 1999, 'Shonen', 'Toei Animation', null, 'facile'],
            ['Bleach', 'Ichigo Kurosaki obtient accidentellement les pouvoirs d\'un Shinigami et doit combattre des esprits malveillants appelés Hollows.', 2004, 'Shonen', 'Pierrot', 366, 'facile'],
            ['Sword Art Online', 'Des milliers de joueurs se retrouvent piégés dans un MMORPG où mourir dans le jeu signifie mourir pour de vrai.', 2012, 'Isekai', 'A-1 Pictures', 25, 'facile'],
            ['Attack on Titan', 'L\'humanité vit recluse derrière d\'immenses murailles pour se protéger des Titans. Eren Jäger jure de les exterminer.', 2013, 'Shonen', 'Wit Studio', 25, 'facile'],
            ['Death Note', 'Light Yagami trouve un carnet qui tue quiconque y voit son nom écrit. Le détective L s\'y oppose.', 2006, 'Thriller', 'Madhouse', 37, 'facile'],
            ['Fullmetal Alchemist: Brotherhood', 'Deux frères alchimistes cherchent la Pierre Philosophale pour retrouver leurs corps perdus.', 2009, 'Shonen', 'Bones', 64, 'facile'],
            ['My Hero Academia', 'Dans un monde où 80% a un super-pouvoir, un garçon né sans pouvoir aspire à devenir le plus grand héros.', 2016, 'Shonen', 'Bones', 113, 'facile'],
            ['Demon Slayer', 'Tanjiro devient tueur de démons après que sa famille fut massacrée. Sa sœur Nezuko conserve son humanité.', 2019, 'Shonen', 'ufotable', 26, 'facile'],
            ['Re:Zero', 'Subaru est téléporté dans un autre monde et découvre qu\'il peut revenir en arrière dans le temps à chaque mort.', 2016, 'Isekai', 'White Fox', 25, 'moyen'],
            ['Steins;Gate', 'Un groupe d\'amis découvre accidentellement comment envoyer des messages dans le passé. Les conséquences sont catastrophiques.', 2011, 'Sci-fi', 'White Fox', 24, 'moyen'],
            ['Hunter x Hunter', 'Gon rêve de devenir Hunter comme son père disparu. Il découvre un monde de pouvoirs Nen complexes.', 2011, 'Shonen', 'Madhouse', 148, 'moyen'],
            ['Code Geass', 'Lelouch, prince exilé, obtient le pouvoir de donner des ordres absolus. Il mène une révolution contre Britannia.', 2006, 'Mecha', 'Sunrise', 25, 'moyen'],
            ['Violet Evergarden', 'Violet, ancienne soldate, apprend à comprendre les émotions en devenant Poupée de Mémoire.', 2018, 'Drame', 'KyoAni', 13, 'moyen'],
            ['No Game No Life', 'Deux frères géniaux sont transportés dans un monde régi uniquement par les jeux.', 2014, 'Isekai', 'Madhouse', 12, 'moyen'],
            ['Made in Abyss', 'Riko descend dans l\'Abîsse mystérieux et rencontre un robot humanoïde amnésique.', 2017, 'Aventure', 'Kinema Citrus', 13, 'moyen'],
            ['Overlord', 'Un joueur se retrouve piégé dans son jeu favori à la fermeture des serveurs. Il devient un liche surpuissant.', 2015, 'Isekai', 'Madhouse', 13, 'moyen'],
            ['Mob Psycho 100', 'Shigeo est un esper extraordinairement puissant qui refoule ses émotions par peur de perdre le contrôle.', 2016, 'Shonen', 'Bones', 12, 'moyen'],
            ['Neon Genesis Evangelion', 'Des adolescents pilotent des robots géants pour combattre des entités appelées Anges. Une exploration de la psyché humaine.', 1995, 'Mecha', 'Gainax', 26, 'difficile'],
            ['Steins;Gate 0', 'Okabe, traumatisé par ses expériences, rencontre une IA basée sur les souvenirs de Kurisu.', 2018, 'Sci-fi', 'White Fox', 23, 'difficile'],
            ['Serial Experiments Lain', 'Lain plonge dans le Wired et questionne la frontière entre réalité et virtualité.', 1998, 'Cyberpunk', 'Triangle Staff', 13, 'difficile'],
            ['Monogatari Series', 'Koyomi aide des jeunes filles aux prises avec des aberrations surnaturelles.', 2009, 'Mystère', 'Shaft', 15, 'difficile'],
            ['Legend of the Galactic Heroes', 'Conflit épique entre deux puissances galactiques sur plusieurs décennies.', 1988, 'Sci-fi', 'Artland', 110, 'difficile'],
            ['Texhnolyze', 'Dans une ville souterraine en décomposition, des factions se battent pour le contrôle.', 2003, 'Cyberpunk', 'Madhouse', 22, 'difficile'],
            ['Haibane Renmei', 'Des êtres ailés apparaissent dans une ville mystérieuse. Une méditation sur la culpabilité et la grâce.', 2002, 'Drame', 'Radix', 13, 'difficile'],
            ['The Tatami Galaxy', 'Un étudiant revit encore et encore ses deux premières années d\'université.', 2010, 'Comédie', 'Madhouse', 11, 'difficile'],
            ['Paranoia Agent', 'Un mystérieux garçon en rollers sème la panique dans Tokyo. Critique sociale de Satoshi Kon.', 2004, 'Thriller', 'Madhouse', 13, 'difficile'],
            ['Ergo Proxy', 'Re-l Mayer enquête sur des meurtres commis par des androïdes dans une cité sous dôme.', 2006, 'Cyberpunk', 'Manglobe', 23, 'difficile'],
            ['Kaiba', 'Kaiba se réveille sans souvenirs dans un monde où les mémoires sont stockées dans des puces.', 2008, 'Sci-fi', 'Madhouse', 12, 'difficile'],
        ];

        foreach ($animes as $a) {
            DB::table('animes')->insertOrIgnore([
                'title' => $a[0], 'synopsis' => $a[1], 'year' => $a[2],
                'genre' => $a[3], 'studio' => $a[4], 'episodes' => $a[5],
                'difficulty' => $a[6], 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        // ── Personnages ───────────────────────────────────────
        $this->seedCharacters();

        // ── Rounds ────────────────────────────────────────────
        $this->seedRounds();

        // ── Métriques 30j ─────────────────────────────────────
        $this->seedMetrics();
    }

    private function seedCharacters(): void
    {
        $chars = [
            ['Naruto', 'Naruto Uzumaki',    'main',       'Ninja porteur du Kyûbi, il rêve de devenir Hokage.'],
            ['Naruto', 'Sasuke Uchiha',     'main',       'Dernier survivant du clan Uchiha, hanté par la vengeance.'],
            ['Naruto', 'Kakashi Hatake',    'supporting', 'Jonin d\'élite et chef de l\'Équipe 7.'],
            ['Dragon Ball Z', 'Goku',       'main',       'Guerrier Saiyen défenseur de la Terre.'],
            ['Dragon Ball Z', 'Vegeta',     'main',       'Prince des Saiyens, rival et allié de Goku.'],
            ['One Piece', 'Monkey D. Luffy','main',       'Capitaine des pirates au chapeau de paille.'],
            ['One Piece', 'Roronoa Zoro',   'supporting', 'Épéiste aux trois sabres, bras droit de Luffy.'],
            ['Attack on Titan', 'Eren Jäger','main',      'Soldat déterminé à exterminer tous les Titans.'],
            ['Attack on Titan', 'Mikasa Ackerman','supporting','Combattante prodige, protectrice d\'Eren.'],
            ['Attack on Titan', 'Levi Ackerman','supporting','L\'Humanité la plus forte.'],
            ['Death Note', 'Light Yagami',  'main',       'Lycéen génial qui se prend pour un dieu de la justice.'],
            ['Death Note', 'L',             'main',       'Détective mystérieux numéro un mondial.'],
            ['Steins;Gate', 'Rintaro Okabe','main',       'Chercheur fou qui découvre le voyage dans le temps.'],
            ['Steins;Gate', 'Kurisu Makise','main',       'Neuroscientifique prodige, tsundere assumée.'],
            ['Demon Slayer', 'Tanjiro Kamado','main',     'Tueur de démons à la recherche d\'un remède.'],
            ['Demon Slayer', 'Nezuko Kamado','main',      'Sœur transformée en démon conservant son humanité.'],
            ['My Hero Academia', 'Izuku Midoriya','main', 'Garçon né sans pouvoir devenant le plus grand héros.'],
            ['My Hero Academia', 'Katsuki Bakugo','main', 'Rival explosif de Deku, ambitieux et agressif.'],
            ['Re:Zero', 'Subaru Natsuki',   'main',       'Héros malgré lui avec le pouvoir de ressusciter.'],
            ['Re:Zero', 'Emilia',           'main',       'Demi-elfe candidate royale, amour de Subaru.'],
            ['Violet Evergarden', 'Violet Evergarden','main','Ancienne soldate apprenant la signification de l\'amour.'],
            ['Neon Genesis Evangelion', 'Shinji Ikari','main','Pilote introverti de l\'Eva-01, fils de Gendo.'],
            ['Neon Genesis Evangelion', 'Rei Ayanami','supporting','Pilote mystérieuse à l\'identité troublante.'],
            ['Neon Genesis Evangelion', 'Asuka Langley','supporting','Pilote allemande fière et compétitive.'],
            ['Code Geass', 'Lelouch vi Britannia','main','Prince exilé utilisant son Geass pour renverser l\'empire.'],
            ['Hunter x Hunter', 'Gon Freecss','main',    'Garçon innocent à la recherche de son père Hunter.'],
            ['Hunter x Hunter', 'Killua Zoldyck','main', 'Assassin né de la famille Zoldyck, meilleur ami de Gon.'],
            ['Mob Psycho 100', 'Shigeo Kageyama','main', 'Esper surpuissant qui refoule ses émotions.'],
        ];

        foreach ($chars as $c) {
            $anime = DB::table('animes')->where('title', $c[0])->first();
            if (!$anime) continue;
            DB::table('characters')->insertOrIgnore([
                'anime_id'    => $anime->id,
                'name'        => $c[1],
                'role'        => $c[2],
                'description' => $c[3],
                'created_at'  => now(),
            ]);
        }
    }

    private function seedRounds(): void
    {
        $animes = DB::table('animes')->get();
        foreach ($animes as $anime) {
            // Description
            DB::table('rounds')->insert([
                'anime_id'      => $anime->id,
                'mode'          => 'description',
                'question_data' => json_encode(['hint' => mb_substr($anime->synopsis, 0, 120) . '...', 'full' => $anime->synopsis]),
                'created_at'    => now(),
            ]);
            // Screenshot
            DB::table('rounds')->insert([
                'anime_id'      => $anime->id,
                'mode'          => 'screenshot',
                'question_data' => json_encode(['image_url' => $anime->image_url, 'blur_level' => rand(2, 5)]),
                'created_at'    => now(),
            ]);
        }
        // Portrait
        $chars = DB::table('characters')->get();
        foreach ($chars as $ch) {
            DB::table('rounds')->insert([
                'anime_id'     => $ch->anime_id,
                'character_id' => $ch->id,
                'mode'         => 'portrait',
                'question_data'=> json_encode(['character_id' => $ch->id, 'character_name' => $ch->name, 'image_url' => $ch->image_url ?? '']),
                'created_at'   => now(),
            ]);
        }
    }

    private function seedMetrics(): void
    {
        for ($d = 30; $d >= 0; $d--) {
            DB::table('player_metrics')->insertOrIgnore([
                'date'                   => now()->subDays($d)->format('Y-m-d'),
                'new_registrations'      => rand(0, 15),
                'active_players'         => rand(5, 80),
                'games_played'           => rand(20, 300),
                'avg_score'              => rand(200, 800) + rand(0, 9) / 10,
                'avg_session_duration_s' => rand(90, 450),
            ]);
        }

        for ($h = 168; $h >= 0; $h--) {
            $base = rand(5, 40) / 10;
            DB::table('server_metrics')->insert([
                'cpu_load_1'         => round($base + rand(-5, 5) / 10, 2),
                'cpu_load_5'         => round($base + rand(-3, 3) / 10, 2),
                'cpu_load_15'        => round($base + rand(-2, 2) / 10, 2),
                'ram_used_mb'        => rand(400, 1800),
                'ram_total_mb'       => 2048,
                'active_connections' => rand(0, 30),
                'disk_used_gb'       => rand(10, 40) + rand(0, 9) / 10,
                'disk_total_gb'      => 100.0,
                'recorded_at'        => now()->subHours($h),
            ]);
        }
    }
}
