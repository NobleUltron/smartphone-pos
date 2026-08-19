<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\DeviceImei;
use App\Models\Sale;
use App\Models\Repair;
use App\Models\Expense;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class ExportController extends Controller
{
    private function styleHeaderRow($sheet, $lastColumn)
    {
        $headerRange = "A1:{$lastColumn}1";
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E293B'], // Slate 800
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
                'horizontal' => Alignment::HORIZONTAL_LEFT,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(26);
    }

    private function autoFitColumns($sheet, $lastColumn)
    {
        foreach (range('A', $lastColumn) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    public function exportInventory()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Inventory Export');

        $headers = [
            'Item / Model Name',
            'Brand',
            'Category',
            'IMEI / Serial #',
            'Status',
            'Unit Cost (UGX)',
            'Selling Price (UGX)',
            'Date Added'
        ];

        $sheet->fromArray([$headers], null, 'A1');
        $this->styleHeaderRow($sheet, 'H');

        $rowNum = 2;

        // Serialized Devices
        $imeis = DeviceImei::with(['product.brand', 'product.category'])->get();
        foreach ($imeis as $item) {
            $sheet->fromArray([[
                $item->product->model_name ?? 'N/A',
                $item->product->brand->name ?? 'N/A',
                $item->product->category->name ?? 'N/A',
                (string)$item->imei,
                $item->status,
                (float)$item->cost_price,
                (float)$item->selling_price,
                $item->created_at->toDateTimeString()
            ]], null, "A{$rowNum}");
            $rowNum++;
        }

        // Bulk Non-Serialized Products
        $products = Product::with(['brand', 'category'])->where('type', 'bulk')->get();
        foreach ($products as $prod) {
            $sheet->fromArray([[
                $prod->model_name,
                $prod->brand->name ?? 'N/A',
                $prod->category->name ?? 'N/A',
                'N/A (Bulk - Qty: ' . $prod->quantity . ')',
                $prod->quantity > 0 ? 'In Stock' : 'Out of Stock',
                (float)$prod->cost_price,
                (float)$prod->selling_price,
                $prod->created_at->toDateTimeString()
            ]], null, "A{$rowNum}");
            $rowNum++;
        }

        $this->autoFitColumns($sheet, 'H');

        $filename = 'smartpos_inventory_export_' . Carbon::now()->format('Y_m_d') . '.xlsx';
        
        $writer = new Xlsx($spreadsheet);
        
        return response()->stream(function() use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function exportSales()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Sales & Receipts');

        $headers = [
            'Receipt #',
            'Date & Time',
            'Customer Name',
            'Customer Phone',
            'Cashier',
            'Payment Method',
            'Payment Status',
            'Discount (UGX)',
            'Final Amount (UGX)'
        ];

        $sheet->fromArray([$headers], null, 'A1');
        $this->styleHeaderRow($sheet, 'I');

        $rowNum = 2;
        $sales = Sale::with(['customer', 'user'])->orderBy('created_at', 'desc')->get();
        foreach ($sales as $sale) {
            $sheet->fromArray([[
                '#' . $sale->id,
                $sale->created_at->toDateTimeString(),
                $sale->customer ? $sale->customer->name : 'Walk-in Customer',
                $sale->customer ? $sale->customer->phone : 'N/A',
                $sale->user ? $sale->user->name : 'System',
                $sale->payment_method,
                $sale->payment_status,
                (float)$sale->discount,
                (float)$sale->final_amount
            ]], null, "A{$rowNum}");
            $rowNum++;
        }

        $this->autoFitColumns($sheet, 'I');

        $filename = 'smartpos_sales_export_' . Carbon::now()->format('Y_m_d') . '.xlsx';
        
        $writer = new Xlsx($spreadsheet);
        
        return response()->stream(function() use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function exportRepairs()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Repair Tickets');

        $headers = [
            'Repair Code',
            'Intake Date',
            'Customer Name',
            'Customer Phone',
            'Device Model',
            'IMEI / Serial',
            'Issue Description',
            'Technician',
            'Status',
            'Total Cost (UGX)',
            'Deposit Paid (UGX)',
            'Balance Due (UGX)'
        ];

        $sheet->fromArray([$headers], null, 'A1');
        $this->styleHeaderRow($sheet, 'L');

        $rowNum = 2;
        $repairs = Repair::with(['customer', 'user', 'sale.layawayPayments'])->orderBy('created_at', 'desc')->get();
        foreach ($repairs as $repair) {
            $totalPaid = $repair->sale ? $repair->sale->layawayPayments->sum('amount_paid') : $repair->deposit;
            $balance = max(0, $repair->estimated_cost - $totalPaid);

            $sheet->fromArray([[
                $repair->repair_code,
                $repair->created_at->toDateTimeString(),
                $repair->customer_name,
                $repair->customer_phone,
                $repair->device_model,
                (string)($repair->imei ?? 'N/A'),
                $repair->problem_description,
                $repair->user ? $repair->user->name : 'Unassigned',
                $repair->status,
                (float)$repair->estimated_cost,
                (float)$totalPaid,
                (float)$balance
            ]], null, "A{$rowNum}");
            $rowNum++;
        }

        $this->autoFitColumns($sheet, 'L');

        $filename = 'smartpos_repairs_export_' . Carbon::now()->format('Y_m_d') . '.xlsx';
        
        $writer = new Xlsx($spreadsheet);
        
        return response()->stream(function() use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
