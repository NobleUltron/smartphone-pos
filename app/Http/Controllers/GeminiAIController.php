<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\DeviceImei;
use App\Models\Sale;
use App\Models\Repair;
use App\Models\DealerItem;
use App\Models\Supplier;
use App\Models\Purchase;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\LayawayPayment;
use App\Models\InvoicePayment;
use App\Models\PaymentAccount;
use App\Models\Setting;
use Carbon\Carbon;

class GeminiAIController extends Controller
{
    public function ask(Request $request)
    {
        $request->validate(['prompt' => 'required|string|max:1500']);
        $userPrompt = trim($request->prompt);
        $lowerPrompt = strtolower($userPrompt);
        $shopName = Setting::get('shop_name', 'SmartPOS');

        // 1. Gather 100% accurate, privacy-safe live shop analytics (no customer PII, no personal accounts)
        $inStockCount = DeviceImei::where('status', 'In Stock')->count();
        $bulkStockCount = (int) Product::where('type', 'bulk')->where('quantity', '>', 0)->sum('quantity');
        $defectiveCount = DeviceImei::where('status', 'Defective')->count();
        $atSupplierRepairCount = DeviceImei::where('status', 'At Supplier (Repair)')->count();

        $serializedSellingValue = (float) DeviceImei::where('status', 'In Stock')->sum('selling_price');
        $serializedCostValue = (float) DeviceImei::where('status', 'In Stock')->sum('cost_price');
        $bulkCostValue = (float) Product::where('type', 'bulk')->where('quantity', '>', 0)
            ->selectRaw('COALESCE(SUM(quantity * cost_price), 0) as total')->value('total');
        $bulkSellingValue = (float) Product::where('type', 'bulk')->where('quantity', '>', 0)
            ->selectRaw('COALESCE(SUM(quantity * selling_price), 0) as total')->value('total');
        $totalCostValue = $serializedCostValue + $bulkCostValue;
        $totalSellingValue = $serializedSellingValue + $bulkSellingValue;

        // Aging / slow-moving phones
        $aging30Cutoff = now()->subDays(30);
        $aging60Cutoff = now()->subDays(60);
        $aging30Units = DeviceImei::where('status', 'In Stock')->where('created_at', '<=', $aging30Cutoff)->count();
        $aging60Units = DeviceImei::where('status', 'In Stock')->where('created_at', '<=', $aging60Cutoff)->count();
        $aging30Value = (float) DeviceImei::where('status', 'In Stock')->where('created_at', '<=', $aging30Cutoff)->sum('cost_price');

        // Today's revenue (matching Dashboard formula)
        $todayDirectSales = (float) Sale::whereDate('sale_date', Carbon::today())
            ->whereNull('repair_id')
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->where('payment_method', '!=', 'Layaway')
            ->sum('final_amount');
        $todayLayawayPayments = (float) LayawayPayment::whereDate('payment_date', Carbon::today())->sum('amount_paid');
        $todayInvoicePayments = (float) InvoicePayment::whereDate('payment_date', Carbon::today())->sum('amount');
        $todayRefunds = (float) Expense::whereDate('expense_date', Carbon::today())
            ->whereIn('category', ['Refund', 'Refund (Past Shift)'])->sum('amount');
        $todaySalesAmount = $todayDirectSales + $todayLayawayPayments + $todayInvoicePayments - $todayRefunds;
        $todaySalesCount = Sale::where('payment_status', '!=', 'Refunded')->whereDate('sale_date', Carbon::today())->count();
        $todayExpenses = (float) Expense::whereDate('expense_date', Carbon::today())
            ->whereNotIn('category', ['Refund', 'Refund (Past Shift)'])->sum('amount');
        $monthSalesAmount = (float) Sale::where('payment_status', '!=', 'Refunded')
            ->whereDate('sale_date', '>=', Carbon::now()->startOfMonth())->sum('final_amount');
        $totalSalesAmount = (float) Sale::where('payment_status', '!=', 'Refunded')->sum('final_amount');

        // Low stock (1..4 in stock) & Out of stock products (both serialized & bulk)
        $lowStockProducts = Product::with('brand')
            ->withCount(['deviceImeis as in_stock_imeis' => fn($q) => $q->where('status', 'In Stock')])
            ->get()
            ->map(function ($p) {
                $qty = $p->type === 'bulk' ? (int) ($p->quantity ?? 0) : (int) ($p->in_stock_imeis ?? 0);
                $p->computed_stock = $qty;
                return $p;
            })
            ->filter(fn($p) => $p->computed_stock > 0 && $p->computed_stock < 5)
            ->sortBy('computed_stock')
            ->values();

        // Repairs
        $activeRepairsCount = Repair::whereIn('status', ['Pending', 'In Progress'])->count();
        $pendingRepairsCount = Repair::where('status', 'Pending')->count();
        $inProgressRepairsCount = Repair::where('status', 'In Progress')->count();
        $completedTodayCount = Repair::whereIn('status', ['Completed', 'Delivered'])->whereDate('updated_at', Carbon::today())->count();

        // Dealers
        $outwardPendingCount = DealerItem::where(fn($q) => $q->where('direction', 'outward')->orWhereNull('direction'))
            ->where('status', 'Pending')->count();
        $overdueDealerCount = DealerItem::where(fn($q) => $q->where('direction', 'outward')->orWhereNull('direction'))
            ->where('status', 'Pending')
            ->whereNotNull('expected_return_date')
            ->where('expected_return_date', '<', Carbon::today())
            ->count();
        $dealerOwedAmount = (float) DealerItem::where('direction', 'inward')
            ->where('quantity_sold', '>', 0)
            ->get()
            ->sum(fn($item) => max(0, ($item->quantity_sold * (float) ($item->wholesale_cost ?: $item->dealer_price ?: 0)) - (float) ($item->settlement_amount ?? 0)));

        // Layaways & B2B Invoices
        $activeLayaways = Sale::withSum('layawayPayments', 'amount_paid')
            ->where('payment_status', 'Partial')
            ->get();
        $totalLayawayBalance = (float) $activeLayaways->sum(fn($s) => max(0, (float) $s->final_amount - (float) ($s->layaway_payments_sum_amount_paid ?? 0)));
        $invoiceReceivables = (float) Invoice::whereIn('payment_status', ['Unpaid', 'Partial'])
            ->where('status', '!=', 'Cancelled')
            ->selectRaw('COALESCE(SUM(CASE WHEN total_amount - paid_amount > 0 THEN total_amount - paid_amount ELSE 0 END), 0) as total')
            ->value('total');

        // Suppliers (Payables & Credits)
        $supplierPayables = (float) Purchase::where('status', '!=', 'Cancelled')
            ->selectRaw('COALESCE(SUM(CASE WHEN total_amount - paid_amount > 0 THEN total_amount - paid_amount ELSE 0 END), 0) as total')
            ->value('total');
        $supplierCredits = (float) Supplier::sum('credit_balance');
        $pendingPurchasesCount = Purchase::where('status', 'Pending')->count();

        // Business Treasury Wallets (strictly is_personal = false!)
        $businessWallets = PaymentAccount::where('is_active', true)
            ->where('is_personal', false)
            ->orderBy('type')
            ->orderBy('name')
            ->get(['name', 'type', 'current_balance']);
        $totalLiquidity = (float) $businessWallets->sum('current_balance');

        // Stock by brand
        $brandStock = DB::table('device_imeis')
            ->join('products', 'device_imeis.product_id', '=', 'products.id')
            ->join('brands', 'products.brand_id', '=', 'brands.id')
            ->where('device_imeis.status', 'In Stock')
            ->select('brands.name', DB::raw('count(*) as count'))
            ->groupBy('brands.name')
            ->orderByDesc('count')
            ->get();

        // Top selling brands (supports serialized + bulk)
        $topBrands = DB::table('sale_items')
            ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->join('products', fn($j) => $j->on('products.id', '=', DB::raw('COALESCE(sale_items.product_id, device_imeis.product_id)')))
            ->join('brands', 'products.brand_id', '=', 'brands.id')
            ->select('brands.name', DB::raw('SUM(sale_items.quantity) as count'))
            ->groupBy('brands.name')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        $metrics = [
            'shopName' => $shopName,
            'inStockCount' => $inStockCount,
            'bulkStockCount' => $bulkStockCount,
            'defectiveCount' => $defectiveCount,
            'atSupplierRepairCount' => $atSupplierRepairCount,
            'totalSellingValue' => $totalSellingValue,
            'totalCostValue' => $totalCostValue,
            'serializedCostValue' => $serializedCostValue,
            'bulkCostValue' => $bulkCostValue,
            'aging30Units' => $aging30Units,
            'aging60Units' => $aging60Units,
            'aging30Value' => $aging30Value,
            'todaySalesAmount' => $todaySalesAmount,
            'todaySalesCount' => $todaySalesCount,
            'todayExpenses' => $todayExpenses,
            'monthSalesAmount' => $monthSalesAmount,
            'totalSalesAmount' => $totalSalesAmount,
            'lowStockProducts' => $lowStockProducts,
            'activeRepairsCount' => $activeRepairsCount,
            'pendingRepairsCount' => $pendingRepairsCount,
            'inProgressRepairsCount' => $inProgressRepairsCount,
            'completedTodayCount' => $completedTodayCount,
            'outwardPendingCount' => $outwardPendingCount,
            'overdueDealerCount' => $overdueDealerCount,
            'dealerOwedAmount' => $dealerOwedAmount,
            'activeLayawaysCount' => $activeLayaways->count(),
            'totalLayawayBalance' => $totalLayawayBalance,
            'invoiceReceivables' => $invoiceReceivables,
            'supplierPayables' => $supplierPayables,
            'supplierCredits' => $supplierCredits,
            'pendingPurchasesCount' => $pendingPurchasesCount,
            'businessWallets' => $businessWallets,
            'totalLiquidity' => $totalLiquidity,
            'brandStock' => $brandStock,
            'topBrands' => $topBrands,
        ];

        // 2. Attempt Gemini Live API call via config('services.gemini.key') (works even with config:cache on Render!)
        $geminiKey = trim((string) (config('services.gemini.key') ?: env('GEMINI_API_KEY') ?: ''));
        if ($geminiKey !== '' && !in_array(strtolower($geminiKey), ['your_gemini_api_key_here', 'null'])) {
            $walletSummary = $businessWallets->map(fn($w) => "{$w->name}: UGX " . number_format((float) $w->current_balance))->implode('; ');
            $lowStockSummary = $lowStockProducts->take(8)->map(fn($p) => trim(($p->brand->name ?? '') . ' ' . $p->model_name) . " ({$p->computed_stock})")->implode(', ');
            $topBrandsSummary = $topBrands->map(fn($b) => "{$b->name} ({$b->count})")->implode(', ');

            $contextString = "You are SmartPOS AI, a sharp retail & wholesale business assistant for {$shopName}, a smartphone and accessories shop in Uganda (currency: UGX).\n"
                . "Answer the user's specific question directly, concisely, and practically using the LIVE store data below. Use short bullet points and bold labels.\n\n"
                . "LIVE STORE DATA (as of " . now()->format('d M Y, H:i') . "):\n"
                . "- Today's Net Revenue: UGX " . number_format($todaySalesAmount) . " ({$todaySalesCount} sales) | Today's Expenses: UGX " . number_format($todayExpenses) . "\n"
                . "- This Month's Sales: UGX " . number_format($monthSalesAmount) . " | All-Time Sales: UGX " . number_format($totalSalesAmount) . "\n"
                . "- Inventory: {$inStockCount} phones + {$bulkStockCount} bulk accessories in stock | Cost Value: UGX " . number_format($totalCostValue) . " | Retail Value: UGX " . number_format($totalSellingValue) . "\n"
                . "- Defective Phones: {$defectiveCount} | At Supplier (Repair): {$atSupplierRepairCount}\n"
                . "- Aging / Slow-Moving Stock: {$aging30Units} phones in stock 30+ days (UGX " . number_format($aging30Value) . " tied up), including {$aging60Units} critical 60+ days\n"
                . "- Low Stock (<5 units): " . ($lowStockSummary ?: 'None') . "\n"
                . "- Business Wallets Total Liquidity: UGX " . number_format($totalLiquidity) . " (" . ($walletSummary ?: 'No wallets') . ")\n"
                . "- Receivables: Layaways UGX " . number_format($totalLayawayBalance) . " ({$activeLayaways->count()} active) | B2B Invoices UGX " . number_format($invoiceReceivables) . " | Supplier Credits Owed to Shop: UGX " . number_format($supplierCredits) . "\n"
                . "- Payables: Supplier Payables UGX " . number_format($supplierPayables) . " ({$pendingPurchasesCount} pending POs) | Dealer Consignments Owed: UGX " . number_format($dealerOwedAmount) . "\n"
                . "- Outward Dealer Phones: {$outwardPendingCount} pending ({$overdueDealerCount} overdue)\n"
                . "- Repairs Workshop: {$activeRepairsCount} active ({$pendingRepairsCount} Pending, {$inProgressRepairsCount} In Progress), {$completedTodayCount} completed today\n"
                . "- Top Selling Brands: " . ($topBrandsSummary ?: 'No sales yet') . "\n\n"
                . "USER QUESTION: {$userPrompt}";

            // Models verified live against this key (older gemini-2.5-* / 2.0-* are retired for new keys).
            // Override with GEMINI_MODEL env var if Google renames models again.
            $modelsToTry = array_values(array_unique(array_filter([
                env('GEMINI_MODEL'),
                'gemini-3.5-flash-lite',
                'gemini-3.5-flash',
                'gemini-3.7-flash',
            ])));

            // Both AI Studio keys (AIza*) and newer AQ.* keys authenticate on generativelanguage.googleapis.com
            $endpointsToTry = [];
            foreach ($modelsToTry as $model) {
                $endpointsToTry[] = [
                    'label' => "gemini_live ({$model})",
                    'url' => "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",
                    'headers' => [
                        'x-goog-api-key' => $geminiKey,
                        'Content-Type' => 'application/json',
                    ],
                    'body' => [
                        'contents' => [
                            ['parts' => [['text' => $contextString]]]
                        ],
                    ],
                ];
            }

            foreach ($endpointsToTry as $ep) {
                try {
                    $response = Http::withoutVerifying()
                        ->timeout(20)
                        ->withHeaders($ep['headers'])
                        ->post($ep['url'], $ep['body']);

                    if ($response->successful()) {
                        $parts = $response->json('candidates.0.content.parts') ?? [];
                        $replyText = collect($parts)->pluck('text')->filter()->implode("\n");
                        if (trim($replyText) !== '') {
                            return response()->json([
                                'reply' => trim($replyText),
                                'source' => $ep['label'],
                            ]);
                        }
                    } else {
                        Log::warning("Gemini API ({$ep['label']}) HTTP {$response->status()}: " . substr($response->body(), 0, 300));
                    }
                } catch (\Exception $e) {
                    Log::warning("Gemini API ({$ep['label']}) exception: " . $e->getMessage());
                }
            }
        }

        // 3. Accurate Local SmartPOS Engine (offline / fallback)
        $reply = $this->generateSmartEngineReply($lowerPrompt, $metrics);

        return response()->json([
            'reply' => $reply,
            'source' => 'local_engine',
        ]);
    }

    private function generateSmartEngineReply(string $prompt, array $d): string
    {
        // 1. Actionable Sales Tips / Promotions / Strategy (MUST come BEFORE generic 'sale' check!)
        if (
            str_contains($prompt, 'tip') ||
            str_contains($prompt, 'boost') ||
            str_contains($prompt, 'promot') ||
            str_contains($prompt, 'suggest') ||
            str_contains($prompt, 'advice') ||
            str_contains($prompt, 'strategy') ||
            str_contains($prompt, 'increase')
        ) {
            $out = "💡 **Actionable Sales & Growth Tips for {$d['shopName']}:**\n\n";
            if ($d['aging30Units'] > 0) {
                $out .= "1. **Clear Aging Stock First:** You have **{$d['aging30Units']} phone(s)** sitting 30+ days (**UGX " . number_format($d['aging30Value']) . "** tied up). Offer a free tempered glass + case bundle or swap slow units with your supplier before they depreciate further.\n";
            } else {
                $out .= "1. **Bundle High-Margin Accessories:** Pair every phone checkout with a 20W charger + MagSafe case + screen protector bundle — accessories carry 40–60% margin and boost average ticket size.\n";
            }
            $out .= "2. **Convert Repairs into Upgrades:** Offer repair customers a quick **Trade-In valuation** when screen/board repairs exceed 35% of the phone's value.\n";
            if ($d['activeLayawaysCount'] > 0 || $d['overdueDealerCount'] > 0) {
                $out .= "3. **Follow Up on Open Cash:** Send 1-click WhatsApp reminders from your Dashboard **Follow-Ups Queue** (**UGX " . number_format($d['totalLayawayBalance']) . "** in layaways, **{$d['overdueDealerCount']}** overdue dealer units) to unlock immediate cashflow.";
            } else {
                $out .= "3. **WhatsApp Broadcast New Arrivals:** Whenever you receive a wholesale shipment, message repeat customers with photos, storage, and trade-in options.";
            }
            return $out;
        }

        // 2. Repairs & Workbench (MUST come BEFORE 'today' check!)
        if (
            str_contains($prompt, 'repair') ||
            str_contains($prompt, 'technician') ||
            str_contains($prompt, 'workbench') ||
            str_contains($prompt, 'turnaround') ||
            str_contains($prompt, 'screen') ||
            str_contains($prompt, 'battery') ||
            str_contains($prompt, 'defect')
        ) {
            $out = "🛠️ **Repairs & Workshop Status:**\n\n";
            $out .= "• **Active Repair Tickets:** {$d['activeRepairsCount']} device(s)\n";
            $out .= "  - ⏳ Pending Intake: {$d['pendingRepairsCount']}\n";
            $out .= "  - ⚡ In Progress: {$d['inProgressRepairsCount']}\n";
            $out .= "  - ✅ Completed Today: {$d['completedTodayCount']}\n";
            if ($d['defectiveCount'] > 0 || $d['atSupplierRepairCount'] > 0) {
                $out .= "• **Shop Stock Under Repair:** {$d['defectiveCount']} defective in shop, {$d['atSupplierRepairCount']} at supplier for repair\n";
            }
            $out .= "\n💡 *Tip: Open **Repairs** to update ticket status or send WhatsApp pickup notifications to customers.*";
            return $out;
        }

        // 3. Aging / Slow-Moving Stock
        if (str_contains($prompt, 'aging') || str_contains($prompt, 'slow') || str_contains($prompt, 'dead stock') || str_contains($prompt, 'old stock')) {
            if ($d['aging30Units'] === 0) {
                return "✅ **No Slow-Moving Stock!** All in-stock phones are under 30 days old.";
            }
            return "⏰ **Aging & Slow-Moving Stock Alert:**\n\n"
                . "• **Phones in Stock 30+ Days:** {$d['aging30Units']} unit(s)\n"
                . "• **Critical (60+ Days):** {$d['aging60Units']} unit(s)\n"
                . "• **Capital Tied Up:** UGX " . number_format($d['aging30Value']) . "\n\n"
                . "💡 *Open **Inventory → Slow-Moving (30d+)** to review exact IMEIs and discount or swap them with suppliers.*";
        }

        // 4. Low Stock / Reorder
        if (str_contains($prompt, 'low stock') || str_contains($prompt, 'reorder') || str_contains($prompt, 'restock') || str_contains($prompt, 'running low') || str_contains($prompt, 'out of stock')) {
            if ($d['lowStockProducts']->isEmpty()) {
                return "✅ **Stock Levels Healthy!** No active product lines are currently below 5 units.";
            }
            $out = "⚠️ **Low Stock & Reorder Breakdown (1–4 units left):**\n\n";
            foreach ($d['lowStockProducts']->take(10) as $prod) {
                $brandName = $prod->brand ? ($prod->brand->name . ' ') : '';
                $out .= "• **{$brandName}{$prod->model_name}**: {$prod->computed_stock} left\n";
            }
            $out .= "\n💡 *Open **Inventory → Low Stock (< 5)** or **Log Purchase** to restock.*";
            return $out;
        }

        // 5. Business Wallets / Treasury / Cash / Liquidity
        if (str_contains($prompt, 'wallet') || str_contains($prompt, 'treasury') || str_contains($prompt, 'cash') || str_contains($prompt, 'momo') || str_contains($prompt, 'bank') || str_contains($prompt, 'liquidity') || str_contains($prompt, 'money')) {
            $out = "🏦 **Business Wallets & Liquidity:**\n\n";
            $out .= "• **Total Business Liquidity:** UGX " . number_format($d['totalLiquidity']) . "\n";
            foreach ($d['businessWallets'] as $w) {
                $out .= "  - **{$w->name}:** UGX " . number_format((float) $w->current_balance) . "\n";
            }
            $out .= "\n• **Today's Expenses:** UGX " . number_format($d['todayExpenses']);
            return $out;
        }

        // 6. Suppliers, Payables & Supplier Credits
        if (str_contains($prompt, 'supplier') || str_contains($prompt, 'credit') || str_contains($prompt, 'purchase') || str_contains($prompt, 'payable')) {
            return "📦 **Suppliers & Payables Summary:**\n\n"
                . "• **Supplier Payables Owed:** UGX " . number_format($d['supplierPayables']) . "\n"
                . "• **Available Supplier Credits (Owed to Shop):** UGX " . number_format($d['supplierCredits']) . "\n"
                . "• **Pending / In-Transit Orders:** {$d['pendingPurchasesCount']}\n\n"
                . "💡 *Open **Suppliers** to apply available credit toward balances, receive credit refunds, or print a Supplier Statement PDF.*";
        }

        // 7. Dealers / Consignments
        if (str_contains($prompt, 'dealer') || str_contains($prompt, 'consignment') || str_contains($prompt, 'overdue')) {
            $out = "🤝 **Dealer & Consignment Overview:**\n\n";
            $out .= "• **Outward Phones with Dealers:** {$d['outwardPendingCount']} pending";
            $out .= $d['overdueDealerCount'] > 0 ? " (**{$d['overdueDealerCount']} overdue!**)\n" : " (none overdue)\n";
            $out .= "• **Inward Consignment Payouts Owed:** UGX " . number_format($d['dealerOwedAmount']) . "\n";
            $out .= "\n💡 *Use the Dashboard **Follow-Ups Queue** to send 1-click WhatsApp reminders to dealers.*";
            return $out;
        }

        // 8. Layaways & B2B Invoices
        if (str_contains($prompt, 'layaway') || str_contains($prompt, 'installment') || str_contains($prompt, 'invoice') || str_contains($prompt, 'receivable') || str_contains($prompt, 'debt') || str_contains($prompt, 'balance')) {
            return "💰 **Receivables (Layaways & B2B Invoices):**\n\n"
                . "• **Active Layaways:** {$d['activeLayawaysCount']} account(s) — **UGX " . number_format($d['totalLayawayBalance']) . "** remaining\n"
                . "• **Unpaid B2B Invoices:** **UGX " . number_format($d['invoiceReceivables']) . "**\n"
                . "• **Supplier Credits Owed to Shop:** **UGX " . number_format($d['supplierCredits']) . "**\n\n"
                . "💡 *Use the Dashboard **Follow-Ups Queue** to send 1-click WhatsApp payment reminders.*";
        }

        // 9. Inventory / Stock Value
        if (str_contains($prompt, 'inventory') || str_contains($prompt, 'stock') || str_contains($prompt, 'phone') || str_contains($prompt, 'worth') || str_contains($prompt, 'value')) {
            $out = "📱 **Inventory & Asset Valuation:**\n\n";
            $out .= "• **Phones In Stock:** " . number_format($d['inStockCount']) . " units (Cost: UGX " . number_format($d['serializedCostValue']) . ")\n";
            $out .= "• **Bulk Accessories:** " . number_format($d['bulkStockCount']) . " units (Cost: UGX " . number_format($d['bulkCostValue']) . ")\n";
            $out .= "• **Total Stock Cost:** UGX " . number_format($d['totalCostValue']) . "\n";
            $out .= "• **Total Retail Value:** UGX " . number_format($d['totalSellingValue']) . "\n";
            if ($d['brandStock']->isNotEmpty()) {
                $out .= "\n**Phones by Brand:**\n";
                foreach ($d['brandStock']->take(6) as $b) {
                    $out .= "• **{$b->name}:** {$b->count} unit(s)\n";
                }
            }
            return $out;
        }

        // 10. Top Brands
        if (str_contains($prompt, 'brand') || str_contains($prompt, 'top') || str_contains($prompt, 'best') || str_contains($prompt, 'popular')) {
            $out = "🏆 **Top Performing Brands:**\n\n";
            if ($d['topBrands']->isNotEmpty()) {
                foreach ($d['topBrands'] as $idx => $b) {
                    $out .= ($idx + 1) . ". **{$b->name}:** {$b->count} unit(s) sold\n";
                }
            } else {
                $out .= "No sales data recorded yet.";
            }
            return $out;
        }

        // 11. Sales / Today / Revenue / Summary
        if (str_contains($prompt, 'sale') || str_contains($prompt, 'today') || str_contains($prompt, 'revenue') || str_contains($prompt, 'profit') || str_contains($prompt, 'summary') || str_contains($prompt, 'earnings')) {
            $avgTicket = $d['todaySalesCount'] > 0 ? number_format($d['todaySalesAmount'] / $d['todaySalesCount']) : '0';
            return "📊 **Store Revenue & Sales Summary:**\n\n"
                . "• **Today's Net Revenue:** UGX " . number_format($d['todaySalesAmount']) . " ({$d['todaySalesCount']} sales)\n"
                . "• **Today's Expenses:** UGX " . number_format($d['todayExpenses']) . "\n"
                . "• **Average Checkout Value:** UGX {$avgTicket}\n"
                . "• **This Month's Sales:** UGX " . number_format($d['monthSalesAmount']) . "\n"
                . "• **All-Time Sales:** UGX " . number_format($d['totalSalesAmount']);
        }

        // 12. Printing / Settings
        if (str_contains($prompt, 'print') || str_contains($prompt, 'thermal') || str_contains($prompt, 'receipt') || str_contains($prompt, 'setting')) {
            return "🖨️ **Thermal Printing & Receipts:**\n\n"
                . "• SmartPOS supports **58mm** and **80mm** thermal printers via QZ Tray or browser print, plus 1-click **WhatsApp Receipts**.\n"
                . "• Configure roll width and store branding under **Settings** (`/settings`).";
        }

        // 13. Greeting or Default Snapshot
        return "👋 **Hello! Here is your live {$d['shopName']} snapshot:**\n\n"
            . "• **Today's Revenue:** UGX " . number_format($d['todaySalesAmount']) . " ({$d['todaySalesCount']} sales)\n"
            . "• **Stock on Hand:** {$d['inStockCount']} phones + {$d['bulkStockCount']} accessories (Cost: UGX " . number_format($d['totalCostValue']) . ")\n"
            . "• **Business Wallets:** UGX " . number_format($d['totalLiquidity']) . "\n"
            . "• **Active Repairs:** {$d['activeRepairsCount']} | **Aging Phones (30d+):** {$d['aging30Units']}\n\n"
            . "💬 *Try asking about:* **Wallets**, **Aging Stock**, **Low Stock**, **Active Repairs**, **Suppliers & Credits**, **Layaways**, **Sales Tips**, or **Today's Summary**.";
    }
}
