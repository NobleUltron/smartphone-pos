<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Account Statement - {{ $account->name }}</title>
    <style>
        @page {
            margin: 20px 25px 25px 25px;
            size: A4 portrait;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 8.5pt;
            color: #1e293b;
            line-height: 1.35;
            margin: 0;
            padding: 0;
        }

        /* ── Header ──────────────────────────────────── */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 15px;
        }
        .shop-name {
            font-size: 16pt;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .shop-sub {
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 2px;
        }
        .doc-title {
            text-align: right;
            vertical-align: bottom;
        }
        .doc-title h1 {
            font-size: 14pt;
            font-weight: 800;
            color: #4f46e5;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .doc-title p {
            margin: 0;
            font-size: 8pt;
            color: #64748b;
        }

        /* ── Account Info & Summary ──────────────────── */
        .info-table {
            width: 100%;
            margin-bottom: 15px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 10px 14px;
            vertical-align: top;
        }
        .info-title {
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 4px;
        }
        .info-name {
            font-size: 11pt;
            font-weight: 800;
            color: #0f172a;
        }
        .info-detail {
            font-size: 8pt;
            color: #334155;
            margin-top: 2px;
        }

        /* ── Summary KPI Strip ───────────────────────── */
        .kpi-table {
            width: 100%;
            margin-bottom: 18px;
            border-collapse: separate;
            border-spacing: 6px 0;
        }
        .kpi-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: center;
        }
        .kpi-label {
            font-size: 6.5pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
        }
        .kpi-val {
            font-size: 11pt;
            font-weight: 800;
            margin-top: 2px;
        }

        /* ── Transactions Table ──────────────────────── */
        .section-heading {
            font-size: 9pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin-bottom: 6px;
            border-left: 3px solid #4f46e5;
            padding-left: 6px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background: #f1f5f9;
            color: #334155;
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 6px 8px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            text-align: left;
        }
        .items-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 7.5pt;
            vertical-align: middle;
        }
        .items-table tr:nth-child(even) {
            background: #fafafa;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .font-bold {
            font-weight: 700;
        }

        /* ── Badges ──────────────────────────────────── */
        .badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 6.5pt;
            font-weight: 700;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-inflow {
            background: #dcfce7;
            color: #166534;
        }
        .badge-outflow {
            background: #fee2e2;
            color: #991b1b;
        }
        .badge-transfer {
            background: #e0e7ff;
            color: #3730a3;
        }
        .badge-adjust {
            background: #fef3c7;
            color: #92400e;
        }

        /* ── Signatures ──────────────────────────────── */
        .signatures-table {
            width: 100%;
            margin-top: 25px;
            border-collapse: collapse;
        }
        .signatures-table td {
            width: 45%;
            vertical-align: top;
            padding: 0 10px;
        }
        .signature-line {
            border-bottom: 1px dashed #94a3b8;
            height: 40px;
            margin-bottom: 6px;
        }
        .signature-label {
            font-size: 8pt;
            font-weight: bold;
            color: #334155;
        }
        .signature-sub {
            font-size: 7pt;
            color: #64748b;
        }

        /* ── Footer ──────────────────────────────────── */
        .footer {
            margin-top: 20px;
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
                <h1>Account Passbook</h1>
                <p>Generated: {{ date('d M Y, h:i A') }}</p>
                <p>Period: <strong>{{ $startDate ? \Carbon\Carbon::parse($startDate)->format('d M Y') : 'Start' }} &mdash; {{ $endDate ? \Carbon\Carbon::parse($endDate)->format('d M Y') : 'Present' }}</strong></p>
            </td>
        </tr>
    </table>

    <!-- Account Info -->
    <table class="info-table">
        <tr>
            <td style="width: 50%; border-right: 1px solid #e2e8f0;">
                <div class="info-title">Account Details</div>
                <div class="info-name">{{ $account->name }}</div>
                <div class="info-detail"><strong>Type / Provider:</strong> {{ ucfirst($account->type) }} ({{ $account->provider ?? 'Standard' }})</div>
                @if($account->account_number)
                    <div class="info-detail"><strong>Account / Phone No:</strong> {{ $account->account_number }}</div>
                @endif
                @if($account->description)
                    <div class="info-detail" style="color: #64748b;">{{ $account->description }}</div>
                @endif
            </td>
            <td style="width: 50%;">
                <div class="info-title">Account Valuation</div>
                <div class="info-detail">Opening Float Balance: <strong>{{ $settings['currency_symbol'] }} {{ number_format($account->opening_balance) }}</strong></div>
                <div class="info-detail">Current Real-Time Balance: <strong style="color: #059669; font-size: 10pt;">{{ $settings['currency_symbol'] }} {{ number_format($account->current_balance) }}</strong></div>
                <div class="info-detail">Total Recorded Entries: <strong>{{ $transactions->count() }} transactions</strong></div>
            </td>
        </tr>
    </table>

    <!-- KPI Summary Strip -->
    <table class="kpi-table">
        <tr>
            <td class="kpi-card" style="border-top: 3px solid #10b981;">
                <div class="kpi-label">Total Inflows (Credits)</div>
                <div class="kpi-val" style="color: #059669;">+ {{ $settings['currency_symbol'] }} {{ number_format($totalInflows) }}</div>
            </td>
            <td class="kpi-card" style="border-top: 3px solid #ef4444;">
                <div class="kpi-label">Total Outflows (Debits)</div>
                <div class="kpi-val" style="color: #dc2626;">- {{ $settings['currency_symbol'] }} {{ number_format($totalOutflows) }}</div>
            </td>
            <td class="kpi-card" style="border-top: 3px solid #4f46e5;">
                <div class="kpi-label">Net Movement</div>
                <div class="kpi-val" style="color: {{ ($totalInflows - $totalOutflows) >= 0 ? '#4f46e5' : '#dc2626' }};">
                    {{ ($totalInflows - $totalOutflows) >= 0 ? '+' : '' }}{{ $settings['currency_symbol'] }} {{ number_format($totalInflows - $totalOutflows) }}
                </div>
            </td>
            <td class="kpi-card" style="border-top: 3px solid #0f172a;">
                <div class="kpi-label">Ending Balance</div>
                <div class="kpi-val" style="color: #0f172a;">{{ $settings['currency_symbol'] }} {{ number_format($account->current_balance) }}</div>
            </td>
        </tr>
    </table>

    <!-- Transactions Table -->
    <div class="section-heading">Transaction Activity Ledger</div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 4%;">#</th>
                <th style="width: 14%;">Date & Time</th>
                <th style="width: 13%;">Category</th>
                <th style="width: 27%;">Description / Reference</th>
                <th style="width: 13%; text-align: right;">Inflow (+)</th>
                <th style="width: 13%; text-align: right;">Outflow (&minus;)</th>
                <th style="width: 16%; text-align: right;">Balance</th>
            </tr>
        </thead>
        <tbody>
            @forelse($transactions as $idx => $trx)
                @php
                    $isInflow = in_array($trx->type, ['inflow', 'transfer_in']);
                @endphp
                <tr>
                    <td class="text-center">{{ $idx + 1 }}</td>
                    <td>{{ \Carbon\Carbon::parse($trx->transaction_date)->format('d M Y, h:i A') }}</td>
                    <td>
                        @if($trx->type === 'inflow')
                            <span class="badge badge-inflow">{{ $trx->category }}</span>
                        @elseif($trx->type === 'outflow')
                            <span class="badge badge-outflow">{{ $trx->category }}</span>
                        @elseif(str_contains($trx->type, 'transfer'))
                            <span class="badge badge-transfer">{{ $trx->category }}</span>
                        @else
                            <span class="badge badge-adjust">{{ $trx->category }}</span>
                        @endif
                    </td>
                    <td>
                        <strong>{{ $trx->description }}</strong>
                        @if($trx->transaction_reference)
                            <br/><span style="font-size: 6.5pt; color: #64748b;">Ref: {{ $trx->transaction_reference }}</span>
                        @endif
                        @if($trx->user)
                            <span style="font-size: 6.5pt; color: #94a3b8;">&bull; By {{ $trx->user->name }}</span>
                        @endif
                    </td>
                    <td class="text-right font-bold" style="color: #059669;">
                        {{ $isInflow ? number_format($trx->amount) : '—' }}
                    </td>
                    <td class="text-right font-bold" style="color: #dc2626;">
                        {{ !$isInflow ? number_format($trx->amount) : '—' }}
                    </td>
                    <td class="text-right font-bold" style="color: #0f172a;">
                        {{ number_format($trx->balance_after) }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="text-center" style="padding: 20px; color: #94a3b8;">
                        No transactions recorded in this period.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Dual Signatures -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="signature-line"></div>
                <div class="signature-label">Prepared & Verified By</div>
                <div class="signature-sub">{{ auth()->user()->name ?? 'Store Cashier / Accountant' }} &bull; {{ date('d M Y') }}</div>
            </td>
            <td style="margin-left: auto;">
                <div class="signature-line"></div>
                <div class="signature-label">Manager / Store Owner Approval</div>
                <div class="signature-sub">Official Stamp & Signature</div>
            </td>
        </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
        {{ $settings['shop_name'] }} &bull; SmartPOS Treasury Management System &bull; Confidential Account Passbook
    </div>

</body>
</html>
