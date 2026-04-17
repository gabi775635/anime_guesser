<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('pseudo', 50)->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role', 20)->default('joueur'); // admin, moderateur, joueur
            $table->string('avatar')->nullable();
            $table->unsignedBigInteger('xp')->default(0);
            $table->unsignedBigInteger('best_score')->default(0);
            $table->boolean('is_banned')->default(false);
            $table->text('banned_reason')->nullable();
            $table->timestamp('banned_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
