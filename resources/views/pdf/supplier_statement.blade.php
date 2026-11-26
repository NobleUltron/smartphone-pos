<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Supplier Statement — {{ $supplier->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9pt;
            color: #1e293b;
            background: #fff;
            padding: 26px 30px;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .shop-name { font-size: 16pt; font-weight: bold; color: #0f172a; letter-spacing: -0.5px; }
        .shop-sub { font-size: 8.5pt; color: #64748b; margin-top: 3px; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 13pt; font-weight: bold; color: #0f172a; text-transform: uppercase; }
        .doc-title p { font-size: 8pt; color: #64748b; margin-top: 3px; }

        .info-table {
            width: 100%;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #f8fafc;
        }
        .info-table td { padding: 10px 12px; vertical-align: top; width: 50%; }
        .info-title { font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .info-name { font-size: 11pt; font-weight: bold; color: #0f172a; }
        .info-detail { font-size: 8.5pt; color: #334155; margin-top: 2px; }

        .metrics-table {
            width: 100%;
            margin-bottom: 18px;
            border-spacing: 6px;
            margin-left: -6px;
            margin-right: -6px;
        }
        .metric-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
        }
        .metric-card.danger { background: #fef2f2; border-color: #fca5a5; }
        .metric-card.success { background: #f0fdf4; border-color: #86efac; }
        .metric-card.teal { background: #f0fdfa; border-color: #5eead4; }
        .metric-label { font-size: 6.8pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
        .metric-value { font-size: 11pt; font-weight: bold; color: #0f172a; }
        .metric-card.danger .metric-value { color: #dc2626; }
        .metric-card.success .metric-value { color: #166534; }
        .metric-card.teal .metric-value { color: #0f766e; }

        .section-heading {
            font-size: 9pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            margin-bottom: 7px;
            margin-top: 6px;
            letter-spacing: 0.4px;
        }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 7.2pt;
            font-weight: bold;
            text-transform: uppercase;
            padding: 6px 7px;
            text-align: left;
        }
        .items-table td {
            padding: 6px 7px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 8pt;
            color: #334155;
            vertical-align: top;
        }
        .badge {
            display: inline-block;
            padding: 2px 5px;
            font-size: 6.8pt;
            font-weight: bold;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-amber { background: #fef3c7; color: #92400e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-blue { background: #e0f2fe; color: #075985; }

        .signatures-table { width: 100%; margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 14px; }
        .signatures-table td { width: 50%; vertical-align: top; padding: 0 12px; }
        .sig-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #fafafa; }
        .sig-title { font-size: 7.5pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 26px; }
        .sig-line { border-bottom: 1px solid #64748b; margin-bottom: 5px; }
        .sig-name { font-size: 7.5pt; color: #64748b; }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 60%;">
                <div class="shop-name">{{ $settings['shop_name'] }}</div>
                <div class="shop-sub">{{ $settings['shop_address'] }} @if($settings['shop_phone']) | Phone: {{ $settings['shop_phone'] }} @endif</div>
            </td>
            <td class="doc-title" style="width: 40%;">
                <h1>SUPPLIER STATEMENT</h1>
                <p>Generated: {{ date('d M Y, h:i A') }}</p>
                <p>Supplier Ref: <strong>SUP-{{ $supplier->id }}</strong></p>
            </td>
        </tr>
    </table>

    <table class="info-table">
        <tr>
            <td style="border-right: 1px solid #e2e8f0;">
                <div class="info-title">Supplier Details</div>
                <div class="info-name">{{ $supplier->name }}</div>
                @if($supplier->contact_name)<div class="info-detail">Contact: {{ $supplier->contact_name }}</div>@endif
                @if($supplier->phone)<div class="info-detail">Phone: {{ $supplier->phone }}</div>@endif
                @if($supplier->email)<div class="info-detail">Email: {{ $supplier->email }}</div>@endif
                @if($supplier->address)<div class="info-detail">Address: {{ $supplier->address }}</div>@endif
            </td>
            <td>
                <div class="info-title">Reconciliation Summary</div>
                <div class="info-detail">Active Purchase Orders: <strong>{{ $summary['total_orders'] }}</strong></div>
                <div class="info-detail">Returns / Credit Events: <strong>{{ $supplier->supplierReturns->count() }}</strong></div>
                @php $netDiff = $summary['credit_balance'] - $summary['outstanding_balance']; @endphp
                <div class="info-detail" style="margin-top: 6px;">
                    Net Position:
                    @if($netDiff > 0)
                        <strong style="color: #0f766e;">Supplier Owes Shop {{ $settings['currency_symbol'] }} {{ number_format($netDiff) }}</strong>
                    @elseif($netDiff < 0)
                        <strong style="color: #dc2626;">Shop Owes Supplier {{ $settings['currency_symbol'] }} {{ number_format(abs($netDiff)) }}</strong>
                    @else
                        <strong style="color: #166534;">Fully Settled (0)</strong>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <table class="metrics-table">
        <tr>
            <td style="width: 25%;">
                <div class="metric-card">
                    <div class="metric-label">Total Purchases</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['total_spend']) }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card success">
                    <div class="metric-label">Total Paid</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['total_paid']) }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card {{ $summary['outstanding_balance'] > 0 ? 'danger' : '' }}">
                    <div class="metric-label">Outstanding Payable</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['outstanding_balance']) }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card {{ $summary['credit_balance'] > 0 ? 'teal' : '' }}">
                    <div class="metric-label">Available Credit</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['credit_balance']) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="section-heading">Purchase Orders Ledger</div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 10%;">PO #</th>
                <th style="width: 12%;">Date</th>
                <th style="width: 28%;">Items / Reference</th>
                <th style="width: 14%;">Status</th>
                <th style="width: 12%; text-align: right;">Total</th>
                <th style="width: 12%; text-align: right;">Paid</th>
                <th style="width: 12%; text-align: right;">Balance</th>
            </tr>
        </thead>
        <tbody>
            @forelse($supplier->purchases as $purchase)
                @php
                    $isCancelled = $purchase->status === 'Cancelled';
                    $bal = $isCancelled ? 0 : max(0, $purchase->total_amount - $purchase->paid_amount);
                    $itemSummary = $purchase->items->map(function ($it) {
                        $name = $it->product ? trim(($it->product->brand->name ?? '') . ' ' . $it->product->model_name) : 'Item';
                        return $name . ' (x' . $it->quantity . ')';
                    })->implode(', ');
                @endphp
                <tr>
                    <td><strong>#{{ $purchase->id }}</strong></td>
                    <td>{{ \Carbon\Carbon::parse($purchase->purchase_date)->format('d M Y') }}</td>
                    <td>
                        <div>{{ $itemSummary ?: '—' }}</div>
                        @if($purchase->reference_no)<div style="font-size: 7pt; color: #64748b;">Ref: {{ $purchase->reference_no }}</div>@endif
                    </td>
                    <td>
                        <span class="badge {{ $purchase->status === 'Received' ? 'badge-green' : ($isCancelled ? 'badge-red' : 'badge-amber') }}">{{ $purchase->status }}</span>
                        <span class="badge {{ $purchase->payment_status === 'Paid' ? 'badge-green' : ($purchase->payment_status === 'Partial' ? 'badge-amber' : (in_array($purchase->payment_status, ['Refunded', 'Credited']) ? 'badge-blue' : 'badge-red')) }}">{{ $purchase->payment_status }}</span>
                    </td>
                    <td style="text-align: right;">{{ number_format($purchase->total_amount) }}</td>
                    <td style="text-align: right;">{{ number_format($purchase->paid_amount) }}</td>
                    <td style="text-align: right; font-weight: bold; color: {{ $bal > 0 ? '#dc2626' : '#166534' }};">{{ number_format($bal) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;">No purchase orders recorded.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    @if($supplier->supplierReturns->count() > 0)
        <div class="section-heading">Returns, RMAs, Cancelled Orders &amp; Credit Ledger</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 12%;">Date</th>
                    <th style="width: 15%;">Type</th>
                    <th style="width: 28%;">Item / Purchase</th>
                    <th style="width: 15%;">Resolution</th>
                    <th style="width: 18%;">Reason / Notes</th>
                    <th style="width: 12%; text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($supplier->supplierReturns as $ret)
                    @php
                        $typeLabel = [
                            'purchase_cancellation' => 'Cancelled Order',
                            'device_return' => 'Device Return',
                            'bulk_return' => 'Bulk Return',
                            'credit_applied' => 'Credit Used',
                            'credit_refund' => 'Credit Refund',
                        ][$ret->return_type] ?? $ret->return_type;
                        $resLabel = [
                            'refund' => 'Refund to Wallet',
                            'supplier_credit' => 'Supplier Credit',
                            'replacement' => 'Swap / Exchange',
                            'supplier_repair' => 'Supplier Repair',
                            'forfeited' => 'Forfeited',
                            'applied_to_purchase' => 'Applied to PO',
                            'none' => 'No Payment',
                        ][$ret->resolution] ?? $ret->resolution;
                    @endphp
                    <tr>
                        <td>{{ $ret->created_at->format('d M Y') }}</td>
                        <td><strong>{{ $typeLabel }}</strong></td>
                        <td>
                            @if($ret->purchase_id)
                                Purchase #{{ $ret->purchase_id }}
                            @elseif($ret->deviceImei)
                                {{ trim(($ret->deviceImei->product->brand->name ?? '') . ' ' . ($ret->deviceImei->product->model_name ?? 'Device')) }}
                                <div style="font-size: 7pt; color: #64748b;">
                                    IMEI: {{ $ret->deviceImei->imei }}
                                    @if($ret->replacementImei) &rarr; {{ $ret->replacementImei->imei }} @endif
                                </div>
                            @else
                                —
                            @endif
                        </td>
                        <td>
                            <span class="badge badge-blue">{{ $resLabel }}</span>
                            @if($ret->paymentAccount)<div style="font-size: 7pt; color: #64748b;">{{ $ret->paymentAccount->name }}</div>@endif
                        </td>
                        <td>{{ $ret->reason ?: '—' }}</td>
                        <td style="text-align: right; font-weight: bold;">{{ $ret->amount > 0 ? number_format($ret->amount) : '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Store Manager Signature</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Authorized Representative &amp; Date</div>
                </div>
            </td>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Supplier Acknowledgement</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">{{ $supplier->name }} &amp; Date</div>
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
