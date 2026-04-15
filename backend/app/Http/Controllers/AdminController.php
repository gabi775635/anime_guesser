<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function users(Request $request)
    {
        $users = User::query()
            ->when($request->search, fn($q, $s) =>
                $q->where('pseudo', 'like', "%$s%")->orWhere('email', 'like', "%$s%"))
            ->when($request->role, fn($q, $r) => $q->where('role', $r))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($users);
    }

    public function changeRole(Request $request, int $id)
    {
        $data = $request->validate(['role' => 'required|in:admin,moderateur,joueur']);
        $user = User::findOrFail($id);
        $user->update(['role' => $data['role']]);
        return response()->json($user);
    }

    public function ban(Request $request, int $id)
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $user = User::findOrFail($id);
        $user->update([
            'is_banned'     => true,
            'banned_reason' => $data['reason'],
            'banned_at'     => now(),
        ]);
        $user->tokens()->delete();
        return response()->json(['message' => 'Utilisateur banni.']);
    }

    public function unban(int $id)
    {
        User::findOrFail($id)->update([
            'is_banned'     => false,
            'banned_reason' => null,
            'banned_at'     => null,
        ]);
        return response()->json(['message' => 'Utilisateur débanni.']);
    }

    public function destroy(int $id)
    {
        User::findOrFail($id)->delete();
        return response()->json(['message' => 'Compte supprimé.']);
    }
}
