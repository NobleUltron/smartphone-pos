<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Shift Report — {{ $drawer->user->name ?? 'Unknown' }}</title>
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
        .header {
            border-bottom: 3px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .shop-name {
            font-size: 18pt;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .shop-sub {
            font-size: 8pt;
            color: #64748b;
            margin-top: 2px;
        }
        .report-label {
            text-align: right;
        }
        .report-label h2 {
            font-size: 13pt;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .report-label .report-id {
            font-size: 7.5pt;
            color: #94a3b8;
            font-family: 'DejaVu Sans Mono', monospace;
            margin-top: 3px;
        }

        /* ── Section Headers ─────────────────────────── */
        .section-header {
            background: #0f172a;
            color: #fff;
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            padding: 5px 10px;
            margin-top: 16px;
            margin-bottom: 0;
        }
        .section-body {
            border: 1px solid #e2e8f0;
            border-top: none;
            padding: 10px 12px;
        }

        /* ── Info Grid ───────────────────────────────── */
        .info-grid {
            width: 100%;
            border-collapse: collapse;
        }
        .info-grid td {
            padding: 4px 8px;
            font-size: 9pt;
            vertical-align: top;
            width: 50%;
        }
        .info-grid .label {
            color: #64748b;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-grid .value {
            font-weight: 700;
            color: #0f172a;
        }

        /* ── Revenue / Summary Rows ──────────────────── */
        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }
        .summary-table tr {
            border-bottom: 1px solid #f1f5f9;
        }
        .summary-table tr:last-child {
            border-bottom: none;
        }
        .summary-table td {
            padding: 5px 8px;
            font-size: 9pt;
        }
        .summary-table .row-label {
            color: #334155;
        }
        .summary-table .row-value {
            text-align: right;
            font-weight: 700;
            font-family: 'DejaVu Sans Mono', monospace;
            white-space: nowrap;
        }
        .summary-table .subtotal-row td {
            font-weight: 700;
            background: #f8fafc;
            border-top: 1px solid #cbd5e1;
            padding: 6px 8px;
        }
        .summary-table .total-row td {
            font-size: 10pt;
            font-weight: 700;
            background: #0f172a;
            color: #fff;
            padding: 7px 8px;
        }
        .text-green { color: #16a34a; }
        .text-red   { color: #dc2626; }
        .text-blue  { color: #2563eb; }
        .text-gray  { color: #64748b; }

        /* ── Variance Box ────────────────────────────── */
        .variance-box {
            margin-top: 16px;
            padding: 12px 14px;
            border-radius: 4px;
            border-width: 2px;
            border-style: solid;
        }
        .variance-box.match  { border-color: #16a34a; background: #f0fdf4; }
        .variance-box.over   { border-color: #2563eb; background: #eff6ff; }
        .variance-box.short  { border-color: #dc2626; background: #fff1f2; }
        .variance-box .var-row {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            margin-bottom: 4px;
        }
        .variance-box .var-row:last-child { margin-bottom: 0; }
        .variance-box .var-label { color: #475569; }
        .variance-box .var-total {
            font-size: 11pt;
            font-weight: 700;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
        }

        /* ── Sales Table ─────────────────────────────── */
        .sales-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
        }
        .sales-table thead tr {
            background: #f1f5f9;
        }
        .sales-table th {
            padding: 5px 8px;
            text-align: left;
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-weight: 700;
        }
        .sales-table th.right, .sales-table td.right { text-align: right; }
        .sales-table th.center, .sales-table td.center { text-align: center; }
        .sales-table tbody tr {
            border-bottom: 1px solid #f1f5f9;
        }
        .sales-table tbody tr:nth-child(even) {
            background: #fafafa;
        }
        .sales-table td {
            padding: 4.5px 8px;
            color: #334155;
        }
        .badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 7pt;
            font-weight: 700;
        }
        .badge-cash    { background: #dcfce7; color: #166534; }
        .badge-momo    { background: #fef9c3; color: #854d0e; }
        .badge-bank    { background: #dbeafe; color: #1e40af; }
        .badge-layaway { background: #f3e8ff; color: #7c3aed; }
        .badge-paid    { background: #dcfce7; color: #166534; }
        .badge-partial { background: #fef9c3; color: #854d0e; }
        .badge-refund  { background: #fee2e2; color: #991b1b; }

        /* ── Footer ──────────────────────────────────── */
        .footer {
            margin-top: 22px;
            border-top: 2px solid #e2e8f0;
            padding-top: 14px;
        }
        .sig-grid {
            width: 100%;
            border-collapse: collapse;
        }
        .sig-grid td {
            width: 50%;
            padding: 0 10px;
            vertical-align: top;
        }
        .sig-grid td:first-child { padding-left: 0; }
        .sig-grid td:last-child  { padding-right: 0; }
        .sig-line {
            border-bottom: 1.5px solid #94a3b8;
            height: 28px;
            margin-bottom: 5px;
        }
        .sig-label {
            font-size: 7.5pt;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .generated-at {
            text-align: center;
            font-size: 7.5pt;
            color: #94a3b8;
            margin-top: 14px;
        }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>

    {{-- ── HEADER ─────────────────────────────────────── --}}
    <div class="header">
        <div class="header-top">
            <div>
                <div class="shop-name">{{ $settings['shop_name'] }}</div>
                <div class="shop-sub">{{ $settings['shop_address'] }} &nbsp;|&nbsp; {{ $settings['shop_phone'] }}</div>
            </div>
            <div class="report-label">
                <h2>End-of-Day Shift Report</h2>
                <div class="report-id">Drawer #{{ $drawer->id }} &nbsp;|&nbsp; Generated: {{ now()->format('d M Y H:i') }}</div>
            </div>
        </div>
    </div>

    {{-- ── SHIFT INFO ──────────────────────────────────── --}}
    <div class="section-header">Shift Information</div>
    <div class="section-body">
        <table class="info-grid">
            <tr>
                <td>
                    <div class="label">Cashier</div>
                    <div class="value">{{ $drawer->user->name ?? 'Unknown' }}</div>
                </td>
                <td>
                    <div class="label">Status</div>
                    <div class="value">{{ strtoupper($drawer->status) }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">Shift Opened</div>
                    <div class="value">{{ $drawer->opened_at ? $drawer->opened_at->format('d M Y, H:i:s') : '—' }}</div>
                </td>
                <td>
                    <div class="label">Shift Closed</div>
                    <div class="value">{{ $drawer->closed_at ? $drawer->closed_at->format('d M Y, H:i:s') : 'Still Open' }}</div>
                </td>
            </tr>
            @if($drawer->closed_at)
            <tr>
                <td>
                    <div class="label">Duration</div>
                    <div class="value">{{ $drawer->opened_at->diffForHumans($drawer->closed_at, true) }}</div>
                </td>
                <td></td>
            </tr>
            @endif
        </table>
    </div>

    {{-- ── REVENUE BREAKDOWN ───────────────────────────── --}}
    <div class="section-header">Cash Revenue Breakdown</div>
    <div class="section-body">
        <table class="summary-table">
            <tr>
                <td class="row-label">Opening Float (Starting Cash)</td>
                <td class="row-value text-gray">UGX {{ number_format($summary['starting_cash']) }}</td>
            </tr>
            <tr>
                <td class="row-label">Cash Product Sales</td>
                <td class="row-value text-green">+ UGX {{ number_format($summary['cash_product_sales']) }}</td>
            </tr>
            <tr>
                <td class="row-label">Cash Repair Deposits / Payments</td>
                <td class="row-value text-green">+ UGX {{ number_format($summary['cash_repair_payments']) }}</td>
            </tr>
            <tr>
                <td class="row-label">Cash Ins (Float Additions)</td>
                <td class="row-value text-blue">+ UGX {{ number_format($summary['cash_ins']) }}</td>
            </tr>
            <tr class="subtotal-row">
                <td class="row-label">Total Gross Cash</td>
                <td class="row-value">UGX {{ number_format($summary['gross_cash']) }}</td>
            </tr>
            <tr>
                <td class="row-label">Refunds Paid Out</td>
                <td class="row-value text-red">– UGX {{ number_format($summary['refunds']) }}</td>
            </tr>
            <tr>
                <td class="row-label">Operating Expenses</td>
                <td class="row-value text-red">– UGX {{ number_format($summary['operating_expenses']) }}</td>
            </tr>
            <tr class="total-row">
                <td>Expected Closing Balance</td>
                <td class="row-value" style="text-align:right;">UGX {{ number_format($summary['expected_cash']) }}</td>
            </tr>
        </table>
    </div>

    {{-- ── NON-CASH SALES (for records only) ─────────────── --}}
    <div class="section-header">Non-Cash Sales (Record Only — Not in Drawer)</div>
    <div class="section-body">
        <table class="summary-table">
            <tr>
                <td class="row-label">MoMo / Airtel Money Sales</td>
                <td class="row-value text-gray">UGX {{ number_format($summary['momo_sales']) }}</td>
            </tr>
            <tr>
                <td class="row-label">Bank / Card Sales</td>
                <td class="row-value text-gray">UGX {{ number_format($summary['bank_sales']) }}</td>
            </tr>
            <tr class="subtotal-row">
                <td class="row-label">Total Non-Cash Revenue</td>
                <td class="row-value">UGX {{ number_format($summary['momo_sales'] + $summary['bank_sales']) }}</td>
            </tr>
        </table>
    </div>

    {{-- ── VARIANCE (only for closed drawers) ─────────────── --}}
    @if($drawer->status === 'closed' && $drawer->actual_cash !== null)
        @php
            $diff = $drawer->actual_cash - $drawer->expected_cash;
            $varClass = $diff == 0 ? 'match' : ($diff > 0 ? 'over' : 'short');
            $varLabel = $diff == 0 ? 'Perfect Match' : ($diff > 0 ? 'Cash Over' : 'Cash Short');
        @endphp
        <div class="variance-box {{ $varClass }}">
            <div class="var-row">
                <span class="var-label">Expected Closing Balance</span>
                <span><strong>UGX {{ number_format($drawer->expected_cash) }}</strong></span>
            </div>
            <div class="var-row">
                <span class="var-label">Actual Cash Counted</span>
                <span><strong>UGX {{ number_format($drawer->actual_cash) }}</strong></span>
            </div>
            <div class="var-total">
                <span>{{ $varLabel }}</span>
                <span>
                    {{ $diff >= 0 ? '+' : '' }}UGX {{ number_format($diff) }}
                </span>
            </div>
        </div>
    @elseif($drawer->status === 'open')
        <div class="variance-box over" style="margin-top: 16px;">
            <div class="var-row">
                <span class="var-label">Shift is still open — expected closing balance as of now:</span>
                <span><strong>UGX {{ number_format($summary['expected_cash']) }}</strong></span>
            </div>
        </div>
    @endif

    {{-- ── ITEMIZED SALES TABLE ────────────────────────── --}}
    @if(count($sales) > 0)
    <div class="section-header" style="margin-top: 20px;">Itemized Sales ({{ count($sales) }} Transactions)</div>
    <div class="section-body" style="padding: 0;">
        <table class="sales-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Time</th>
                    <th>Method</th>
                    <th class="right">Amount</th>
                    <th class="center">Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sales as $sale)
                <tr>
                    <td style="font-family:'DejaVu Sans Mono',monospace; font-size:7.5pt; color:#94a3b8;">
                        #{{ $sale->id }}
                    </td>
                    <td>{{ $sale->customer?->name ?? 'Walk-in' }}</td>
                    <td style="font-size:7.5pt; color:#64748b;">
                        {{ \Carbon\Carbon::parse($sale->created_at)->format('H:i') }}
                    </td>
                    <td>
                        @php
                            $method = strtolower($sale->payment_method ?? '');
                            $badgeClass = match(true) {
                                str_contains($method,'cash')    => 'badge-cash',
                                str_contains($method,'momo')    => 'badge-momo',
                                str_contains($method,'airtel')  => 'badge-momo',
                                str_contains($method,'bank')    => 'badge-bank',
                                str_contains($method,'card')    => 'badge-bank',
                                str_contains($method,'layaway') => 'badge-layaway',
                                default                         => '',
                            };
                        @endphp
                        <span class="badge {{ $badgeClass }}">{{ $sale->payment_method }}</span>
                    </td>
                    <td class="right" style="font-family:'DejaVu Sans Mono',monospace; font-weight:700;">
                        UGX {{ number_format($sale->final_amount) }}
                    </td>
                    <td class="center">
                        @php
                            $status = strtolower($sale->payment_status ?? '');
                            $sBadge = match(true) {
                                $status === 'paid'     => 'badge-paid',
                                $status === 'partial'  => 'badge-partial',
                                $status === 'refunded' => 'badge-refund',
                                default                => '',
                            };
                        @endphp
                        <span class="badge {{ $sBadge }}">{{ $sale->payment_status }}</span>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- ── LAYAWAY PAYMENTS THIS SHIFT ────────────────── --}}
    @if(count($layawayPayments) > 0)
    <div class="section-header" style="margin-top: 20px;">Layaway & Repair Payments ({{ count($layawayPayments) }} Entries)</div>
    <div class="section-body" style="padding: 0;">
        <table class="sales-table">
            <thead>
                <tr>
                    <th>Sale #</th>
                    <th>Customer</th>
                    <th>Time</th>
                    <th>Method</th>
                    <th class="right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($layawayPayments as $payment)
                <tr>
                    <td style="font-family:'DejaVu Sans Mono',monospace; font-size:7.5pt; color:#94a3b8;">
                        #{{ $payment->sale_id }}
                    </td>
                    <td>{{ $payment->sale?->customer?->name ?? 'Walk-in' }}</td>
                    <td style="font-size:7.5pt; color:#64748b;">
                        {{ \Carbon\Carbon::parse($payment->created_at)->format('H:i') }}
                    </td>
                    <td>
                        @php
                            $m = strtolower($payment->payment_method ?? '');
                            $bc = match(true) {
                                str_contains($m,'cash')   => 'badge-cash',
                                str_contains($m,'momo')   => 'badge-momo',
                                str_contains($m,'airtel') => 'badge-momo',
                                str_contains($m,'bank')   => 'badge-bank',
                                str_contains($m,'card')   => 'badge-bank',
                                default                   => '',
                            };
                        @endphp
                        <span class="badge {{ $bc }}">{{ $payment->payment_method }}</span>
                    </td>
                    <td class="right" style="font-family:'DejaVu Sans Mono',monospace; font-weight:700;">
                        UGX {{ number_format($payment->amount_paid) }}
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- ── EXPENSES LOG ─────────────────────────────────── --}}
    @if(count($expenses) > 0)
    <div class="section-header" style="margin-top: 20px;">Expenses & Outflows Log ({{ count($expenses) }} Entries)</div>
    <div class="section-body" style="padding: 0;">
        <table class="sales-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Time</th>
                    <th class="right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($expenses as $expense)
                <tr>
                    <td>
                        <span class="badge {{ $expense->category === 'Refund' || str_contains($expense->category,'Refund') ? 'badge-refund' : 'badge-cash' }}">
                            {{ $expense->category }}
                        </span>
                    </td>
                    <td style="color:#64748b; font-size:8pt;">{{ $expense->description ?? '—' }}</td>
                    <td style="font-size:7.5pt; color:#94a3b8;">
                        {{ \Carbon\Carbon::parse($expense->expense_date)->format('H:i') }}
                    </td>
                    <td class="right" style="font-family:'DejaVu Sans Mono',monospace; font-weight:700; color:#dc2626;">
                        – UGX {{ number_format($expense->amount) }}
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- ── FOOTER / SIGNATURES ─────────────────────────── --}}
    <div class="footer">
        <table class="sig-grid">
            <tr>
                <td>
                    <div class="sig-line"></div>
                    <div class="sig-label">Cashier Signature &nbsp;|&nbsp; {{ $drawer->user->name ?? '' }}</div>
                </td>
                <td>
                    <div class="sig-line"></div>
                    <div class="sig-label">Manager / Supervisor Sign-Off</div>
                </td>
            </tr>
        </table>
        <div class="generated-at">
            {{ $settings['shop_name'] }} &nbsp;&bull;&nbsp; Shift Report &nbsp;&bull;&nbsp;
            Generated: {{ now()->format('D, d M Y \a\t H:i:s') }} &nbsp;&bull;&nbsp;
            Drawer #{{ $drawer->id }}
        </div>
    </div>

</body>
</html>
