<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;

class ModController extends Controller
{
    public function index(Request $request)
    {
        $reports = Report::with(['reporter', 'target'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderByRaw("FIELD(status,'pending','resolved','dismissed')")
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($reports);
    }

    public function resolve(Request $request, int $id)
    {
        $data   = $request->validate(['status' => 'required|in:resolved,dismissed']);
        $report = Report::findOrFail($id);
        $report->update([
            'status'      => $data['status'],
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);
        return response()->json($report);
    }
}
