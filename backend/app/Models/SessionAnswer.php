<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SessionAnswer extends Model
{
    public $timestamps = false;
    const CREATED_AT = 'created_at';

    protected $fillable = [
        'session_id', 'round_id', 'answer',
        'is_correct', 'time_taken_ms', 'points_earned',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function session()
    {
        return $this->belongsTo(GameSession::class, 'session_id');
    }

    public function round()
    {
        return $this->belongsTo(Round::class);
    }
}
