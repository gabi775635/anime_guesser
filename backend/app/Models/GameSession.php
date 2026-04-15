<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameSession extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'mode', 'score_total',
        'rounds_played', 'rounds_correct',
        'started_at', 'ended_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at'   => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function answers()
    {
        return $this->hasMany(SessionAnswer::class, 'session_id');
    }
}
