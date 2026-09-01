<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Dealer Statement — {{ $dealer->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9pt;
            color: #1e293b;
            background: #fff;
            padding: 24px 28px;
        }

        /* ── Header ─────────────────────────────────── */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
        }
        .shop-name {
            font-size: 15pt;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .shop-sub {
            font-size: 8pt;
            color: #64748b;
            margin-top: 2px;
        }
        .doc-title {
            text-align: right;
        }
        .doc-title h1 {
            font-size: 13pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .doc-title p {
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 2px;
        }

        /* ── Info Box ────────────────────────────────── */
        .info-table {
            width: 100%;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #f8fafc;
        }
        .info-table td {
            padding: 8px 12px;
            vertical-align: top;
            width: 50%;
        }
        .info-title {
            font-size: 7pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
        }
        .info-name {
            font-size: 10.5pt;
            font-weight: bold;
            color: #0f172a;
        }
        .info-detail {
            font-size: 8pt;
            color: #334155;
            margin-top: 2px;
        }

        /* ── Metric Summary Cards ────────────────────── */
        .metrics-table {
            width: 100%;
            margin-bottom: 16px;
            border-collapse: collapse;
        }
        .metrics-table td {
            padding: 0 4px;
        }
        .metric-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
        }
        .metric-card.danger {
            background: #fef2f2;
            border-color: #fca5a5;
        }
        .metric-card.success {
            background: #f0fdf4;
            border-color: #86efac;
        }
        .metric-card.info {
            background: #eff6ff;
            border-color: #bfdbfe;
        }
        .metric-label {
            font-size: 6.5pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .metric-value {
            font-size: 11pt;
            font-weight: bold;
            color: #0f172a;
        }
        .metric-card.danger .metric-value { color: #dc2626; }
        .metric-card.success .metric-value { color: #166534; }
        .metric-card.info .metric-value { color: #1d4ed8; }

        /* ── Section Headings & Tables ───────────────── */
        .section-heading {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 14px;
            margin-bottom: 6px;
            border-left: 3px solid #4f46e5;
            padding-left: 6px;
        }
        .section-heading.inward {
            border-left-color: #9333ea;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            padding: 6px 8px;
            text-align: left;
        }
        .items-table.inward-theme th {
            background: #4c1d95;
        }
        .items-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 8pt;
            color: #334155;
            vertical-align: middle;
        }
        .items-table tr.overdue-row {
            background: #fff5f5;
        }
        .badge {
            display: inline-block;
            padding: 2px 5px;
            font-size: 6.5pt;
            font-weight: bold;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-sold { background: #dcfce7; color: #166534; }
        .badge-returned { background: #dbeafe; color: #1e40af; }
        .badge-overdue { background: #fee2e2; color: #991b1b; }
        .badge-settled { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .badge-owed { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

        .items-table tfoot td {
            font-weight: bold;
            background: #f8fafc;
            border-top: 2px solid #0f172a;
            color: #0f172a;
            font-size: 8.5pt;
        }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }

        /* ── Signatures ──────────────────────────────── */
        .signatures-table {
            width: 100%;
            margin-top: 24px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 12px;
        }
        .signatures-table td {
            width: 50%;
            vertical-align: top;
            padding: 0 10px;
        }
        .sig-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px;
            background: #fafafa;
        }
        .sig-title {
            font-size: 7.5pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            margin-bottom: 24px;
        }
        .sig-line {
            border-bottom: 1px solid #64748b;
            margin-bottom: 4px;
        }
        .sig-name {
            font-size: 7pt;
            color: #64748b;
        }

        .footer-note {
            margin-top: 16px;
            text-align: center;
            font-size: 7pt;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 6px;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="width: 60%;">
                <div class="shop-name">{{ $settings['shop_name'] }}</div>
                <div class="shop-sub">{{ $settings['shop_address'] }} | Phone: {{ $settings['shop_phone'] }}</div>
                @if(!empty($settings['shop_email']))
                    <div class="shop-sub">Email: {{ $settings['shop_email'] }}</div>
                @endif
            </td>
            <td class="doc-title" style="width: 40%;">
                <h1>Statement of Account</h1>
                <p>Date: {{ date('d M Y, h:i A') }}</p>
                <p>Filter: <strong>{{ ucfirst($status) }} ({{ ucfirst($direction ?? 'all') }})</strong></p>
            </td>
        </tr>
    </table>

    <!-- Dealer Info -->
    <table class="info-table">
        <tr>
            <td style="border-right: 1px solid #e2e8f0;">
                <div class="info-title">Partner / Dealer Details</div>
                <div class="info-name">{{ $dealer->name }}</div>
                @if($dealer->contact_person)
                    <div class="info-detail"><strong>Contact Person:</strong> {{ $dealer->contact_person }}</div>
                @endif
                <div class="info-detail"><strong>Phone:</strong> {{ $dealer->phone }}</div>
                @if($dealer->email)
                    <div class="info-detail"><strong>Email:</strong> {{ $dealer->email }}</div>
                @endif
                @if($dealer->address || $dealer->location)
                    <div class="info-detail"><strong>Address:</strong> {{ $dealer->address ?? $dealer->location }}</div>
                @endif
                @if($dealer->national_id)
                    <div class="info-detail"><strong>National ID / NIN:</strong> {{ $dealer->national_id }}</div>
                @endif
            </td>
            <td>
                <div class="info-title">Dealer Portfolio Activity</div>
                <div class="info-detail">Inward Consignments Received: <strong>{{ $summary['inward_total_count'] ?? 0 }} pcs</strong></div>
                <div class="info-detail">Inward Consignments Sold: <strong>{{ $summary['inward_sold_count'] ?? 0 }} pcs</strong></div>
                <div class="info-detail">Outward Partner Stock Issued: <strong>{{ $summary['outward_total_count'] ?? 0 }} pcs</strong></div>
                <div class="info-detail">Outward Stock Currently Held: <strong>{{ $summary['outward_pending_count'] ?? 0 }} pcs</strong></div>
            </td>
        </tr>
    </table>

    <!-- Metrics Cards Grid -->
    <table class="metrics-table">
        <tr>
            <td style="width: 25%;">
                <div class="metric-card info">
                    <div class="metric-label">In-Shop Consigned</div>
                    <div class="metric-value">{{ $summary['inward_pending_count'] ?? 0 }} pcs</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card {{ ($summary['inward_owed_amount'] ?? 0) > 0 ? 'danger' : '' }}">
                    <div class="metric-label">Owed to Dealer</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['inward_owed_amount'] ?? 0) }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card success">
                    <div class="metric-label">Settled Payouts</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['inward_settled_amount'] ?? 0) }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card {{ ($summary['outward_receivable_amount'] ?? 0) > 0 ? 'info' : '' }}">
                    <div class="metric-label">Receivable from Dealer</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['outward_receivable_amount'] ?? 0) }}</div>
                </div>
            </td>
        </tr>
    </table>

    @php
        $inwardItems = $items->where('direction', 'inward');
        $outwardItems = $items->where('direction', '!=', 'inward');
    @endphp

    <!-- Section 1: Inward Consignment Ledger (Stock Received from Dealer) -->
    @if($inwardItems->count() > 0)
        <div class="section-heading inward">Section 1: Inward Consignments Received (Stock Sourced from {{ $dealer->name }})</div>
        <table class="items-table inward-theme">
            <thead>
                <tr>
                    <th style="width: 4%;">#</th>
                    <th style="width: 32%;">Item & Specification</th>
                    <th style="width: 14%;">Received Date</th>
                    <th style="width: 14%;">Sold Date</th>
                    <th style="width: 16%; text-align: right;">Wholesale Cost</th>
                    <th style="width: 20%; text-align: right;">Settlement Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($inwardItems as $idx => $item)
                    @php
                        $brandName = $item->deviceImei->product->brand->name 
                            ?? $item->product->brand->name 
                            ?? '';
                        $modelName = $item->deviceImei->product->model_name 
                            ?? $item->product->model_name 
                            ?? 'Device';
                        $itemName = trim($brandName . ' ' . $modelName);

                        $imei = $item->deviceImei->imei 
                            ?? $item->deviceImei->imei_number 
                            ?? $item->imei 
                            ?? '';
                        $storage = $item->deviceImei->storage_capacity 
                            ?? $item->deviceImei->storage 
                            ?? $item->storage 
                            ?? '';
                        $color = $item->deviceImei->color ?? $item->color ?? '';
                        $condition = $item->deviceImei->condition ?? $item->condition ?? '';

                        $itemDetail = ($item->type === 'serialized' || $imei)
                            ? ('IMEI: ' . ($imei ?: 'N/A') . (count(array_filter([$storage, $color, $condition])) ? ' • ' . implode(' • ', array_filter([$storage, $color, $condition])) : ''))
                            : ('Quantity: ' . $item->quantity . ' pcs');
                        $wholesale = $item->settlement_amount > 0 ? $item->settlement_amount : ($item->wholesale_cost ?? $item->dealer_price ?? 0);
                    @endphp
                    <tr>
                        <td>{{ $idx + 1 }}</td>
                        <td>
                            <strong>{{ $itemName }}</strong><br/>
                            <span style="font-size: 7pt; color: #64748b;">{{ $itemDetail }}</span>
                        </td>
                        <td>{{ $item->created_at ? \Carbon\Carbon::parse($item->created_at)->format('d M Y') : '—' }}</td>
                        <td>{{ $item->sold_at ? \Carbon\Carbon::parse($item->sold_at)->format('d M Y') : 'In Shop (Unsold)' }}</td>
                        <td class="text-right font-bold">{{ $settings['currency_symbol'] }} {{ number_format($wholesale) }}</td>
                        <td class="text-right">
                            @if($item->settlement_status === 'Settled')
                                <span class="badge badge-settled">Paid: {{ $item->settlement_method }}</span>
                                @if($item->settled_at)
                                    <br/><span style="font-size: 6.5pt; color: #059669;">{{ \Carbon\Carbon::parse($item->settled_at)->format('d M Y') }}</span>
                                @endif
                            @elseif($item->status === 'Sold')
                                <span class="badge badge-owed">OWED (Unsettled)</span>
                            @else
                                <span class="badge badge-pending">In Shop</span>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" class="text-right">Total Outstanding Payout Owed on Sold Inward Items:</td>
                    <td colspan="2" class="text-right" style="color: #dc2626;">
                        {{ $settings['currency_symbol'] }} {{ number_format($summary['inward_owed_amount'] ?? 0) }}
                    </td>
                </tr>
            </tfoot>
        </table>
    @endif

    <!-- Section 2: Outward Stock Ledger (Stock Issued to Partner Dealer) -->
    @if($outwardItems->count() > 0)
        <div class="section-heading">Section 2: Outward Consignments (Stock Issued to {{ $dealer->name }})</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 4%;">#</th>
                    <th style="width: 32%;">Item & Specification</th>
                    <th style="width: 14%;">Issue Date</th>
                    <th style="width: 14%;">Due Date</th>
                    <th style="width: 16%;">Status</th>
                    <th style="width: 20%; text-align: right;">Agreed Dealer Price</th>
                </tr>
            </thead>
            <tbody>
                @foreach($outwardItems as $idx => $item)
                    @php
                        $isOverdue = $item->status === 'Pending' && $item->expected_return_date && \Carbon\Carbon::parse($item->expected_return_date)->isBefore(\Carbon\Carbon::today());
                        $brandName = $item->deviceImei->product->brand->name 
                            ?? $item->product->brand->name 
                            ?? '';
                        $modelName = $item->deviceImei->product->model_name 
                            ?? $item->product->model_name 
                            ?? 'Device';
                        $itemName = trim($brandName . ' ' . $modelName);

                        $imei = $item->deviceImei->imei 
                            ?? $item->deviceImei->imei_number 
                            ?? $item->imei 
                            ?? '';
                        $itemDetail = ($item->type === 'serialized' || $imei)
                            ? ('IMEI: ' . ($imei ?: 'N/A'))
                            : ('Quantity: ' . ($item->quantity - $item->quantity_sold - $item->quantity_returned) . ' pcs');
                    @endphp
                    <tr class="{{ $isOverdue ? 'overdue-row' : '' }}">
                        <td>{{ $idx + 1 }}</td>
                        <td>
                            <strong>{{ $itemName }}</strong><br/>
                            <span style="font-size: 7pt; color: #64748b;">{{ $itemDetail }}</span>
                        </td>
                        <td>{{ $item->issued_at ? \Carbon\Carbon::parse($item->issued_at)->format('d M Y') : '—' }}</td>
                        <td>
                            @if($item->expected_return_date)
                                {{ \Carbon\Carbon::parse($item->expected_return_date)->format('d M Y') }}
                                @if($isOverdue)
                                    <br/><span class="badge badge-overdue">OVERDUE</span>
                                @endif
                            @else
                                —
                            @endif
                        </td>
                        <td>
                            @if($item->status === 'Pending')
                                <span class="badge badge-pending">With Dealer</span>
                            @elseif($item->status === 'Sold')
                                <span class="badge badge-sold">Sold</span>
                            @elseif($item->status === 'Returned')
                                <span class="badge badge-returned">Returned</span>
                            @endif
                        </td>
                        <td class="text-right font-bold">
                            {{ $settings['currency_symbol'] }} {{ number_format($item->dealer_price) }}
                        </td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="5" class="text-right">Total Outward Stock Receivable (Pending Items):</td>
                    <td class="text-right" style="color: #1d4ed8;">
                        {{ $settings['currency_symbol'] }} {{ number_format($summary['outward_receivable_amount'] ?? 0) }}
                    </td>
                </tr>
            </tfoot>
        </table>
    @endif

    @if($items->count() === 0)
        <div style="text-align: center; color: #94a3b8; padding: 30px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px;">
            No consignment transactions found for this dealer under selected filters.
        </div>
    @endif

    <!-- Physical Signatures -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Store Representative Confirmation</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Authorized Cashier / Manager Signature & Stamp</div>
                </div>
            </td>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Dealer / Partner Acknowledgement</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Dealer Signature & Date</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="footer-note">
        This document is an official Statement of Account generated by {{ $settings['shop_name'] }} on {{ now()->format('d M Y, h:i A') }}.
    </div>

</body>
</html>
