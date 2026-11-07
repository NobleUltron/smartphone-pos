<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class PartnerInvestor extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'profit_share_percentage',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'profit_share_percentage' => 'float',
        'is_active' => 'boolean',
    ];

    public function transactions(): HasMany
    {
        return $this->hasMany(PartnerTransaction::class)->orderBy('transaction_date', 'desc')->orderBy('id', 'desc');
    }

    public function deviceImeis(): HasMany
    {
        return $this->hasMany(DeviceImei::class)->orderBy('created_at', 'desc');
    }

    /**
     * Compute comprehensive financial portfolio summary for this partner
     */
    public function getPortfolioSummary(): array
    {
        // 1. Total Capital Injected
        $totalDeposits = (float) $this->transactions()->where('type', 'deposit')->sum('amount');

        // 2. Total Capital / Profit Paid Out to Partner
        $totalPayouts = (float) $this->transactions()->whereIn('type', ['payout', 'profit_payout'])->sum('amount');

        // 3. Current In-Stock Inventory funded by this partner
        $inStockDevices = $this->deviceImeis()
            ->with(['product.brand'])
            ->where('status', 'In Stock')
            ->get();
        $inStockCost = (float) $inStockDevices->sum('cost_price');
        $inStockCount = $inStockDevices->count();

        // 4. Sold Inventory funded by this partner
        $soldDevices = $this->deviceImeis()
            ->with(['product.brand', 'saleItems.sale'])
            ->where('status', 'Sold')
            ->get();

        $soldCount = $soldDevices->count();
        $soldCostBasis = (float) $soldDevices->sum('cost_price');

        // Calculate Revenue & Profit from sold items
        $soldRevenue = 0.0;
        $soldItemsDetails = [];

        foreach ($soldDevices as $device) {
            $saleItem = $device->saleItems->first();
            $soldPrice = $saleItem ? (float) $saleItem->price : (float) $device->selling_price;
            $unitCost = (float) $device->cost_price;
            $grossProfit = max(0, $soldPrice - $unitCost);
            $partnerProfit = $grossProfit * ($this->profit_share_percentage / 100);

            $soldRevenue += $soldPrice;
            $soldItemsDetails[] = [
                'id' => $device->id,
                'imei' => $device->imei,
                'model_name' => $device->product ? ($device->product->brand->name ?? '') . ' ' . $device->product->model_name : 'Unknown Device',
                'storage_capacity' => $device->storage_capacity,
                'color' => $device->color,
                'condition' => $device->condition,
                'cost_price' => $unitCost,
                'sold_price' => $soldPrice,
                'gross_profit' => $grossProfit,
                'partner_profit' => $partnerProfit,
                'sold_at' => $saleItem && $saleItem->created_at ? $saleItem->created_at->format('Y-m-d H:i') : ($device->updated_at ? $device->updated_at->format('Y-m-d H:i') : null),
                'receipt_number' => $saleItem && $saleItem->sale ? ($saleItem->sale->invoice_number ?? ('#' . $saleItem->sale->id)) : null,
            ];
        }

        $totalGrossProfit = max(0, $soldRevenue - $soldCostBasis);
        $totalPartnerProfit = $totalGrossProfit * ($this->profit_share_percentage / 100);
        $shopProfitShare = max(0, $totalGrossProfit - $totalPartnerProfit);

        // Total Stock Deployed (In Stock + Sold)
        $totalStockDeployed = $inStockCost + $soldCostBasis;

        // Unspent Cash = Initial Capital - Total Stock Deployed
        $unspentCash = max(0, $totalDeposits - $totalStockDeployed);

        // Recovered Cash from Sales = Cost basis of sold phones
        $recoveredCostFromSales = $soldCostBasis;

        // Ready Cash Pool = Unspent Cash + Recovered Cost + Partner Profit Share - Payouts
        $cashBalanceAvailable = ($totalDeposits - $inStockCost + $totalPartnerProfit) - $totalPayouts;

        // Total Partner Value = Cash Available + Unsold Stock on Shelf
        $totalPortfolioValue = $cashBalanceAvailable + $inStockCost;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'profit_share_percentage' => $this->profit_share_percentage,
            'notes' => $this->notes,
            'total_deposits' => $totalDeposits,
            'total_payouts' => $totalPayouts,
            'in_stock_count' => $inStockCount,
            'in_stock_cost' => $inStockCost,
            'sold_count' => $soldCount,
            'sold_cost_basis' => $soldCostBasis,
            'sold_revenue' => $soldRevenue,
            'total_gross_profit' => $totalGrossProfit,
            'partner_profit_earned' => $totalPartnerProfit,
            'shop_profit_earned' => $shopProfitShare,
            'unspent_cash' => $unspentCash,
            'cash_balance_available' => $cashBalanceAvailable,
            'total_portfolio_value' => $totalPortfolioValue,
            'in_stock_devices' => $inStockDevices->map(function ($device) {
                return [
                    'id' => $device->id,
                    'imei' => $device->imei,
                    'model_name' => $device->product ? ($device->product->brand->name ?? '') . ' ' . $device->product->model_name : 'Unknown Device',
                    'storage_capacity' => $device->storage_capacity,
                    'color' => $device->color,
                    'condition' => $device->condition,
                    'cost_price' => (float) $device->cost_price,
                    'selling_price' => (float) $device->selling_price,
                    'added_at' => $device->created_at ? $device->created_at->format('Y-m-d') : null,
                ];
            }),
            'sold_devices' => $soldItemsDetails,
        ];
    }
}

