<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\AnimeController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ModController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\ProfileController;

// ── AUTH PUBLIC ───────────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// ── AUTHENTIFIÉ ───────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Profil
    Route::get('/profile',         [ProfileController::class, 'show']);
    Route::put('/profile',         [ProfileController::class, 'update']);
    Route::get('/profile/history', [ProfileController::class, 'history']);
    Route::get('/leaderboard',     [ProfileController::class, 'leaderboard']);

    // Jeu
    Route::get('/game/round',            [GameController::class, 'getRound']);
    Route::post('/game/session/start',   [GameController::class, 'startSession']);
    Route::post('/game/session/answer',  [GameController::class, 'submitAnswer']);
    Route::post('/game/session/end',     [GameController::class, 'endSession']);

    // ── MODERATEUR + ADMIN ────────────────────────────────────
    Route::middleware('role:moderateur,admin')->group(function () {
        Route::apiResource('/animes',     AnimeController::class);
        Route::apiResource('/characters', CharacterController::class);
        Route::get('/reports',            [ModController::class, 'index']);
        Route::patch('/reports/{id}',     [ModController::class, 'resolve']);
    });

    // ── ADMIN UNIQUEMENT ──────────────────────────────────────
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/users',               [AdminController::class, 'users']);
        Route::patch('/admin/users/{id}/role',   [AdminController::class, 'changeRole']);
        Route::patch('/admin/users/{id}/ban',    [AdminController::class, 'ban']);
        Route::patch('/admin/users/{id}/unban',  [AdminController::class, 'unban']);
        Route::delete('/admin/users/{id}',       [AdminController::class, 'destroy']);

        Route::get('/metrics/server',  [MetricsController::class, 'server']);
        Route::get('/metrics/players', [MetricsController::class, 'players']);
        Route::get('/metrics/live',    [MetricsController::class, 'live']);
    });
});
