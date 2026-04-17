<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\GameSession;
use App\Models\SessionAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        $sessions_count = GameSession::where('user_id', $user->id)->count();
        $rounds_count   = GameSession::where('user_id', $user->id)->sum('rounds_played');
        $correct_count  = GameSession::where('user_id', $user->id)->sum('rounds_correct');
        $best_score     = GameSession::where('user_id', $user->id)->max('score_total') ?? 0;

        // Stats par mode de jeu
        $modes = ['screenshot', 'description', 'portrait'];
        $mode_stats = [];

        foreach ($modes as $mode) {
            $modeSessions = GameSession::where('user_id', $user->id)
                ->where('mode', $mode);

            $mode_sessions_count  = (clone $modeSessions)->count();
            $mode_rounds_played   = (clone $modeSessions)->sum('rounds_played');
            $mode_rounds_correct  = (clone $modeSessions)->sum('rounds_correct');
            $mode_best_score      = (clone $modeSessions)->max('score_total') ?? 0;

            $mode_stats[$mode] = [
                'sessions_count'  => $mode_sessions_count,
                'rounds_played'   => $mode_rounds_played,
                'rounds_correct'  => $mode_rounds_correct,
                'best_score'      => $mode_best_score,
                'accuracy'        => $mode_rounds_played > 0
                    ? round($mode_rounds_correct / $mode_rounds_played * 100)
                    : 0,
            ];
        }

        return response()->json(array_merge($user->toArray(), [
            'sessions_count' => $sessions_count,
            'rounds_count'   => $rounds_count,
            'correct_count'  => $correct_count,
            'best_score'     => $best_score,
            'mode_stats'     => $mode_stats,
        ]));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'pseudo' => 'sometimes|string|min:3|max:50|unique:users,pseudo,' . $request->user()->id,
            'avatar' => 'nullable|url|max:500',
        ]);
        $request->user()->update($data);
        return response()->json($request->user());
    }

    public function history(Request $request)
    {
        return response()->json(
            GameSession::where('user_id', $request->user()->id)
                ->orderBy('started_at', 'desc')
                ->limit(50)
                ->get()
        );
    }

    public function leaderboard()
    {
        $users = User::where('role', 'joueur')
            ->select('id', 'pseudo', 'xp')
            ->orderBy('xp', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($u) {
                $sessions_count = GameSession::where('user_id', $u->id)->count();
                $rounds         = GameSession::where('user_id', $u->id)->sum('rounds_played');
                $correct        = GameSession::where('user_id', $u->id)->sum('rounds_correct');
                $u->sessions_count = $sessions_count;
                $u->accuracy       = $rounds > 0 ? round($correct / $rounds * 100) : 0;
                return $u;
            });

        return response()->json($users);
    }
}
