<?php

namespace App\Services;

use App\DTO\ReceiptData;
use App\Models\Setting;
use Exception;
use Illuminate\Support\Facades\Log;
use Mike42\Escpos\PrintConnectors\DummyPrintConnector;
use Mike42\Escpos\Printer;

class ReceiptPrinterService
{
    public const WIDTH_80MM = 48;
    public const WIDTH_58MM = 32;

    /**
     * Build ESC/POS binary string from structured ReceiptData
     */
    public function buildEscpos(
        ReceiptData $receipt,
        int $widthChars = self::WIDTH_80MM,
        bool $kickDrawer = false,
        bool $cutPaper = true,
        bool $printLogo = true
    ): string {
        $connector = new DummyPrintConnector();
        $printer = new Printer($connector);

        // 1. Hardware Initialization
        $printer->initialize();

        // 2. Drawer Kick (optional at beginning)
        if ($kickDrawer) {
            $printer->pulse();
        }

        // 3. Store Header & Logo
        $printer->setJustification(Printer::JUSTIFY_CENTER);

        if ($printLogo && !empty($receipt->storeLogo)) {
            $this->printLogoImage($printer, $receipt->storeLogo, $widthChars);
        }

        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->selectPrintMode(Printer::MODE_DOUBLE_HEIGHT | Printer::MODE_DOUBLE_WIDTH | Printer::MODE_EMPHASIZED);
        $printer->text($this->sanitizeText($receipt->storeName) . "\n");

        $printer->selectPrintMode(Printer::MODE_FONT_A);
        if (!empty($receipt->storeAddress)) {
            $printer->text($this->sanitizeText($receipt->storeAddress) . "\n");
        }
        if (!empty($receipt->storePhone)) {
            $printer->text("Tel: " . $this->sanitizeText($receipt->storePhone) . "\n");
        }

        // Refund banner if applicable
        if ($receipt->isRefunded) {
            $printer->feed(1);
            $printer->selectPrintMode(Printer::MODE_EMPHASIZED | Printer::MODE_DOUBLE_HEIGHT);
            $printer->text("*** REFUNDED ***\n");
            $printer->selectPrintMode(Printer::MODE_FONT_A);
        }

        $printer->feed(1);

        // 4. Metadata (Left/Right columns)
        $printer->setJustification(Printer::JUSTIFY_LEFT);
        $printer->text($this->formatColumns("Receipt #:", (string)$receipt->receiptNumber, $widthChars) . "\n");
        $printer->text($this->formatColumns("Date:", $receipt->dateTime, $widthChars) . "\n");
        $printer->text($this->formatColumns("Cashier:", $receipt->cashierName, $widthChars) . "\n");

        if (!empty($receipt->customerName)) {
            $printer->text($this->formatColumns("Customer:", $receipt->customerName, $widthChars) . "\n");
            if (!empty($receipt->customerPhone)) {
                $printer->text($this->formatColumns("Phone:", $receipt->customerPhone, $widthChars) . "\n");
            }
        } elseif (!empty($receipt->dealerName)) {
            $printer->text($this->formatColumns("Partner/Dealer:", $receipt->dealerName, $widthChars) . "\n");
            if (!empty($receipt->dealerPhone)) {
                $printer->text($this->formatColumns("Phone:", $receipt->dealerPhone, $widthChars) . "\n");
            }
        }

        // 5. Divider
        $printer->text($this->divider('-', $widthChars) . "\n");

        // 6. Column Headers
        $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
        $printer->text($this->formatColumns("ITEM DESCRIPTION", "AMOUNT", $widthChars) . "\n");
        $printer->selectPrintMode(Printer::MODE_FONT_A);
        $printer->text($this->divider('-', $widthChars) . "\n");

        // 7. Line Items
        foreach ($receipt->items as $item) {
            $desc = $this->sanitizeText($item['description'] ?? 'Item');
            $qty = (int)($item['quantity'] ?? 1);
            $unitPrice = (float)($item['unit_price'] ?? 0);
            $totalPrice = (float)($item['total_price'] ?? ($unitPrice * $qty));

            $formattedTotal = number_format($totalPrice);

            // Item Name & Total
            $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
            $printer->text($this->formatColumns($desc, $formattedTotal, $widthChars) . "\n");
            $printer->selectPrintMode(Printer::MODE_FONT_A);

            // Sub details (IMEI / Qty x Price / Warranty / Notes)
            if (!empty($item['imei'])) {
                $printer->text("  IMEI: " . $item['imei'] . "\n");
            } elseif ($qty > 1) {
                $printer->text("  Qty: {$qty} @ " . number_format($unitPrice) . "\n");
            }

            if (!empty($item['warranty_months']) && $item['warranty_months'] > 0) {
                $printer->text("  Warranty: " . $item['warranty_months'] . " Months\n");
            }

            if (!empty($item['notes'])) {
                $printer->text("  Note: " . $this->sanitizeText($item['notes']) . "\n");
            }
        }

        // 8. Totals Divider
        $printer->text($this->divider('-', $widthChars) . "\n");

        // Subtotal & Discounts
        $curr = $receipt->currency;
        $printer->text($this->formatColumns("Subtotal", "{$curr} " . number_format($receipt->subtotal), $widthChars) . "\n");

        if ($receipt->discount > 0) {
            $printer->text($this->formatColumns("Discount", "-{$curr} " . number_format($receipt->discount), $widthChars) . "\n");
        }

        if ($receipt->tradeInValue > 0) {
            $tradeDesc = "Trade-In" . ($receipt->tradeInDevice ? " ({$receipt->tradeInDevice})" : "");
            $printer->text($this->formatColumns($tradeDesc, "-{$curr} " . number_format($receipt->tradeInValue), $widthChars) . "\n");
        }

        $printer->text($this->divider('=', $widthChars) . "\n");

        // Grand Total (Emphasized Double Height)
        $printer->selectPrintMode(Printer::MODE_DOUBLE_HEIGHT | Printer::MODE_EMPHASIZED);
        $printer->text($this->formatColumns("TOTAL", "{$curr} " . number_format($receipt->finalAmount), $widthChars) . "\n");
        $printer->selectPrintMode(Printer::MODE_FONT_A);
        $printer->text($this->divider('=', $widthChars) . "\n");

        // 9. Payment Information
        $printer->text($this->formatColumns("Payment Method:", $receipt->paymentMethod, $widthChars) . "\n");
        $printer->text($this->formatColumns("Payment Status:", strtoupper($receipt->paymentStatus), $widthChars) . "\n");

        if (strtolower($receipt->paymentMethod) === 'cash' && $receipt->tenderedAmount > 0) {
            $printer->text($this->divider('-', $widthChars) . "\n");
            $printer->text($this->formatColumns("Tendered:", "{$curr} " . number_format($receipt->tenderedAmount), $widthChars) . "\n");
            $printer->text($this->formatColumns("Change Due:", "{$curr} " . number_format($receipt->changeDue), $widthChars) . "\n");
        } elseif (strtolower($receipt->paymentMethod) === 'layaway') {
            $printer->text($this->divider('-', $widthChars) . "\n");
            $printer->text($this->formatColumns("Total Paid:", "{$curr} " . number_format($receipt->layawayPaid), $widthChars) . "\n");
            $printer->text($this->formatColumns("Balance Due:", "{$curr} " . number_format($receipt->layawayBalance), $widthChars) . "\n");
        }

        // 10. Footer Note & Terms
        $printer->feed(1);
        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
        $printer->text($this->sanitizeText($receipt->footerNote) . "\n\n");
        $printer->selectPrintMode(Printer::MODE_FONT_A);

        if (!empty($receipt->termsConditions)) {
            $printer->setJustification(Printer::JUSTIFY_LEFT);
            $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
            $printer->text("TERMS & CONDITIONS:\n");
            $printer->selectPrintMode(Printer::MODE_FONT_A);

            foreach ($receipt->termsConditions as $idx => $term) {
                $num = $idx + 1;
                $line = "{$num}. " . $this->sanitizeText($term);
                $printer->text($this->wrapText($line, $widthChars) . "\n");
            }
            $printer->feed(1);
        }

        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->text("Powered by SmartPOS\n");

        // 11. Native Barcode (Code128)
        if (!empty($receipt->barcodeValue)) {
            try {
                $printer->feed(1);
                $printer->setBarcodeHeight(48);
                $printer->setBarcodeWidth(2);
                $printer->barcode($receipt->barcodeValue, Printer::BARCODE_CODE128);
            } catch (Exception $e) {
                // Fallback text if printer fails barcode rendering
                $printer->text("* " . $receipt->barcodeValue . " *\n");
            }
        }

        // 12. Feed & Cut
        $printer->feed(4);
        if ($cutPaper) {
            $printer->cut(Printer::CUT_PARTIAL);
        }

        // Extract raw byte stream
        $rawBytes = $connector->getData();
        $printer->close();

        return $rawBytes;
    }

    /**
     * Generate calibration / test print receipt
     */
    public function generateTestReceipt(
        int $widthChars = self::WIDTH_80MM,
        bool $kickDrawer = false,
        bool $cutPaper = true,
        bool $printLogo = true
    ): string {
        $storeName = Setting::get('shop_name', 'SmartPOS Kampala');
        $storePhone = Setting::get('shop_phone', '+256 700 000 000');
        $storeAddress = Setting::get('shop_address', '123 Kampala Road, Kampala');

        $connector = new DummyPrintConnector();
        $printer = new Printer($connector);

        $printer->initialize();
        if ($kickDrawer) {
            $printer->pulse();
        }

        $printer->setJustification(Printer::JUSTIFY_CENTER);

        if ($printLogo) {
            $logoSource = Setting::get('store_logo');
            if (!empty($logoSource)) {
                $this->printLogoImage($printer, $logoSource, $widthChars);
            }
        }

        $printer->selectPrintMode(Printer::MODE_DOUBLE_HEIGHT | Printer::MODE_DOUBLE_WIDTH | Printer::MODE_EMPHASIZED);
        $printer->text("TEST PRINT\n");
        $printer->selectPrintMode(Printer::MODE_FONT_A);
        $printer->text("{$storeName}\n");
        $printer->text("{$storeAddress}\n");
        $printer->text("Tel: {$storePhone}\n\n");

        $printer->setJustification(Printer::JUSTIFY_LEFT);
        $printer->text($this->divider('=', $widthChars) . "\n");
        $printer->selectPrintMode(Printer::MODE_EMPHASIZED);
        $printer->text($this->formatColumns("THERMAL PRINTER CALIBRATION", "OK", $widthChars) . "\n");
        $printer->selectPrintMode(Printer::MODE_FONT_A);
        $printer->text($this->divider('=', $widthChars) . "\n");

        $printer->text($this->formatColumns("Paper Width Mode:", $widthChars === self::WIDTH_80MM ? "80mm (48 Chars)" : "58mm (32 Chars)", $widthChars) . "\n");
        $printer->text($this->formatColumns("Print Engine:", "Raw ESC/POS", $widthChars) . "\n");
        $printer->text($this->formatColumns("Timestamp:", date('Y-m-d H:i:s'), $widthChars) . "\n");
        $printer->text($this->formatColumns("Drawer Kick:", $kickDrawer ? "YES" : "NO", $widthChars) . "\n");
        $printer->text($this->formatColumns("Auto Paper Cut:", $cutPaper ? "YES" : "NO", $widthChars) . "\n");

        $printer->text($this->divider('-', $widthChars) . "\n");
        $printer->text("COLUMN ALIGNMENT RULER:\n");
        // Print ruler marks
        $ruler = "1" . str_repeat(".", max(0, $widthChars - 2)) . $widthChars;
        $printer->text(substr($ruler, 0, $widthChars) . "\n");
        $printer->text($this->divider('-', $widthChars) . "\n");

        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->text("If this receipt printed clearly and\naligned without margins, your printer\nis correctly configured.\n\n");

        try {
            $printer->setBarcodeHeight(40);
            $printer->setBarcodeWidth(2);
            $printer->barcode("SMARTPOS-TEST", Printer::BARCODE_CODE128);
        } catch (Exception $e) {
            $printer->text("* SMARTPOS-TEST *\n");
        }

        $printer->feed(4);
        if ($cutPaper) {
            $printer->cut(Printer::CUT_PARTIAL);
        }

        $rawBytes = $connector->getData();
        $printer->close();

        return $rawBytes;
    }

    /**
     * Send raw ESC/POS bytes directly to printer via TCP socket (port 9100)
     */
    public function printViaSocket(string $ip, int $port = 9100, string $payload = '', int $timeout = 5): array
    {
        $errno = 0;
        $errstr = '';

        $fp = @fsockopen($ip, $port, $errno, $errstr, $timeout);

        if (!$fp) {
            return [
                'success' => false,
                'error' => "Could not connect to network printer at {$ip}:{$port}. ({$errstr} - Code {$errno}). Ensure printer is turned on and on the same network."
            ];
        }

        stream_set_timeout($fp, $timeout);
        $written = fwrite($fp, $payload);
        fflush($fp);
        fclose($fp);

        if ($written === false || $written < strlen($payload)) {
            return [
                'success' => false,
                'error' => "Connection opened, but only wrote {$written} of " . strlen($payload) . " bytes to printer."
            ];
        }

        return [
            'success' => true,
            'message' => "Successfully transmitted " . strlen($payload) . " bytes to {$ip}:{$port}."
        ];
    }

    /**
     * Send raw ESC/POS bytes directly to a Windows printer via the local print spooler.
     * Uses the Winspool API (via PowerShell P/Invoke) to send raw binary data directly 
     * through the spooler without driver interception — same as "RAW" printing.
     * 
     * This approach only works when PHP runs on the SAME machine as the printer (e.g. XAMPP).
     * No QZ Tray, no network socket — just direct Windows spooler access.
     *
     * @param string $printerName  The Windows printer name, e.g. "E-PoS printer driver (1)"
     * @param string $rawBytes     Raw ESC/POS binary payload
     * @return array{success: bool, message?: string, error?: string}
     */
    public function printViaWindowsSpooler(string $printerName, string $rawBytes): array
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
            return [
                'success' => false,
                'error' => 'Windows spooler printing is only supported on Windows OS.'
            ];
        }

        if (empty($rawBytes)) {
            return [
                'success' => false,
                'error' => 'Empty print payload — nothing to print.'
            ];
        }

        $bytesCount = strlen($rawBytes);

        // Write raw bytes to a temporary file
        $tempFile = tempnam(sys_get_temp_dir(), 'smartpos_receipt_');
        if ($tempFile === false) {
            return [
                'success' => false,
                'error' => 'Failed to create temporary file for print job.'
            ];
        }

        $bytesWritten = file_put_contents($tempFile, $rawBytes);
        if ($bytesWritten === false || $bytesWritten < $bytesCount) {
            @unlink($tempFile);
            return [
                'success' => false,
                'error' => 'Failed to write print data to temp file.'
            ];
        }

        $escapedTempFile = str_replace('/', '\\', $tempFile);
        $escapedPrinter = str_replace('"', '', $printerName);

        // Strategy 1: PowerShell C# P/Invoke Winspool API — sends RAW bytes through spooler
        // This bypasses the driver and sends raw ESC/POS directly to the printer hardware
        $psScript = <<<'POWERSHELL'
param($PrinterName, $FilePath)

$csharp = @'
using System;
using System.Runtime.InteropServices;

namespace SmartPOS {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct DOC_INFO_1 {
        public string pDocName;
        public string pOutputFile;
        public string pDatatype;
    }

    public class RawPrinterHelper {
        [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
        public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

        [DllImport("winspool.drv", SetLastError=true)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, ref DOC_INFO_1 pDocInfo);

        [DllImport("winspool.drv", SetLastError=true)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError=true)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError=true)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", SetLastError=true)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        public static bool SendFileToPrinter(string szPrinterName, string szFileName, out string error) {
            error = null;
            byte[] bytes;
            try {
                bytes = System.IO.File.ReadAllBytes(szFileName);
            } catch (Exception ex) {
                error = "Read file failed: " + ex.Message;
                return false;
            }

            IntPtr hPrinter = IntPtr.Zero;
            if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
                error = "OpenPrinter failed (Win32 error: " + Marshal.GetLastWin32Error() + "). Ensure printer name is exact and printer is connected.";
                return false;
            }
            try {
                DOC_INFO_1 di = new DOC_INFO_1();
                di.pDocName = "SmartPOS Receipt";
                di.pDatatype = "RAW";
                if (!StartDocPrinter(hPrinter, 1, ref di)) {
                    error = "StartDocPrinter failed (Win32 error: " + Marshal.GetLastWin32Error() + ")";
                    return false;
                }
                try {
                    if (!StartPagePrinter(hPrinter)) {
                        error = "StartPagePrinter failed (Win32 error: " + Marshal.GetLastWin32Error() + ")";
                        return false;
                    }
                    try {
                        IntPtr pUnmanaged = Marshal.AllocHGlobal(bytes.Length);
                        Marshal.Copy(bytes, 0, pUnmanaged, bytes.Length);
                        int dwWritten = 0;
                        bool bSuccess = WritePrinter(hPrinter, pUnmanaged, bytes.Length, out dwWritten);
                        Marshal.FreeHGlobal(pUnmanaged);
                        if (!bSuccess || dwWritten != bytes.Length) {
                            error = "WritePrinter failed: wrote " + dwWritten + " of " + bytes.Length + " bytes";
                            return false;
                        }
                        return true;
                    } finally {
                        EndPagePrinter(hPrinter);
                    }
                } finally {
                    EndDocPrinter(hPrinter);
                }
            } finally {
                ClosePrinter(hPrinter);
            }
        }
    }
}
'@

try {
    if (-not ([System.Management.Automation.PSTypeName]'SmartPOS.RawPrinterHelper').Type) {
        Add-Type -TypeDefinition $csharp -Language CSharp
    }
    [string]$err = $null
    $ok = [SmartPOS.RawPrinterHelper]::SendFileToPrinter($PrinterName, $FilePath, [ref]$err)
    if ($ok) {
        Write-Output "OK"
        exit 0
    } else {
        Write-Error "Print error: $err"
        exit 1
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
POWERSHELL;

        // Save the PowerShell script to a temp file
        $psFile = tempnam(sys_get_temp_dir(), 'smartpos_print_') . '.ps1';
        file_put_contents($psFile, $psScript);

        $psCmd = sprintf(
            'powershell -NoProfile -ExecutionPolicy Bypass -File "%s" -PrinterName "%s" -FilePath "%s" 2>&1',
            str_replace('/', '\\', $psFile),
            $escapedPrinter,
            $escapedTempFile
        );

        $output = [];
        $returnCode = null;
        exec($psCmd, $output, $returnCode);

        // Cleanup
        @unlink($psFile);
        @unlink($tempFile);

        $outputStr = implode("\n", $output);

        if ($returnCode === 0 && strpos($outputStr, 'OK') !== false) {
            return [
                'success' => true,
                'message' => "Receipt ({$bytesCount} bytes) printed to \"{$printerName}\" via Windows spooler."
            ];
        }

        // Strategy 2: Try direct USB port write
        $psDetectPort = sprintf(
            'powershell -NoProfile -Command "Get-Printer -Name \'%s\' | Select-Object -ExpandProperty PortName" 2>&1',
            addcslashes($escapedPrinter, "'")
        );
        $portOutput = [];
        exec($psDetectPort, $portOutput);
        $portName = trim(implode('', $portOutput));

        if (!empty($portName) && stripos($portName, 'USB') !== false) {
            $tempFile2 = tempnam(sys_get_temp_dir(), 'smartpos_receipt_');
            file_put_contents($tempFile2, $rawBytes);
            $escapedTempFile2 = str_replace('/', '\\', $tempFile2);

            $portCmd = sprintf(
                'copy /b "%s" "\\\\.\\%s" > NUL 2>&1',
                $escapedTempFile2,
                $portName
            );
            exec($portCmd, $output, $returnCode);
            @unlink($tempFile2);

            if ($returnCode === 0) {
                return [
                    'success' => true,
                    'message' => "Receipt ({$bytesCount} bytes) sent directly to port {$portName}."
                ];
            }
        }

        Log::warning("Windows spooler print failed for \"{$printerName}\"", [
            'output' => $outputStr,
            'port' => $portName ?? 'unknown',
            'return_code' => $returnCode,
        ]);

        return [
            'success' => false,
            'error' => "Failed to print to \"{$printerName}\". " . ($outputStr ?: 'Ensure the printer is online and connected.'),
        ];
    }

    /**
     * Get list of installed Windows printers
     * @return array<string>
     */
    public function getWindowsPrinters(): array
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
            return [];
        }

        $output = [];
        $returnCode = 0;
        exec('powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name" 2>&1', $output, $returnCode);

        if ($returnCode !== 0) {
            return [];
        }

        return array_values(array_filter(array_map('trim', $output)));
    }

    /**
     * Print store logo image centered on receipt
     */
    protected function printLogoImage(Printer $printer, string $logoSource, int $widthChars): void
    {
        try {
            // For 80mm roll (48 chars ~ 576 dots), scale logo to 256px max width
            // For 58mm roll (32 chars ~ 384 dots), scale logo to 192px max width
            $maxWidth = ($widthChars === self::WIDTH_58MM) ? 192 : 256;

            $logoImage = new SafeGdEscposImage($logoSource, $maxWidth);
            $printer->setJustification(Printer::JUSTIFY_CENTER);
            $printer->bitImage($logoImage);
            $printer->feed(1);
        } catch (Exception $e) {
            Log::info("Thermal logo print skipped: " . $e->getMessage());
        }
    }

    /**
     * Dev Simulator: Convert ESC/POS byte stream to human-readable ASCII representation
     */
    public function simulateReceipt(string $binaryPayload): array
    {
        // Replace known ESC/POS command sequences with readable or line markers
        // Bit image / raster graphics commands
        $clean = preg_replace('/\x1D\x76\x30[\x00-\xFF]{4}[\x00-\xFF]+?(?=\x1B|\x1D|$)/s', "\n[=== STORE LOGO ===]\n", $binaryPayload);
        $clean = preg_replace('/\x1B\x2A[\x00-\xFF]+?(?=\x1B|\x1D|$)/s', "\n[=== STORE LOGO ===]\n", $clean);
        // Cut command
        $clean = preg_replace('/\x1D\x56[\x00-\xFF]{1,2}/', "\n[--- PAPER CUT ---]\n", $clean);
        // Pulse command
        $clean = preg_replace('/\x1B\x70[\x00-\xFF]{3}/', "[--- CASH DRAWER KICK ---]\n", $clean);
        // Barcode commands
        $clean = preg_replace('/\x1D\x6B[\x00-\xFF]+/', "\n[--- BARCODE ---]\n", $clean);
        // Strip ESC/GS/FS prefixes and their argument bytes
        $clean = preg_replace('/\x1B[\x21\x40\x61\x2D\x45\x47\x4D\x74\x7B\x32\x33][\x00-\xFF]?/', '', $clean);
        $clean = preg_replace('/\x1D[\x21\x42\x48\x4C\x57\x66\x68\x77][\x00-\xFF]?/', '', $clean);
        // Remove remaining non-printable control characters except newline and tab
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $clean);
        // Normalize newlines
        $clean = str_replace(["\r\n", "\r"], "\n", $clean);

        return [
            'success' => true,
            'simulated' => true,
            'byte_count' => strlen($binaryPayload),
            'base64' => base64_encode($binaryPayload),
            'preview_text' => trim($clean)
        ];
    }

    /**
     * Two-column justification helper with automatic left wrapping
     */
    public function formatColumns(string $left, string $right, int $width = self::WIDTH_80MM): string
    {
        $rightLen = mb_strwidth($right);
        $availableForLeft = $width - $rightLen - 1;

        if ($availableForLeft < 5) {
            // Not enough space, put right on next line
            return $left . "\n" . str_repeat(' ', max(0, $width - $rightLen)) . $right;
        }

        $leftLen = mb_strwidth($left);
        if ($leftLen <= $availableForLeft) {
            $spaces = $width - $leftLen - $rightLen;
            return $left . str_repeat(' ', max(1, $spaces)) . $right;
        }

        // Wrap left into multiple lines
        $wrapped = explode("\n", wordwrap($left, $availableForLeft, "\n", true));
        $lines = [];
        $lastIdx = count($wrapped) - 1;

        for ($i = 0; $i <= $lastIdx; $i++) {
            $line = $wrapped[$i];
            if ($i === $lastIdx) {
                $curLen = mb_strwidth($line);
                $spaces = $width - $curLen - $rightLen;
                $lines[] = $line . str_repeat(' ', max(1, $spaces)) . $right;
            } else {
                $lines[] = $line;
            }
        }

        return implode("\n", $lines);
    }

    /**
     * Word wrap text for standard thermal printer width
     */
    public function wrapText(string $text, int $width = self::WIDTH_80MM): string
    {
        return wordwrap($text, $width, "\n", true);
    }

    /**
     * Generate horizontal divider line
     */
    public function divider(string $char = '-', int $width = self::WIDTH_80MM): string
    {
        return str_repeat($char, $width);
    }

    /**
     * Sanitize text to ASCII / printable characters for standard thermal printers
     */
    private function sanitizeText(string $text): string
    {
        // Transliterate accents or special unicode to ASCII
        $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
        return $converted !== false ? $converted : preg_replace('/[^\x20-\x7E]/', '', $text);
    }
}
