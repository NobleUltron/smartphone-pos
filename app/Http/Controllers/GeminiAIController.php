<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Product;
use App\Models\DeviceImei;
use App\Models\Sale;
use App\Models\Brand;
use App\Models\Repair;
use App\Models\DealerItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GeminiAIController extends Controller
{
    public function ask(Request $request)
    {
        $request->validate(['prompt' => 'required|string']);
        $userPrompt = trim($request->prompt);
        $lowerPrompt = strtolower($userPrompt);

        // 1. Gather comprehensive live database analytics
        $inStockCount = DeviceImei::where('status', 'In Stock')->count();
        $totalSellingValue = DeviceImei::where('status', 'In Stock')->sum('selling_price');
        $totalCostValue = Product::sum(DB::raw('cost_price * quantity'));
        
        $todaySalesAmount = Sale::where('payment_status', '!=', 'Refunded')->whereDate('sale_date', Carbon::today())->sum('final_amount');
        $todaySalesCount = Sale::where('payment_status', '!=', 'Refunded')->whereDate('sale_date', Carbon::today())->count();
        $totalSalesAmount = Sale::where('payment_status', '!=', 'Refunded')->sum('final_amount');

        // Low & Out of stock products
        $lowStockProducts = Product::with(['brand'])->withCount(['deviceImeis' => function ($q) {
            $q->where('status', 'In Stock');
        }])->get()->filter(function ($product) {
            return $product->device_imeis_count < 5;
        })->values();

        // Repairs statistics
        $activeRepairsCount = Repair::whereIn('status', ['Pending', 'In Progress'])->count();
        $pendingRepairsCount = Repair::where('status', 'Pending')->count();
        $inProgressRepairsCount = Repair::where('status', 'In Progress')->count();
        $completedTodayCount = Repair::where('status', 'Completed')->whereDate('updated_at', Carbon::today())->count();

        // Dealer items statistics
        $pendingDealerCount = DealerItem::where('status', 'Pending')->count();
        $overdueDealerCount = DealerItem::where('status', 'Pending')
            ->whereNotNull('expected_return_date')
            ->where('expected_return_date', '<', Carbon::today())
            ->count();

        // Layaways statistics
        $activeLayaways = Sale::where('payment_method', 'Layaway')->where('payment_status', 'Partial')->get();
        $totalLayawayBalance = $activeLayaways->sum(function ($s) {
            return max(0, $s->final_amount - ($s->amount_paid ?? 0));
        });

        // Stock by brand
        $brandStock = DB::table('device_imeis')
            ->join('products', 'device_imeis.product_id', '=', 'products.id')
            ->join('brands', 'products.brand_id', '=', 'brands.id')
            ->where('device_imeis.status', 'In Stock')
            ->select('brands.name', DB::raw('count(*) as count'))
            ->groupBy('brands.name')
            ->orderByDesc('count')
            ->get();

        // Top selling brands
        $topBrands = DB::table('sale_items')
            ->join('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->join('products', 'device_imeis.product_id', '=', 'products.id')
            ->join('brands', 'products.brand_id', '=', 'brands.id')
            ->select('brands.name', DB::raw('count(*) as count'))
            ->groupBy('brands.name')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        // 2. Attempt Gemini Live API call if key is available
        $geminiKey = env('GEMINI_API_KEY') ?: config('gemini.api_key');
        if (!empty($geminiKey) && !in_array($geminiKey, ['your_gemini_api_key_here', 'null'])) {
            $contextString = "You are SmartPOS AI, a super-intelligent retail assistant for a smartphone POS and repair store in Kampala.\n"
                . "Live Store Metrics:\n"
                . "- In-Stock Phone Units: {$inStockCount} (Retail Value: " . number_format($totalSellingValue) . " UGX, Stock Cost: " . number_format($totalCostValue) . " UGX)\n"
                . "- Today's Sales: " . number_format($todaySalesAmount) . " UGX ({$todaySalesCount} sales)\n"
                . "- Active Repairs: {$activeRepairsCount} ({$pendingRepairsCount} Pending, {$inProgressRepairsCount} In Progress, {$completedTodayCount} Completed Today)\n"
                . "- Overdue Dealer Items: {$overdueDealerCount} out of {$pendingDealerCount} total dealer items\n"
                . "- Outstanding Layaway Balance: " . number_format($totalLayawayBalance) . " UGX across {$activeLayaways->count()} customer accounts\n"
                . "- Low Stock Models: " . $lowStockProducts->pluck('model_name')->implode(', ') . "\n\n"
                . "Respond with expert store insights, clear Markdown formatting, bullet points, and helpful tone.\n"
                . "User Question: " . $userPrompt;

            $modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];

            foreach ($modelsToTry as $model) {
                try {
                    $response = Http::withoutVerifying()->timeout(7)->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$geminiKey}", [
                        'contents' => [
                            ['parts' => [['text' => $contextString]]]
                        ]
                    ]);

                    if ($response->successful()) {
                        $replyText = $response->json()['candidates'][0]['content']['parts'][0]['text'] ?? null;
                        if ($replyText) {
                            return response()->json(['reply' => trim($replyText), 'source' => "gemini_live_api ({$model})"]);
                        }
                    }
                } catch (\Exception $e) {
                    // Fall back to local smart engine
                }
            }
        }

        // 3. Local SmartPOS AI Intelligence Engine (Runs instantly offline or fallback)
        $reply = $this->generateSmartEngineReply($lowerPrompt, [
            'inStockCount' => $inStockCount,
            'totalSellingValue' => $totalSellingValue,
            'totalCostValue' => $totalCostValue,
            'todaySalesAmount' => $todaySalesAmount,
            'todaySalesCount' => $todaySalesCount,
            'totalSalesAmount' => $totalSalesAmount,
            'lowStockProducts' => $lowStockProducts,
            'activeRepairsCount' => $activeRepairsCount,
            'pendingRepairsCount' => $pendingRepairsCount,
            'inProgressRepairsCount' => $inProgressRepairsCount,
            'completedTodayCount' => $completedTodayCount,
            'pendingDealerCount' => $pendingDealerCount,
            'overdueDealerCount' => $overdueDealerCount,
            'activeLayawaysCount' => $activeLayaways->count(),
            'totalLayawayBalance' => $totalLayawayBalance,
            'brandStock' => $brandStock,
            'topBrands' => $topBrands,
        ]);

        return response()->json(['reply' => $reply, 'source' => 'smartpos_ai_engine']);
    }

    private function generateSmartEngineReply(string $prompt, array $data): string
    {
        // Low Stock / Reorder Queries
        if (str_contains($prompt, 'low stock') || str_contains($prompt, 'reorder') || str_contains($prompt, 'restock') || str_contains($prompt, 'running low') || str_contains($prompt, 'out of stock')) {
            if ($data['lowStockProducts']->isEmpty()) {
                return "✅ **Stock Status Excellent!** All phone models currently have healthy inventory levels (5+ units available).";
            }

            $out = "⚠️ **Low Stock & Restock Alert:**\n";
            $out .= "The following models have fewer than 5 units remaining in stock:\n\n";
            foreach ($data['lowStockProducts'] as $prod) {
                $brandName = $prod->brand ? $prod->brand->name : 'Device';
                $count = $prod->device_imeis_count;
                $statusBadge = $count == 0 ? '❌ OUT OF STOCK (0)' : "⚠️ Low Stock ({$count} left)";
                $out .= "• **{$brandName} {$prod->model_name}**: {$statusBadge}\n";
            }
            $out .= "\n💡 *Action Tip: Place supplier re-orders for items with 0 or low stock to ensure no lost sales opportunities.*";
            return $out;
        }

        // Sales / Today / Revenue / Profit Queries
        if (str_contains($prompt, 'sale') || str_contains($prompt, 'today') || str_contains($prompt, 'revenue') || str_contains($prompt, 'profit') || str_contains($prompt, 'summary') || str_contains($prompt, 'earnings')) {
            $avgTicket = $data['todaySalesCount'] > 0 ? number_format($data['todaySalesAmount'] / $data['todaySalesCount']) : '0';
            $out = "📊 **Store Revenue & Sales Analytics:**\n\n";
            $out .= "• **Today's Revenue:** " . number_format($data['todaySalesAmount']) . " UGX\n";
            $out .= "• **Completed Sales Today:** " . $data['todaySalesCount'] . " transaction(s)\n";
            $out .= "• **Average Checkout Value:** " . $avgTicket . " UGX\n";
            $out .= "• **All-Time Total Store Revenue:** " . number_format($data['totalSalesAmount']) . " UGX\n\n";
            $out .= "📈 *Tip: Checkout velocity peaks in the late afternoon (4 PM - 7 PM). Ensure staff availability during peak hours!*";
            return $out;
        }

        // Repair & Technical Queries
        if (str_contains($prompt, 'repair') || str_contains($prompt, 'fix') || str_contains($prompt, 'technician') || str_contains($prompt, 'screen') || str_contains($prompt, 'battery') || str_contains($prompt, 'defect')) {
            $out = "🛠️ **Repairs & Workshop Diagnostics:**\n\n";
            $out .= "• **Active Repair Tickets:** " . $data['activeRepairsCount'] . " device(s)\n";
            $out .= "  - ⏳ Pending Intake: " . $data['pendingRepairsCount'] . "\n";
            $out .= "  - ⚡ In Progress on Workbench: " . $data['inProgressRepairsCount'] . "\n";
            $out .= "  - ✅ Completed Today: " . $data['completedTodayCount'] . " device(s)\n\n";

            if (str_contains($prompt, 'screen') || str_contains($prompt, 'glass')) {
                $out .= "💡 **Display Diagnostic Tip:** When replacing cracked OLED screens, perform a pre-intake TrueTone & touch digitizer test before unmounting flex cables.";
            } else if (str_contains($prompt, 'battery') || str_contains($prompt, 'power')) {
                $out .= "💡 **Power Diagnostic Tip:** Test charge current (mA) on USB ammeter before replacing battery to verify charging IC IC flex integrity.";
            } else {
                $out .= "💡 *Use the ✨ **AI Estimate** button in the Repair Form Modal for 1-click automatic quote calculation based on shop inventory!*";
            }
            return $out;
        }

        // Dealers / Consignments Queries
        if (str_contains($prompt, 'dealer') || str_contains($prompt, 'supplier') || str_contains($prompt, 'overdue') || str_contains($prompt, 'consignment')) {
            $out = "🤝 **Dealer & Consignment Overview:**\n\n";
            $out .= "• **Pending Dealer Items:** " . $data['pendingDealerCount'] . " item(s)\n";
            if ($data['overdueDealerCount'] > 0) {
                $out .= "• 🚨 **Overdue Items:** " . $data['overdueDealerCount'] . " item(s) past expected return date!\n\n";
                $out .= "⚠️ *Action Required: Open the **Dealers** tab and filter by overdue items to request returns or settlements.*";
            } else {
                $out .= "• ✅ **Overdue Status:** All dealer items are within expected return dates.\n";
            }
            return $out;
        }

        // Layaway & Installments Queries
        if (str_contains($prompt, 'layaway') || str_contains($prompt, 'installment') || str_contains($prompt, 'balance') || str_contains($prompt, 'debt')) {
            $out = "💰 **Layaway & Customer Installments Summary:**\n\n";
            $out .= "• **Active Layaway Accounts:** " . $data['activeLayawaysCount'] . " customer(s)\n";
            $out .= "• **Total Outstanding Balance:** " . number_format($data['totalLayawayBalance']) . " UGX\n\n";
            $out .= "💡 *Tip: Open **POS -> Layaways** to log customer installment payments or print updated receipts.*";
            return $out;
        }

        // Inventory / Stock Value Queries
        if (str_contains($prompt, 'inventory') || str_contains($prompt, 'stock') || str_contains($prompt, 'phone') || str_contains($prompt, 'worth') || str_contains($prompt, 'value')) {
            $out = "📱 **Inventory & Asset Valuation:**\n\n";
            $out .= "• **In-Stock Phone Units:** " . number_format($data['inStockCount']) . " units\n";
            $out .= "• **Total Retail Selling Value:** " . number_format($data['totalSellingValue']) . " UGX\n";
            $out .= "• **Estimated Stock Cost Value:** " . number_format($data['totalCostValue']) . " UGX\n\n";
            $out .= "**Stock Distribution by Brand:**\n";
            if ($data['brandStock']->isNotEmpty()) {
                foreach ($data['brandStock'] as $b) {
                    $out .= "• **{$b->name}**: {$b->count} units\n";
                }
            } else {
                $out .= "• No devices registered.\n";
            }
            return $out;
        }

        // Top Brands / Best Sellers
        if (str_contains($prompt, 'brand') || str_contains($prompt, 'top') || str_contains($prompt, 'best') || str_contains($prompt, 'popular')) {
            $out = "🏆 **Top Performing Brands:**\n\n";
            if ($data['topBrands']->isNotEmpty()) {
                foreach ($data['topBrands'] as $index => $b) {
                    $rank = $index + 1;
                    $out .= "{$rank}. **{$b->name}**: {$b->count} unit(s) sold\n";
                }
            } else {
                $out .= "No sales data recorded yet to compute top brands.";
            }
            return $out;
        }

        // Specific Greeting Handling
        if (str_contains($prompt, 'morning') || str_contains($prompt, 'afternoon') || str_contains($prompt, 'evening') || in_array($prompt, ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
            $timeGreeting = "Good day!";
            if (str_contains($prompt, 'morning')) $timeGreeting = "Good morning! ☀️";
            elseif (str_contains($prompt, 'afternoon')) $timeGreeting = "Good afternoon! 🌤️";
            elseif (str_contains($prompt, 'evening')) $timeGreeting = "Good evening! 🌙";

            $out = "👋 **{$timeGreeting} Welcome to SmartPOS Kampala.**\n\n";
            $out .= "Here is your live store snapshot:\n";
            $out .= "• **Phones in Stock:** " . number_format($data['inStockCount']) . " units (" . number_format($data['totalSellingValue']) . " UGX retail value)\n";
            $out .= "• **Today's Revenue:** " . number_format($data['todaySalesAmount']) . " UGX ({$data['todaySalesCount']} sales)\n";
            $out .= "• **Active Repairs:** " . $data['activeRepairsCount'] . " device(s) on workbench\n";
            $out .= "• **Overdue Dealer Items:** " . $data['overdueDealerCount'] . " item(s)\n\n";
            $out .= "💬 *How can I assist you today? Try asking me:*\n";
            $out .= "• \"Which phones are low on stock?\"\n";
            $out .= "• \"Give me today's sales summary\"\n";
            $out .= "• \"How many active repairs do we have?\"\n";
            $out .= "• \"What is our total inventory value?\"";
            return $out;
        }

        // Hardware / Printing / System Help
        if (str_contains($prompt, 'print') || str_contains($prompt, 'thermal') || str_contains($prompt, 'receipt') || str_contains($prompt, 'setting')) {
            return "🖨️ **ESC/POS Thermal Printing Help:**\n\n"
                . "SmartPOS supports **58mm** and **80mm** thermal receipt printers with automated cash drawer pulses.\n\n"
                . "• Open **POS** -> click **Printer Settings** to switch roll size or test cash drawer kick.\n"
                . "• To auto-print receipts after checkout, enable **Auto Print Receipts** in the thermal settings modal.";
        }

        // General Welcome & Diagnostic Response
        $out = "👋 **Hello! I am SmartPOS AI, your Store Intelligence Assistant.**\n\n";
        $out .= "Here is a quick snapshot of SmartPOS Kampala:\n";
        $out .= "• **Phones in Stock:** " . number_format($data['inStockCount']) . " units (" . number_format($data['totalSellingValue']) . " UGX retail value)\n";
        $out .= "• **Today's Revenue:** " . number_format($data['todaySalesAmount']) . " UGX ({$data['todaySalesCount']} sales)\n";
        $out .= "• **Active Repairs:** " . $data['activeRepairsCount'] . " device(s) on workbench\n";
        $out .= "• **Overdue Dealer Items:** " . $data['overdueDealerCount'] . " item(s)\n\n";
        $out .= "💬 *Try asking me:*\n";
        $out .= "• \"Which phones are low on stock?\"\n";
        $out .= "• \"Give me today's sales summary\"\n";
        $out .= "• \"How many active repairs do we have?\"\n";
        $out .= "• \"What is our total inventory value?\"\n";
        $out .= "• \"What are our overdue dealer items?\"";
        return $out;
    }
}
