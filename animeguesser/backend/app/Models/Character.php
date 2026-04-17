<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Character extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'anime_id', 'name', 'role', 'image_url', 'description',
    ];

    public function anime()
    {
        return $this->belongsTo(Anime::class);
    }
}
