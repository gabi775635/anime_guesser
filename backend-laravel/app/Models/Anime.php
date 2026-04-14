<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Anime extends Model
{
    protected $fillable = [
        'title', 'title_en', 'synopsis', 'year', 'genre', 'studio',
        'episodes', 'image_url', 'difficulty', 'mal_id', 'anilist_id',
    ];

    public function characters() { return $this->hasMany(Character::class); }
    public function rounds()     { return $this->hasMany(Round::class); }
}
