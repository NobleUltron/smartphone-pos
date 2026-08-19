<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
        ]);

        $category = Category::create($validated);
        
        return response()->json(['success' => true, 'category' => $category]);
    }

    public function destroy(Category $category)
    {
        try {
            $category->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cannot delete category. It may be linked to existing products.'], 400);
        }
    }
}
