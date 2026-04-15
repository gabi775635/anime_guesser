<?php

namespace App\Http\Controllers;

use App\Models\Character;
use Illuminate\Http\Request;

class CharacterController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Character::with('anime')
                ->when($request->anime_id, fn($q, $id) => $q->where('anime_id', $id))
                ->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'anime_id'    => 'required|exists:animes,id',
            'name'        => 'required|string|max:150',
            'role'        => 'required|in:main,supporting,antagonist',
            'image_url'   => 'nullable|url|max:500',
            'description' => 'nullable|string',
        ]);
        return response()->json(Character::create($data), 201);
    }

    public function update(Request $request, int $id)
    {
        $char = Character::findOrFail($id);
        $data = $request->validate([
            'name'        => 'sometimes|string|max:150',
            'role'        => 'sometimes|in:main,supporting,antagonist',
            'image_url'   => 'nullable|url|max:500',
            'description' => 'nullable|string',
        ]);
        $char->update($data);
        return response()->json($char);
    }

    public function destroy(int $id)
    {
        Character::findOrFail($id)->delete();
        return response()->json(['message' => 'Personnage supprimé.']);
    }
}
