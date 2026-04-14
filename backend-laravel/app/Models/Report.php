<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    public $timestamps = false;
    const CREATED_AT = 'created_at';

    protected $fillable = [
        'reporter_id', 'target_id', 'reason',
        'status', 'resolved_by', 'resolved_at',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function target()
    {
        return $this->belongsTo(User::class, 'target_id');
    }
}
