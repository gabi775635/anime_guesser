<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('animes', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('title_en')->nullable();
            $table->text('synopsis')->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('genre', 100)->nullable();
            $table->string('studio', 100)->nullable();
            $table->unsignedSmallInteger('episodes')->nullable();
            $table->string('image_url')->nullable();
            $table->enum('difficulty', ['facile', 'moyen', 'difficile'])->default('moyen');
            $table->unsignedBigInteger('mal_id')->nullable()->unique();
            $table->unsignedBigInteger('anilist_id')->nullable()->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('animes');
    }
};
