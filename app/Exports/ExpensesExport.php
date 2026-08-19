<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ExpensesExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithColumnFormatting
{
    protected $expenses;

    public function __construct($expenses)
    {
        $this->expenses = clone $expenses;
    }

    public function collection()
    {
        // Add a total row at the end
        $total = $this->expenses->sum('amount');
        
        $this->expenses->push([
            'is_total' => true,
            'amount' => $total,
        ]);
        
        return $this->expenses;
    }

    public function headings(): array
    {
        return [
            'Date',
            'Cashier',
            'Drawer #',
            'Category',
            'Description',
            'Amount (UGX)',
        ];
    }

    public function map($expense): array
    {
        // Check if it's the total row we pushed
        if (is_array($expense) && isset($expense['is_total'])) {
            return [
                '', '', '', '', 'TOTAL EXPENDITURE:', $expense['amount']
            ];
        }

        return [
            $expense->expense_date->format('d/m/Y'),
            $expense->user?->name ?? 'Unknown',
            $expense->cash_drawer_id ? '#' . $expense->cash_drawer_id : '—',
            $expense->category,
            $expense->description ?? '',
            $expense->amount,
        ];
    }

    public function columnFormats(): array
    {
        return [
            'F' => '#,##0', // Number format with commas for UGX
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $highestRow = $sheet->getHighestRow();

        return [
            // Style the first row as bold text with a light gray background
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF4F46E5'], // Indigo header
                ],
            ],
            // Style the last row (totals)
            $highestRow => [
                'font' => ['bold' => true, 'size' => 12],
                'borders' => [
                    'top' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_DOUBLE,
                    ],
                ]
            ],
        ];
    }
}
