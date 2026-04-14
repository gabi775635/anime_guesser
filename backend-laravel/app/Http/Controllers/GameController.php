<?php

namespace App\Http\Controllers;

use App\Models\Round;
use App\Models\GameSession;
use App\Models\SessionAnswer;
use Illuminate\Http\Request;

class GameController extends Controller
{
    /**
     * Score max par round : 1000 pts (base 1000 - temps écoulé).
     * Le frontend normalise sur 10 rounds → score total /1000.
     */
    const MAX_POINTS_PER_ROUND = 1000;
    const TIMER_PENALTY_PER_MS = 20; // -1 pt par 20ms écoulés

    public function getRound(Request $request)
    {
        $mode = $request->query('mode', 'description');

        $round = Round::with('anime')
            ->where('mode', $mode)
            ->inRandomOrder()
            ->firstOrFail();

        return response()->json([
            'round_id'      => $round->id,
            'mode'          => $round->mode,
            'question_data' => $round->question_data,
            'difficulty'    => $round->anime->difficulty,
        ]);
    }

    public function startSession(Request $request)
    {
        $data = $request->validate([
            'mode' => 'required|in:screenshot,description,portrait',
        ]);

        $session = GameSession::create([
            'user_id'    => $request->user()->id,
            'mode'       => $data['mode'],
            'started_at' => now(),
        ]);

        return response()->json(['session_id' => $session->id]);
    }

    public function submitAnswer(Request $request)
    {
        $data = $request->validate([
            'session_id'    => 'required|integer|exists:game_sessions,id',
            'round_id'      => 'required|integer|exists:rounds,id',
            'answer'        => 'required|string|max:255',
            'time_taken_ms' => 'required|integer|min:0',
        ]);

        $round = Round::with('anime')->findOrFail($data['round_id']);

        $answer_lower  = mb_strtolower(trim($data['answer']));
        $correct_lower = mb_strtolower($round->anime->title);
        $is_correct    = str_contains($correct_lower, $answer_lower)
                      || str_contains($answer_lower, $correct_lower);

        // Score sur 1000 : soustraction basée sur le temps
        $points = 0;
        if ($is_correct) {
            $points = max(0, self::MAX_POINTS_PER_ROUND - intdiv($data['time_taken_ms'], self::TIMER_PENALTY_PER_MS));
        }

        SessionAnswer::create([
            'session_id'    => $data['session_id'],
            'round_id'      => $data['round_id'],
            'answer'        => $data['answer'],
            'is_correct'    => $is_correct,
            'time_taken_ms' => $data['time_taken_ms'],
            'points_earned' => $points,
        ]);

        if ($is_correct) {
            $request->user()->increment('xp', $points);
        }

        return response()->json([
            'is_correct'     => $is_correct,
            'correct_answer' => $round->anime->title,
            'points_earned'  => $points,
            'max_points'     => self::MAX_POINTS_PER_ROUND,
        ]);
    }

    public function endSession(Request $request)
    {
        $data = $request->validate([
            'session_id' => 'required|integer|exists:game_sessions,id',
        ]);

        $session = GameSession::findOrFail($data['session_id']);
        $answers = SessionAnswer::where('session_id', $session->id)->get();

        $score_total    = $answers->sum('points_earned');
        $rounds_played  = $answers->count();
        $rounds_correct = $answers->where('is_correct', true)->count();

        $session->update([
            'score_total'    => $score_total,
            'rounds_played'  => $rounds_played,
            'rounds_correct' => $rounds_correct,
            'ended_at'       => now(),
        ]);

        // Mise à jour best_score sur l'utilisateur si dépassé
        $user = $request->user();
        if (!isset($user->best_score) || $score_total > ($user->best_score ?? 0)) {
            $user->update(['best_score' => $score_total]);
        }

        return response()->json([
            'session'        => $session,
            'score_total'    => $score_total,
            'rounds_played'  => $rounds_played,
            'rounds_correct' => $rounds_correct,
            'accuracy'       => $rounds_played > 0 ? round($rounds_correct / $rounds_played * 100) : 0,
        ]);
    }
}
