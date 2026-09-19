<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Thermal Printing Mode
    |--------------------------------------------------------------------------
    |
    | Supported: "spooler", "network", "qztray", "mock"
    | - "spooler": Sends raw ESC/POS bytes directly to Windows print spooler (recommended)
    | - "network": Sends raw ESC/POS byte stream directly to printer IP on port 9100
    | - "qztray": Legacy mode — also uses spooler (QZ Tray no longer required)
    | - "mock":   Developer simulation mode returning decoded ASCII preview
    |
    */
    'mode' => env('PRINT_MODE', 'spooler'),

    /*
    |--------------------------------------------------------------------------
    | Paper Roll Width
    |--------------------------------------------------------------------------
    |
    | Supported: "80mm" (48 chars/line), "58mm" (32 chars/line)
    |
    */
    'paper_width' => env('PRINT_PAPER_WIDTH', '80mm'),

    /*
    |--------------------------------------------------------------------------
    | Network TCP Socket Printer Settings (for PRINT_MODE=network)
    |--------------------------------------------------------------------------
    */
    'network' => [
        'ip' => env('PRINTER_IP', '192.168.1.150'),
        'port' => (int) env('PRINTER_PORT', 9100),
        'timeout' => (int) env('PRINTER_TIMEOUT', 5),
    ],

    /*
    |--------------------------------------------------------------------------
    | QZ Tray Target Printer (for PRINT_MODE=qztray)
    |--------------------------------------------------------------------------
    */
    'qz' => [
        'printer_name' => env('QZ_PRINTER_NAME', 'E-PoS printer driver (1)'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Hardware Signal Options
    |--------------------------------------------------------------------------
    */
    'hardware' => [
        'kick_drawer' => (bool) env('PRINTER_KICK_DRAWER', false),
        'cut_paper' => (bool) env('PRINTER_CUT_PAPER', true),
        'print_logo' => (bool) env('PRINTER_PRINT_LOGO', true),
    ],
];
