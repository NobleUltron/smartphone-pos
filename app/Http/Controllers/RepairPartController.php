<?php

namespace App\Http\Controllers;

use App\Models\Repair;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RepairPartController extends Controller
{
    public function store(Request $request, Repair $repair)
    {
        if (in_array($repair->status, ['Delivered', 'Completed', 'Cancelled'])) {
            return back()->withErrors(['error' => 'You cannot modify parts on a ' . $repair->status . ' repair.']);
        }

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::findOrFail($validated['product_id']);

        if ($product->quantity < $validated['quantity']) {
            return back()->withErrors(['product_id' => 'Insufficient stock for this product.']);
        }

        DB::transaction(function () use ($repair, $product, $validated) {
            // Attach part to repair
            $repair->parts()->attach($product->id, [
                'quantity' => $validated['quantity'],
                'price' => $product->selling_price,
                'cost' => $product->cost_price,
            ]);

            // Deduct inventory
            $product->decrement('quantity', $validated['quantity']);

            // Increment repair final cost
            $repair->increment('estimated_cost', $product->selling_price * $validated['quantity']);

            // Sync with associated sale if it exists
            if ($repair->sale) {
                $repair->sale->increment('total_amount', $product->selling_price * $validated['quantity']);
                $repair->sale->increment('final_amount', $product->selling_price * $validated['quantity']);
            }
        });

        return back()->with('success', 'Part added to repair successfully.');
    }

    public function destroy(Repair $repair, $partId)
    {
        if (in_array($repair->status, ['Delivered', 'Completed', 'Cancelled'])) {
            return back()->withErrors(['error' => 'You cannot modify parts on a ' . $repair->status . ' repair.']);
        }

        $part = $repair->parts()->wherePivot('id', $partId)->firstOrFail();

        DB::transaction(function () use ($repair, $part, $partId) {
            // Restore inventory
            $quantity = $part->pivot->quantity;
            $product = Product::find($part->id);
            if ($product) {
                $product->increment('quantity', $quantity);
            }

            // Decrement repair final cost
            $repair->decrement('estimated_cost', $part->pivot->price * $quantity);

            // Sync with associated sale if it exists
            if ($repair->sale) {
                $repair->sale->decrement('total_amount', $part->pivot->price * $quantity);
                $repair->sale->decrement('final_amount', $part->pivot->price * $quantity);
            }

            // Detach part
            $repair->parts()->wherePivot('id', $partId)->detach($part->id);
        });

        return back()->with('success', 'Part removed from repair successfully.');
    }
}
