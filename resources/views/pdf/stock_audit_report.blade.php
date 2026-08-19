<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Stock Audit Discrepancy Report — {{ $audit->audit_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9.5pt;
            color: #1e293b;
            background: #fff;
            padding: 28px 32px;
        }

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
        }
        .doc-title p {
            font-size: 8pt;
            color: #64748b;
            margin-top: 3px;
        }

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
        .metric-card.danger { background: #fef2f2; border-color: #fca5a5; }
        .metric-card.success { background: #f0fdf4; border-color: #86efac; }
        .metric-label { font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
        .metric-value { font-size: 13pt; font-weight: bold; color: #0f172a; }
        .metric-card.danger .metric-value { color: #dc2626; }
        .metric-card.success .metric-value { color: #166534; }

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
        .badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 7pt;
            font-weight: bold;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-found { background: #dcfce7; color: #166534; }
        .badge-missing { background: #fee2e2; color: #991b1b; }
        .badge-unmatched { background: #fef3c7; color: #92400e; }

        .signatures-table {
            width: 100%;
            margin-top: 30px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 15px;
        }
        .signatures-table td { width: 50%; vertical-align: top; padding: 0 15px; }
        .sig-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #fafafa; }
        .sig-title { font-size: 8pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 30px; }
        .sig-line { border-bottom: 1px solid #64748b; margin-bottom: 6px; }
        .sig-name { font-size: 7.5pt; color: #64748b; }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="width: 60%;">
                <div class="shop-name">{{ $settings['shop_name'] }}</div>
                <div class="shop-sub">{{ $settings['shop_address'] }} | Phone: {{ $settings['shop_phone'] }}</div>
            </td>
            <td class="doc-title" style="width: 40%;">
                <h1>STOCK AUDIT REPORT</h1>
                <p>Audit Ref: <strong>{{ $audit->audit_number }}</strong></p>
                <p>Auditor: <strong>{{ $audit->user->name }}</strong></p>
                <p>Date: {{ $audit->completed_at ? $audit->completed_at->format('d M Y, h:i A') : $audit->started_at->format('d M Y, h:i A') }}</p>
            </td>
        </tr>
    </table>

    <!-- Audit Summary Metrics -->
    <table class="metrics-table">
        <tr>
            <td style="width: 25%;">
                <div class="metric-card">
                    <div class="metric-label">Expected Devices</div>
                    <div class="metric-value">{{ $audit->total_expected }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card success">
                    <div class="metric-label">Verified Scanned</div>
                    <div class="metric-value">{{ $audit->total_scanned }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card danger">
                    <div class="metric-label">Missing Items</div>
                    <div class="metric-value">{{ $audit->total_missing }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="metric-card">
                    <div class="metric-label">Accuracy Rate</div>
                    <div class="metric-value">
                        {{ $audit->total_expected > 0 ? round(($audit->total_scanned / $audit->total_expected) * 100, 1) : 100 }}%
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Audit Discrepancies Table -->
    <div class="section-heading">Stock Audit Discrepancy & Item Ledger</div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">Device / Item & Model</th>
                <th style="width: 25%;">Scanned IMEI / Code</th>
                <th style="width: 15%;">Audit Status</th>
                <th style="width: 15%;">Scan Time</th>
            </tr>
        </thead>
        <tbody>
            @forelse($audit->items as $index => $item)
                @php
                    $deviceModel = $item->deviceImei && $item->deviceImei->product
                        ? (($item->deviceImei->product->brand->name ?? '') . ' ' . $item->deviceImei->product->model_name)
                        : ($item->notes ?? 'Unrecorded Device');
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $deviceModel }}</strong>
                    </td>
                    <td><code>{{ $item->imei_scanned }}</code></td>
                    <td>
                        @if($item->status === 'Found')
                            <span class="badge badge-found">Found</span>
                        @elseif($item->status === 'Missing')
                            <span class="badge badge-missing">Missing</span>
                        @elseif($item->status === 'Unmatched')
                            <span class="badge badge-unmatched">Unmatched</span>
                        @endif
                    </td>
                    <td>{{ $item->scanned_at ? $item->scanned_at->format('H:i:s') : '—' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">
                        No items logged in this stock audit.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Signatures -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Auditor Signature</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">{{ $audit->user->name }} & Date</div>
                </div>
            </td>
            <td>
                <div class="sig-box">
                    <div class="sig-title">Store Manager Approval</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Authorized Manager & Date</div>
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
