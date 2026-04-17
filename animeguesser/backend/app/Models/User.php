<?php
// ── User.php ──────────────────────────────────────────────────
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'pseudo', 'email', 'password', 'role', 'avatar', 'xp',
        'is_banned', 'banned_reason', 'banned_at', 'last_login_at',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'is_banned'  => 'boolean',
        'banned_at'  => 'datetime',
        'last_login_at' => 'datetime',
    ];

    public function sessions() { return $this->hasMany(GameSession::class); }
    public function reports()  { return $this->hasMany(Report::class, 'reporter_id'); }
}
