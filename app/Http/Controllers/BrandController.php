<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:brands,name',
        ]);

        $brand = Brand::create($validated);
        
        return response()->json(['success' => true, 'brand' => $brand]);
    }

    public function destroy(Brand $brand)
    {
        try {
            $brand->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cannot delete brand. It may be linked to existing products.'], 400);
        }
    }
}
