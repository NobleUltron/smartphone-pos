<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Repair;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Product;
use App\Models\Customer;
use App\Models\User;

class TechnicianPortalController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $activeRepairs = Repair::with(['customer', 'technician', 'parts.brand'])
            ->where('technician_id', $user->id)
            ->whereIn('status', ['Pending', 'In Progress', 'Completed'])
            ->orderBy('created_at', 'desc')
            ->get();

        $completedToday = Repair::where('technician_id', $user->id)
            ->whereIn('status', ['Completed', 'Delivered'])
            ->whereDate('updated_at', Carbon::today())
            ->count();
            
        $totalAssigned = Repair::where('technician_id', $user->id)->count();

        $products = Product::whereHas('category', function($q) {
                            $q->where('name', 'Repair Parts & Services');
                        })
                        ->select('id', 'model_name', 'selling_price', 'quantity', 'category_id', 'brand_id')
                        ->with(['category', 'brand'])
                        ->get()
                        ->map(function ($product) {
                            $name = $product->model_name;
                            if ($product->brand) $name = $product->brand->name . ' ' . $name;
                            return [
                                'id' => $product->id,
                                'name' => $name,
                                'price' => $product->selling_price,
                                'stock' => $product->quantity
                            ];
                        });
        $customers = Customer::orderBy('name')->get();
        $technicians = User::where('role', 'technician')->orderBy('name')->get();

        return Inertia::render('Technician/Dashboard', [
            'technician' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'metrics' => [
                'active_repairs' => $activeRepairs->count(),
                'completed_today' => $completedToday,
                'total_assigned' => $totalAssigned,
            ],
            'activeRepairs' => $activeRepairs,
            'products' => $products,
            'customers' => $customers,
            'technicians' => $technicians,
        ]);
    }
}
