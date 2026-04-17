<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Round extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'anime_id', 'character_id', 'mode', 'question_data',
    ];

    protected $casts = [
        'question_data' => 'array',
    ];

    public function anime()
    {
        return $this->belongsTo(Anime::class);
    }

    public function character()
    {
        return $this->belongsTo(Character::class);
    }
}
