<?php

namespace App\Http\Controllers;

use App\Models\Anime;
use Illuminate\Http\Request;

class AnimeController extends Controller
{
    public function index(Request $request)
    {
        $animes = Anime::query()
            ->when($request->search, fn($q, $s) => $q->where('title', 'like', "%$s%"))
            ->when($request->difficulty, fn($q, $d) => $q->where('difficulty', $d))
            ->orderBy('title')
            ->paginate(20);

        return response()->json($animes);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'      => 'required|string|max:255',
            'synopsis'   => 'required|string',
            'year'       => 'nullable|integer|min:1900|max:2030',
            'genre'      => 'nullable|string|max:100',
            'studio'     => 'nullable|string|max:100',
            'episodes'   => 'nullable|integer|min:1',
            'image_url'  => 'nullable|url|max:500',
            'difficulty' => 'required|in:facile,moyen,difficile',
        ]);

        $anime = Anime::create($data);
        return response()->json($anime, 201);
    }

    public function show(int $id)
    {
        return response()->json(Anime::with('characters')->findOrFail($id));
    }

    public function update(Request $request, int $id)
    {
        $anime = Anime::findOrFail($id);
        $data  = $request->validate([
            'title'      => 'sometimes|string|max:255',
            'synopsis'   => 'sometimes|string',
            'year'       => 'nullable|integer|min:1900|max:2030',
            'genre'      => 'nullable|string|max:100',
            'studio'     => 'nullable|string|max:100',
            'episodes'   => 'nullable|integer|min:1',
            'image_url'  => 'nullable|url|max:500',
            'difficulty' => 'sometimes|in:facile,moyen,difficile',
        ]);
        $anime->update($data);
        return response()->json($anime);
    }

    public function destroy(int $id)
    {
        Anime::findOrFail($id)->delete();
        return response()->json(['message' => 'Animé supprimé.']);
    }
}
