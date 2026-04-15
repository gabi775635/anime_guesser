<?php

namespace App\Http\Controllers;

use App\Models\ServerMetric;
use App\Models\PlayerMetric;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Http\Request;

class MetricsController extends Controller
{
    public function server(Request $request)
    {
        $hours = (int) $request->query('hours', 24);
        return response()->json(
            ServerMetric::where('recorded_at', '>=', now()->subHours($hours))
                ->orderBy('recorded_at')
                ->get()
        );
    }

    public function players(Request $request)
    {
        $days = (int) $request->query('days', 30);
        return response()->json(
            PlayerMetric::where('date', '>=', now()->subDays($days))
                ->orderBy('date')
                ->get()
        );
    }

    public function live(Request $request)
    {
        // CPU
        $load = function_exists('sys_getloadavg') ? sys_getloadavg() : [0.0, 0.0, 0.0];

        // RAM (Linux)
        $ram_total = 0;
        $ram_used  = 0;
        if (PHP_OS_FAMILY === 'Linux' && file_exists('/proc/meminfo')) {
            $meminfo = file_get_contents('/proc/meminfo');
            preg_match('/MemTotal:\s+(\d+)/', $meminfo, $mt);
            preg_match('/MemAvailable:\s+(\d+)/', $meminfo, $ma);
            $ram_total = isset($mt[1]) ? intdiv((int)$mt[1], 1024) : 0;
            $ram_used  = $ram_total - (isset($ma[1]) ? intdiv((int)$ma[1], 1024) : 0);
        }

        // Disk
        $disk_total = round(disk_total_space('/') / 1073741824, 1);
        $disk_used  = round(($disk_total - disk_free_space('/') / 1073741824), 1);

        // Joueurs
        $active_now  = GameSession::whereNull('ended_at')
            ->where('started_at', '>=', now()->subMinutes(30))->count();
        $total_users = User::count();
        $today_games = GameSession::whereDate('started_at', today())->count();
        $today_new   = User::whereDate('created_at', today())->count();

        // Snapshot BDD
        ServerMetric::create([
            'cpu_load_1'         => $load[0],
            'cpu_load_5'         => $load[1],
            'cpu_load_15'        => $load[2],
            'ram_used_mb'        => $ram_used,
            'ram_total_mb'       => $ram_total,
            'active_connections' => $active_now,
            'disk_used_gb'       => $disk_used,
            'disk_total_gb'      => $disk_total,
        ]);

        return response()->json([
            'cpu'  => ['load_1' => $load[0], 'load_5' => $load[1], 'load_15' => $load[2]],
            'ram'  => ['used_mb' => $ram_used, 'total_mb' => $ram_total],
            'disk' => ['used_gb' => $disk_used, 'total_gb' => $disk_total],
            'players' => compact('active_now', 'total_users', 'today_games', 'today_new'),
            'recorded_at' => now()->toISOString(),
        ]);
    }
}
