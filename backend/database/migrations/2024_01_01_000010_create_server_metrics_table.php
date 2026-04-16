<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('server_metrics', function (Blueprint $table) {
            $table->id();
            $table->decimal('cpu_load_1', 5, 2)->default(0);
            $table->decimal('cpu_load_5', 5, 2)->default(0);
            $table->decimal('cpu_load_15', 5, 2)->default(0);
            $table->unsignedInteger('ram_used_mb')->default(0);
            $table->unsignedInteger('ram_total_mb')->default(0);
            $table->unsignedInteger('active_connections')->default(0);
            $table->decimal('disk_used_gb', 8, 2)->default(0);
            $table->decimal('disk_total_gb', 8, 2)->default(0);
            $table->timestamp('recorded_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_metrics');
    }
};
