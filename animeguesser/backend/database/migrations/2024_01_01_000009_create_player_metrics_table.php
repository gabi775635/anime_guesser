<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_metrics', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->unsignedInteger('new_registrations')->default(0);
            $table->unsignedInteger('active_players')->default(0);
            $table->unsignedInteger('games_played')->default(0);
            $table->decimal('avg_score', 8, 2)->default(0);
            $table->unsignedInteger('avg_session_duration_s')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_metrics');
    }
};
