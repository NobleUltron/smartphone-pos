<?php

namespace App\Http\Controllers;

use App\DTO\ReceiptData;
use App\Models\Sale;
use App\Models\Setting;
use App\Services\ReceiptPrinterService;
use Barryvdh\DomPDF\Facade\Pdf;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReceiptPrintController extends Controller
{
    public function __construct(
        protected ReceiptPrinterService $printerService
    ) {}

    /**
     * Dispatch print job for a sale: Network Socket, QZ Tray base64, or Dev Mock
     */
    public function print(Sale $sale, Request $request)
    {
        $mode = $request->input('mode', Setting::get('print_mode', config('printing.mode', 'spooler')));
        $paperWidth = $request->input('paper_width', Setting::get('printer_paper_width', config('printing.paper_width', '80mm')));
        $printerIp = $request->input('printer_ip', Setting::get('printer_network_ip', config('printing.network.ip', '192.168.1.150')));
        $printerPort = (int) $request->input('printer_port', Setting::get('printer_network_port', config('printing.network.port', 9100)));
        $kickDrawer = $request->boolean('kick_drawer', (bool) Setting::get('printer_kick_drawer', config('printing.hardware.kick_drawer', false)));
        $cutPaper = $request->boolean('cut_paper', (bool) Setting::get('printer_cut_paper', config('printing.hardware.cut_paper', true)));
        $printerName = $request->input('qz_printer_name', Setting::get('qz_printer_name', config('printing.qz.printer_name', 'E-PoS printer driver (1)')));
        $printLogo = $request->boolean('print_logo', (bool) Setting::get('printer_print_logo', config('printing.hardware.print_logo', true)));

        $widthChars = $paperWidth === '58mm' 
            ? ReceiptPrinterService::WIDTH_58MM 
            : ReceiptPrinterService::WIDTH_80MM;

        try {
            $receiptData = ReceiptData::fromSale($sale);
            $rawBytes = $this->printerService->buildEscpos($receiptData, $widthChars, $kickDrawer, $cutPaper, $printLogo);

            if ($mode === 'network') {
                $result = $this->printerService->printViaSocket($printerIp, $printerPort, $rawBytes);
                if (!$result['success']) {
                    return response()->json([
                        'success' => false,
                        'mode' => 'network',
                        'error' => $result['error']
                    ], 502);
                }
                return response()->json([
                    'success' => true,
                    'mode' => 'network',
                    'message' => $result['message'],
                    'sale_id' => $sale->id
                ]);
            }

            if ($mode === 'mock') {
                $simulation = $this->printerService->simulateReceipt($rawBytes);
                return response()->json([
                    'success' => true,
                    'mode' => 'mock',
                    'simulated' => true,
                    'preview_text' => $simulation['preview_text'],
                    'byte_count' => $simulation['byte_count'],
                    'base64' => $simulation['base64'],
                    'sale_id' => $sale->id
                ]);
            }

            // Default: Windows Spooler mode (direct printing, no QZ Tray needed)
            // Also handles legacy 'qztray' mode by printing server-side
            $result = $this->printerService->printViaWindowsSpooler($printerName, $rawBytes);
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'mode' => 'spooler',
                    'error' => $result['error']
                ], 502);
            }
            return response()->json([
                'success' => true,
                'mode' => 'spooler',
                'message' => $result['message'],
                'sale_id' => $sale->id,
                'byte_count' => strlen($rawBytes)
            ]);

        } catch (Exception $e) {
            Log::error("Receipt Printing Error (Sale #{$sale->id}): " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to generate receipt: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calibration / Test Print endpoint
     */
    public function testPrint(Request $request)
    {
        $mode = $request->input('mode', Setting::get('print_mode', config('printing.mode', 'spooler')));
        $paperWidth = $request->input('paper_width', Setting::get('printer_paper_width', config('printing.paper_width', '80mm')));
        $printerIp = $request->input('printer_ip', Setting::get('printer_network_ip', config('printing.network.ip', '192.168.1.150')));
        $printerPort = (int) $request->input('printer_port', Setting::get('printer_network_port', config('printing.network.port', 9100)));
        $kickDrawer = $request->boolean('kick_drawer', (bool) Setting::get('printer_kick_drawer', config('printing.hardware.kick_drawer', false)));
        $cutPaper = $request->boolean('cut_paper', (bool) Setting::get('printer_cut_paper', config('printing.hardware.cut_paper', true)));
        $printerName = $request->input('qz_printer_name', Setting::get('qz_printer_name', config('printing.qz.printer_name', 'E-PoS printer driver (1)')));
        $printLogo = $request->boolean('print_logo', (bool) Setting::get('printer_print_logo', config('printing.hardware.print_logo', true)));

        $widthChars = $paperWidth === '58mm' 
            ? ReceiptPrinterService::WIDTH_58MM 
            : ReceiptPrinterService::WIDTH_80MM;

        try {
            $rawBytes = $this->printerService->generateTestReceipt($widthChars, $kickDrawer, $cutPaper, $printLogo);

            if ($mode === 'network') {
                $result = $this->printerService->printViaSocket($printerIp, $printerPort, $rawBytes);
                if (!$result['success']) {
                    return response()->json([
                        'success' => false,
                        'mode' => 'network',
                        'error' => $result['error']
                    ], 502);
                }
                return response()->json([
                    'success' => true,
                    'mode' => 'network',
                    'message' => $result['message']
                ]);
            }

            if ($mode === 'mock') {
                $simulation = $this->printerService->simulateReceipt($rawBytes);
                return response()->json([
                    'success' => true,
                    'mode' => 'mock',
                    'simulated' => true,
                    'preview_text' => $simulation['preview_text'],
                    'byte_count' => $simulation['byte_count'],
                    'base64' => $simulation['base64']
                ]);
            }

            // Default: Windows Spooler mode (direct printing)
            $result = $this->printerService->printViaWindowsSpooler($printerName, $rawBytes);
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'mode' => 'spooler',
                    'error' => $result['error']
                ], 502);
            }
            return response()->json([
                'success' => true,
                'mode' => 'spooler',
                'message' => $result['message'],
                'byte_count' => strlen($rawBytes)
            ]);

        } catch (Exception $e) {
            Log::error("Test Print Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Test print generation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download or stream PDF receipt (supports 'format=a4' or 'format=thermal')
     */
    public function pdf(Sale $sale, Request $request)
    {
        try {
            $receiptData = ReceiptData::fromSale($sale);
            $format = $request->query('format', 'a4');

            if ($format === 'thermal' || $format === '80mm') {
                $pdf = Pdf::loadView('receipts.pdf', ['receipt' => $receiptData])
                    ->setPaper([0, 0, 226.77, 650], 'portrait');
                return $pdf->stream("receipt-{$sale->id}.pdf");
            }

            // Default: A4 corporate tax invoice & warranty certificate
            $pdf = Pdf::loadView('receipts.a4', ['receipt' => $receiptData])
                ->setPaper('a4', 'portrait');

            return $pdf->stream("invoice-{$sale->id}.pdf");
        } catch (Exception $e) {
            Log::error("PDF Generation Error: " . $e->getMessage());
            return response("Error generating PDF: " . $e->getMessage(), 500);
        }
    }

    /**
     * QZ Tray X.509 Public Certificate
     */
    public function qzCertificate()
    {
        $certPath = storage_path('app/qz/certificate.pem');
        if (!file_exists($certPath)) {
            return response('Certificate not found', 404);
        }
        return response(file_get_contents($certPath), 200)
            ->header('Content-Type', 'text/plain');
    }

    /**
     * QZ Tray Cryptographic Signature Endpoint (RSA-SHA512)
     */
    public function qzSign(Request $request)
    {
        $toSign = $request->input('request');
        if (!$toSign) {
            return response('Missing payload to sign', 400);
        }

        $privateKeyPath = storage_path('app/qz/private.pem');
        if (!file_exists($privateKeyPath)) {
            return response('Private key not found', 500);
        }

        $privateKey = openssl_pkey_get_private(file_get_contents($privateKeyPath));
        if (!$privateKey) {
            return response('Unable to load private key', 500);
        }

        $signature = '';
        $alg = defined('OPENSSL_ALGO_SHA512') ? OPENSSL_ALGO_SHA512 : 'sha512';
        $success = openssl_sign($toSign, $signature, $privateKey, $alg);
        if (PHP_VERSION_ID < 80000) {
            openssl_free_key($privateKey);
        }

        if (!$success) {
            return response('Failed to sign payload', 500);
        }

        return response(base64_encode($signature), 200)
            ->header('Content-Type', 'text/plain');
    }

    /**
     * Get thermal printer configuration settings
     */
    public function getSettings()
    {
        return response()->json([
            'print_mode' => Setting::get('print_mode', config('printing.mode', 'spooler')),
            'printer_paper_width' => Setting::get('printer_paper_width', config('printing.paper_width', '80mm')),
            'printer_network_ip' => Setting::get('printer_network_ip', config('printing.network.ip', '192.168.1.150')),
            'printer_network_port' => (int) Setting::get('printer_network_port', config('printing.network.port', 9100)),
            'qz_printer_name' => Setting::get('qz_printer_name', config('printing.qz.printer_name', 'E-PoS printer driver (1)')),
            'printer_kick_drawer' => (bool) Setting::get('printer_kick_drawer', config('printing.hardware.kick_drawer', false)),
            'printer_cut_paper' => (bool) Setting::get('printer_cut_paper', config('printing.hardware.cut_paper', true)),
            'printer_print_logo' => (bool) Setting::get('printer_print_logo', config('printing.hardware.print_logo', true)),
            'windows_printers' => $this->printerService->getWindowsPrinters(),
        ]);
    }

    /**
     * Save thermal printer configuration settings
     */
    public function saveSettings(Request $request)
    {
        $validated = $request->validate([
            'print_mode' => 'required|in:network,qztray,spooler,mock',
            'printer_paper_width' => 'required|in:80mm,58mm',
            'printer_network_ip' => 'nullable|string|max:100',
            'printer_network_port' => 'nullable|integer|min:1|max:65535',
            'qz_printer_name' => 'nullable|string|max:255',
            'printer_kick_drawer' => 'nullable|boolean',
            'printer_cut_paper' => 'nullable|boolean',
            'printer_print_logo' => 'nullable|boolean',
        ]);

        foreach ($validated as $key => $val) {
            Setting::set($key, $val);
        }

        return response()->json([
            'success' => true,
            'message' => 'Printer settings updated successfully.',
            'settings' => $this->getSettings()->getData()
        ]);
    }
}
