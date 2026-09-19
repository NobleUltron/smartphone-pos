<?php

namespace App\DTO;

use App\Models\Sale;
use App\Models\Setting;

class ReceiptData
{
    public function __construct(
        public int|string $receiptNumber,
        public string $storeName,
        public ?string $storeAddress,
        public ?string $storePhone,
        public ?string $storeLogo,
        public string $currency,
        public string $dateTime,
        public string $cashierName,
        public ?string $customerName,
        public ?string $customerPhone,
        public ?string $dealerName,
        public ?string $dealerPhone,
        public array $items, // array of ['description', 'quantity', 'unit_price', 'total_price', 'imei', 'warranty_months', 'notes']
        public float $subtotal,
        public float $discount,
        public float $tradeInValue,
        public ?string $tradeInDevice,
        public float $finalAmount,
        public string $paymentMethod,
        public string $paymentStatus,
        public float $tenderedAmount,
        public float $changeDue,
        public float $layawayPaid,
        public float $layawayBalance,
        public string $footerNote,
        public array $termsConditions,
        public string $barcodeValue,
        public bool $isRefunded = false,
        public bool $isRepair = false,
        public ?string $repairCode = null,
        public ?string $repairDevice = null,
        public ?string $repairImei = null
    ) {}

    public static function fromSale(Sale $sale, array $customSettings = []): self
    {
        $sale->loadMissing([
            'saleItems.deviceImei.product.brand',
            'saleItems.product.brand',
            'customer',
            'user',
            'layawayPayments',
            'repair',
            'dealerItem.dealer'
        ]);

        $storeName = $customSettings['shop_name'] ?? Setting::get('shop_name', 'SmartPOS Kampala');
        $storeAddress = $customSettings['shop_address'] ?? Setting::get('shop_address', '123 Kampala Road, Kampala');
        $storePhone = $customSettings['shop_phone'] ?? Setting::get('shop_phone', '+256 700 000 000');
        $storeLogo = $customSettings['store_logo'] ?? Setting::getLogoUrl();
        $currency = $customSettings['currency_symbol'] ?? Setting::get('currency_symbol', 'UGX');
        $footerNote = $customSettings['receipt_footer'] ?? Setting::get('receipt_footer', 'Thank you for shopping with us!');
        $termsConditions = $customSettings['terms_conditions'] ?? Setting::getTermsConditions();

        $dateTime = $sale->sale_date 
            ? $sale->sale_date->format('d/m/Y H:i') 
            : ($sale->created_at ? $sale->created_at->format('d/m/Y H:i') : date('d/m/Y H:i'));

        $cashierName = $sale->user?->name ?? 'System';

        $customerName = $sale->customer?->name;
        $customerPhone = $sale->customer?->phone;

        $dealerName = null;
        $dealerPhone = null;
        if ($sale->dealerItem && count($sale->dealerItem) > 0 && $sale->dealerItem[0]->dealer) {
            $dealerName = $sale->dealerItem[0]->dealer->name;
            $dealerPhone = $sale->dealerItem[0]->dealer->phone;
        }

        $items = [];
        $isRepair = false;
        $repairCode = null;
        $repairDevice = null;
        $repairImei = null;

        if ($sale->repair) {
            $isRepair = true;
            $repairCode = $sale->repair->repair_code;
            $repairDevice = $sale->repair->device_model;
            $repairImei = $sale->repair->imei_serial;

            $items[] = [
                'description' => 'Repair: ' . $sale->repair->device_model,
                'quantity' => 1,
                'unit_price' => (float) $sale->repair->estimated_cost,
                'total_price' => (float) $sale->repair->estimated_cost,
                'imei' => $sale->repair->imei_serial,
                'warranty_months' => 0,
                'notes' => 'Ticket #' . $sale->repair->repair_code,
            ];
        } else {
            foreach ($sale->saleItems as $item) {
                $product = $item->deviceImei?->product ?? $item->product;
                $brandName = '';
                if ($product?->brand) {
                    $brandName = is_object($product->brand) ? ($product->brand->name ?? '') : (string) $product->brand;
                }
                $modelName = $product?->model_name ?? '';
                $displayName = trim("{$brandName} {$modelName}");
                if (empty($displayName)) {
                    $displayName = $product?->name ?? 'Product Item';
                }

                $qty = (int) ($item->quantity ?: 1);
                $unitPrice = (float) $item->price;
                $totalPrice = $unitPrice * $qty;
                $imei = $item->deviceImei?->imei;

                $items[] = [
                    'description' => $displayName,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'imei' => $imei,
                    'warranty_months' => (int) ($item->warranty_months ?? 0),
                    'notes' => $item->notes,
                ];
            }
        }

        $subtotal = (float) ($sale->total_amount ?? 0);
        $discount = (float) ($sale->discount ?? 0);
        $tradeInValue = (float) ($sale->trade_in_value ?? 0);
        $tradeInDevice = $sale->trade_in_device;
        $finalAmount = (float) ($sale->final_amount ?? 0);

        $paymentMethod = $sale->payment_method ?? 'Cash';
        $paymentStatus = $sale->payment_status ?? 'Paid';
        $tenderedAmount = (float) ($sale->tendered_amount ?? 0);
        $changeDue = max(0, $tenderedAmount - $finalAmount);

        $layawayPaid = 0.0;
        $layawayBalance = 0.0;
        if ($sale->layawayPayments) {
            $layawayPaid = (float) $sale->layawayPayments->sum('amount_paid');
            $layawayBalance = max(0, $finalAmount - $layawayPaid);
        }

        return new self(
            receiptNumber: $sale->id,
            storeName: $storeName,
            storeAddress: $storeAddress,
            storePhone: $storePhone,
            storeLogo: $storeLogo,
            currency: $currency,
            dateTime: $dateTime,
            cashierName: $cashierName,
            customerName: $customerName,
            customerPhone: $customerPhone,
            dealerName: $dealerName,
            dealerPhone: $dealerPhone,
            items: $items,
            subtotal: $subtotal,
            discount: $discount,
            tradeInValue: $tradeInValue,
            tradeInDevice: $tradeInDevice,
            finalAmount: $finalAmount,
            paymentMethod: $paymentMethod,
            paymentStatus: $paymentStatus,
            tenderedAmount: $tenderedAmount,
            changeDue: $changeDue,
            layawayPaid: $layawayPaid,
            layawayBalance: $layawayBalance,
            footerNote: $footerNote,
            termsConditions: is_array($termsConditions) ? $termsConditions : [],
            barcodeValue: 'SALE-' . $sale->id,
            isRefunded: $paymentStatus === 'Refunded',
            isRepair: $isRepair,
            repairCode: $repairCode,
            repairDevice: $repairDevice,
            repairImei: $repairImei
        );
    }
}
