<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerMetric extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'date', 'new_registrations', 'active_players',
        'games_played', 'avg_score', 'avg_session_duration_s',
    ];
}
