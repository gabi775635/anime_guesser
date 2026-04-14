<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServerMetric extends Model
{
    public $timestamps = false;
    const CREATED_AT = 'recorded_at';

    protected $fillable = [
        'cpu_load_1', 'cpu_load_5', 'cpu_load_15',
        'ram_used_mb', 'ram_total_mb',
        'active_connections',
        'disk_used_gb', 'disk_total_gb',
    ];
}
