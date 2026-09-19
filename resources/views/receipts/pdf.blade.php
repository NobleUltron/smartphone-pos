<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Receipt - #{{ $receipt->receiptNumber }}</title>
    <style>
        @page {
            margin: 3mm 4mm;
            size: 80mm 200mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .uppercase { text-transform: uppercase; }
        
        .header {
            text-align: center;
            margin-bottom: 8px;
        }
        .store-name {
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .store-details {
            font-size: 10px;
            color: #333;
        }
        .refund-banner {
            background: #000;
            color: #fff;
            font-weight: bold;
            padding: 3px;
            margin: 6px 0;
            text-align: center;
            font-size: 11px;
            letter-spacing: 2px;
        }
        .divider {
            border-top: 1px dashed #666;
            margin: 6px 0;
        }
        .divider-double {
            border-top: 2px solid #000;
            margin: 6px 0;
        }
        .meta-table, .items-table, .totals-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        .meta-table td {
            padding: 1px 0;
        }
        .items-table th {
            font-size: 10px;
            font-weight: bold;
            border-bottom: 1px dashed #666;
            padding-bottom: 3px;
        }
        .items-table td {
            padding: 3px 0;
            vertical-align: top;
        }
        .item-sub {
            font-size: 9px;
            color: #555;
            font-family: 'Courier New', Courier, monospace;
        }
        .totals-table td {
            padding: 2px 0;
        }
        .grand-total {
            font-size: 14px;
            font-weight: bold;
        }
        .footer-note {
            font-weight: bold;
            font-size: 10px;
            margin: 8px 0 4px 0;
        }
        .terms {
            font-size: 8.5px;
            color: #444;
            text-align: left;
            margin-top: 6px;
        }
        .terms ol {
            padding-left: 14px;
            margin: 2px 0;
        }
        .powered-by {
            font-size: 8px;
            color: #888;
            margin-top: 8px;
            font-family: 'Courier New', Courier, monospace;
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="store-name">{{ $receipt->storeName }}</div>
        <div class="store-details">
            @if($receipt->storeAddress)
                <div>{{ $receipt->storeAddress }}</div>
            @endif
            @if($receipt->storePhone)
                <div>Tel: {{ $receipt->storePhone }}</div>
            @endif
        </div>
    </div>

    @if($receipt->isRefunded)
        <div class="refund-banner">*** REFUNDED ***</div>
    @endif

    <div class="divider"></div>

    <table class="meta-table font-mono">
        <tr>
            <td>Receipt #:</td>
            <td class="text-right font-bold">{{ $receipt->receiptNumber }}</td>
        </tr>
        <tr>
            <td>Date:</td>
            <td class="text-right">{{ $receipt->dateTime }}</td>
        </tr>
        <tr>
            <td>Cashier:</td>
            <td class="text-right">{{ $receipt->cashierName }}</td>
        </tr>
        @if($receipt->customerName)
            <tr>
                <td>Customer:</td>
                <td class="text-right font-bold">{{ $receipt->customerName }}</td>
            </tr>
            @if($receipt->customerPhone)
                <tr>
                    <td>Phone:</td>
                    <td class="text-right">{{ $receipt->customerPhone }}</td>
                </tr>
            @endif
        @elseif($receipt->dealerName)
            <tr>
                <td>Partner/Dealer:</td>
                <td class="text-right font-bold">{{ $receipt->dealerName }}</td>
            </tr>
            @if($receipt->dealerPhone)
                <tr>
                    <td>Phone:</td>
                    <td class="text-right">{{ $receipt->dealerPhone }}</td>
                </tr>
            @endif
        @endif
    </table>

    <div class="divider"></div>

    <table class="items-table">
        <thead>
            <tr>
                <th class="text-left">ITEM</th>
                <th class="text-right">AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            @foreach($receipt->items as $item)
                <tr>
                    <td>
                        <div class="font-bold">{{ $item['description'] }}</div>
                        @if(!empty($item['imei']))
                            <div class="item-sub">IMEI: {{ $item['imei'] }}</div>
                        @elseif($item['quantity'] > 1)
                            <div class="item-sub">Qty: {{ $item['quantity'] }} @ {{ number_format($item['unit_price']) }}</div>
                        @endif
                        @if(!empty($item['warranty_months']) && $item['warranty_months'] > 0)
                            <div class="item-sub">Warranty: {{ $item['warranty_months'] }} Months</div>
                        @endif
                        @if(!empty($item['notes']))
                            <div class="item-sub">Note: {{ $item['notes'] }}</div>
                        @endif
                    </td>
                    <td class="text-right font-bold font-mono">
                        {{ number_format($item['total_price']) }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="divider"></div>

    <table class="totals-table">
        <tr>
            <td>Subtotal:</td>
            <td class="text-right font-mono">{{ $receipt->currency }} {{ number_format($receipt->subtotal) }}</td>
        </tr>
        @if($receipt->discount > 0)
            <tr>
                <td>Discount:</td>
                <td class="text-right font-mono">-{{ $receipt->currency }} {{ number_format($receipt->discount) }}</td>
            </tr>
        @endif
        @if($receipt->tradeInValue > 0)
            <tr>
                <td>Trade-In:</td>
                <td class="text-right font-mono">-{{ $receipt->currency }} {{ number_format($receipt->tradeInValue) }}</td>
            </tr>
        @endif
        <tr>
            <td colspan="2"><div class="divider-double"></div></td>
        </tr>
        <tr class="grand-total">
            <td>TOTAL:</td>
            <td class="text-right font-mono">{{ $receipt->currency }} {{ number_format($receipt->finalAmount) }}</td>
        </tr>
        <tr>
            <td colspan="2"><div class="divider-double"></div></td>
        </tr>
        <tr>
            <td>Payment Method:</td>
            <td class="text-right font-bold">{{ $receipt->paymentMethod }}</td>
        </tr>
        <tr>
            <td>Payment Status:</td>
            <td class="text-right font-bold uppercase">{{ $receipt->paymentStatus }}</td>
        </tr>
        @if(strtolower($receipt->paymentMethod) === 'cash' && $receipt->tenderedAmount > 0)
            <tr>
                <td>Tendered:</td>
                <td class="text-right font-mono">{{ $receipt->currency }} {{ number_format($receipt->tenderedAmount) }}</td>
            </tr>
            <tr>
                <td>Change Due:</td>
                <td class="text-right font-mono">{{ $receipt->currency }} {{ number_format($receipt->changeDue) }}</td>
            </tr>
        @elseif(strtolower($receipt->paymentMethod) === 'layaway')
            <tr>
                <td>Total Paid:</td>
                <td class="text-right font-mono">{{ $receipt->currency }} {{ number_format($receipt->layawayPaid) }}</td>
            </tr>
            <tr>
                <td>Balance Due:</td>
                <td class="text-right font-mono">{{ $receipt->currency }} {{ number_format($receipt->layawayBalance) }}</td>
            </tr>
        @endif
    </table>

    <div class="divider"></div>

    <div class="text-center">
        <div class="footer-note uppercase">{{ $receipt->footerNote }}</div>

        @if(!empty($receipt->termsConditions))
            <div class="terms">
                <div class="font-bold uppercase">Terms & Conditions:</div>
                <ol>
                    @foreach($receipt->termsConditions as $term)
                        <li>{{ $term }}</li>
                    @endforeach
                </ol>
            </div>
        @endif

        <div class="powered-by">Powered by SmartPOS</div>
    </div>

</body>
</html>
