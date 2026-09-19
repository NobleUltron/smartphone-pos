<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $notifications = [];
        if ($request->user() && in_array($request->user()->role, ['admin', 'manager'])) {
            // Defective Items (cached for 90s to avoid DB load on every request)
            $defectiveCount = Cache::remember('global_defective_count', 90, function () {
                return \App\Models\DeviceImei::where('status', 'Defective')->count();
            });
            if ($defectiveCount > 0) {
                $notifications[] = [
                    'id' => 'defective',
                    'title' => 'Defective Items',
                    'description' => $defectiveCount . ' items are currently marked as defective.',
                    'type' => 'danger',
                    'url' => route('inventory.index'),
                    'time' => 'Action Required'
                ];
            }

            // Unified high-performance low stock count (cached for 90s to prevent subquery overhead on navigation)
            $totalLowStock = Cache::remember('global_low_stock_count', 90, function () {
                return \App\Models\Product::where(function ($query) {
                    $query->where('type', 'bulk')
                          ->where('quantity', '<=', 5);
                })->orWhere(function ($query) {
                    $query->where('type', 'serialized')
                          ->whereRaw("(SELECT COUNT(*) FROM device_imeis WHERE device_imeis.product_id = products.id AND device_imeis.status = 'In Stock') <= 5");
                })->count();
            });

            if ($totalLowStock > 0) {
                $notifications[] = [
                    'id' => 'low-stock',
                    'title' => 'Low Stock Alert',
                    'description' => $totalLowStock . ' product(s) are running critically low or out of stock.',
                    'type' => 'warning',
                    'url' => route('inventory.index'),
                    'time' => 'Action Required'
                ];
            }
        }

        // Notifications for ALL users
        if ($request->user()) {
            $overdueCount = Cache::remember('global_overdue_dealer_items_count', 90, function () {
                return \App\Models\DealerItem::where('status', 'Pending')
                    ->whereNotNull('expected_return_date')
                    ->where('expected_return_date', '<', \Carbon\Carbon::today())
                    ->count();
            });

            if ($overdueCount > 0) {
                $notifications[] = [
                    'id' => 'overdue-dealer-items',
                    'title' => 'Overdue Dealer Items',
                    'description' => $overdueCount . ' item(s) are past their expected return date.',
                    'type' => 'warning',
                    'url' => route('dealers.index'),
                    'time' => 'Action Required'
                ];
            }
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'permissions' => [
                'allow_cashier_discounts' => (bool) \App\Models\Setting::get('allow_cashier_discounts', true),
                'allow_cashier_price_overwrites' => (bool) \App\Models\Setting::get('allow_cashier_price_overwrites', true),
                'allow_cashier_dealer_intake' => (bool) \App\Models\Setting::get('allow_cashier_dealer_intake', true),
            ],
            'notifications' => $notifications,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ];
    }
}
