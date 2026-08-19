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
            font-size: 9.5pt;
            color: #1e293b;
            background: #fff;
            padding: 28px 32px;
        }

        /* ── Header ─────────────────────────────────── */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .shop-name {
            font-size: 16pt;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .shop-sub {
            font-size: 8.5pt;
            color: #64748b;
            margin-top: 3px;
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
            font-size: 8pt;
            color: #64748b;
            margin-top: 3px;
        }

        /* ── Info Box ────────────────────────────────── */
        .info-table {
            width: 100%;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #f8fafc;
        }
        .info-table td {
            padding: 10px 12px;
            vertical-align: top;
            width: 50%;
        }
        .info-title {
            font-size: 7.5pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
        }
        .info-name {
            font-size: 11pt;
            font-weight: bold;
            color: #0f172a;
        }
        .info-detail {
            font-size: 8.5pt;
            color: #334155;
            margin-top: 2px;
        }

        /* ── Metric Summary Cards ────────────────────── */
        .metrics-table {
            width: 100%;
            margin-bottom: 20px;
            border-spacing: 8px;
            margin-left: -8px;
            margin-right: -8px;
        }
        .metric-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
        }
        .metric-card.highlight {
            background: #fef2f2;
            border-color: #fca5a5;
        }
        .metric-card.success {
            background: #f0fdf4;
            border-color: #86efac;
        }
        .metric-label {
            font-size: 7pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        .metric-value {
            font-size: 12pt;
            font-weight: bold;
            color: #0f172a;
        }
        .metric-card.highlight .metric-value {
            color: #dc2626;
        }
        .metric-card.success .metric-value {
            color: #166534;
        }

        /* ── Table Styling ───────────────────────────── */
        .section-heading {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background: #0f172a;
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            padding: 7px 8px;
            text-align: left;
        }
        .items-table td {
            padding: 7px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 8.5pt;
            color: #334155;
            vertical-align: middle;
        }
        .items-table tr.overdue-row {
            background: #fff5f5;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 7pt;
            font-weight: bold;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-sold { background: #dcfce7; color: #166534; }
        .badge-returned { background: #dbeafe; color: #1e40af; }
        .badge-overdue { background: #fee2e2; color: #991b1b; }

        .items-table tfoot td {
            font-weight: bold;
            background: #f8fafc;
            border-top: 2px solid #0f172a;
            color: #0f172a;
            font-size: 9pt;
        }

        /* ── Signature Section ───────────────────────── */
        .signatures-table {
            width: 100%;
            margin-top: 30px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 15px;
        }
        .signatures-table td {
            width: 50%;
            vertical-align: top;
            padding: 0 15px;
        }
        .sig-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            background: #fafafa;
        }
        .sig-title {
            font-size: 8pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            margin-bottom: 30px;
        }
        .sig-line {
            border-bottom: 1px solid #64748b;
            margin-bottom: 6px;
        }
        .sig-name {
            font-size: 7.5pt;
            color: #64748b;
        }

        .footer-note {
            margin-top: 20px;
            text-align: center;
            font-size: 7.5pt;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
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
                <p>Date Generated: {{ date('d M Y, h:i A') }}</p>
                <p>Filter: <strong>{{ ucfirst($status) }} Items</strong></p>
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
                    <div class="info-detail">Contact Person: {{ $dealer->contact_person }}</div>
                @endif
                <div class="info-detail">Phone: {{ $dealer->phone }}</div>
                @if($dealer->email)
                    <div class="info-detail">Email: {{ $dealer->email }}</div>
                @endif
                @if($dealer->address)
                    <div class="info-detail">Address: {{ $dealer->address }}</div>
                @endif
            </td>
            <td>
                <div class="info-title">Account Reconciliation Summary</div>
                <div class="info-detail">Total Items Issued: <strong>{{ $summary['total_items_taken'] }}</strong></div>
                <div class="info-detail">Total Items Sold: <strong>{{ $summary['total_items_sold'] }}</strong></div>
                <div class="info-detail">Total Items Returned: <strong>{{ $summary['total_items_returned'] }}</strong></div>
                <div class="info-detail">Currently Held Items: <strong>{{ $summary['currently_out_count'] }}</strong></div>
            </td>
        </tr>
    </table>

    <!-- Metrics Cards Grid -->
    <table class="metrics-table">
        <tr>
            <td style="width: 25%;">
                <div class="metric-card">
                    <div class="metric-label">Items Out</div>
                    <div class="metric-value">{{ $summary['currently_out_count'] }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card highlight">
                    <div class="metric-label">Outstanding Balance</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['outstanding_balance']) }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card {{ $summary['overdue_count'] > 0 ? 'highlight' : '' }}">
                    <div class="metric-label">Overdue Items</div>
                    <div class="metric-value">{{ $summary['overdue_count'] }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card success">
                    <div class="metric-label">Settled Sales Value</div>
                    <div class="metric-value">{{ $settings['currency_symbol'] }} {{ number_format($summary['settled_sales_value']) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Ledger Table -->
    <div class="section-heading">Itemized Activity & Reconciliation Ledger</div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 35%;">Item & Serial / SKU</th>
                <th style="width: 14%;">Issue Date</th>
                <th style="width: 14%;">Due Date</th>
                <th style="width: 12%;">Status</th>
                <th style="width: 20%; text-align: right;">Dealer Price</th>
            </tr>
        </thead>
        <tbody>
            @forelse($items as $index => $item)
                @php
                    $isOverdue = $item->status === 'Pending' && $item->expected_return_date && \Carbon\Carbon::parse($item->expected_return_date)->isBefore(\Carbon\Carbon::today());
                    $itemName = $item->type === 'serialized'
                        ? (($item->deviceImei->product->brand->name ?? '') . ' ' . ($item->deviceImei->product->model_name ?? 'Item'))
                        : (($item->product->brand->name ?? '') . ' ' . ($item->product->model_name ?? 'Item'));
                    $itemDetail = $item->type === 'serialized'
                        ? ('IMEI: ' . ($item->deviceImei->imei ?? 'N/A'))
                        : ('SKU: ' . ($item->product->sku ?? 'N/A') . ' (Qty: ' . ($item->quantity - $item->quantity_sold - $item->quantity_returned) . ')');
                @endphp
                <tr class="{{ $isOverdue ? 'overdue-row' : '' }}">
                    <td>{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $itemName }}</strong><br/>
                        <span style="font-size: 7.5pt; color: #64748b;">{{ $itemDetail }}</span>
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
                            <span class="badge badge-pending">Pending</span>
                        @elseif($item->status === 'Sold')
                            <span class="badge badge-sold">Sold</span>
                        @elseif($item->status === 'Returned')
                            <span class="badge badge-returned">Returned</span>
                        @endif
                    </td>
                    <td style="text-align: right; font-weight: bold;">
                        {{ $settings['currency_symbol'] }} {{ number_format($item->dealer_price) }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">
                        No items found matching the selected criteria.
                    </td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr>
                <td colspan="5" style="text-align: right;">Total Outstanding Balance (Pending Items):</td>
                <td style="text-align: right; color: #dc2626;">
                    {{ $settings['currency_symbol'] }} {{ number_format($summary['outstanding_balance']) }}
                </td>
            </tr>
        </tfoot>
    </table>

    <!-- Physical Signatures -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Store Representative Confirmation</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Authorized Signature & Date</div>
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
        This document is an official Statement of Account generated by {{ $settings['shop_name'] }}.
    </div>

</body>
</html>
