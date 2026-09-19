/**
 * Unified Thermal Printing Service
 * Coordinates receipt printing across modes:
 *   - spooler: Server sends raw ESC/POS directly to Windows print spooler (default, recommended)
 *   - network: Server sends raw bytes to printer via TCP socket (port 9100)
 *   - mock: Dev simulation mode (renders receipt as text)
 */
class ThermalPrintService {
    /**
     * Print a sale thermal receipt
     * @param {number|string} saleId
     * @param {Object} overrides - optional custom mode, printer name, etc.
     */
    async printSaleReceipt(saleId, overrides = {}) {
        const storedMode = localStorage.getItem('smartpos_print_mode');
        const storedPrinter = localStorage.getItem('smartpos_qz_printer');
        const storedWidth = localStorage.getItem('smartpos_paper_width');
        const storedIp = localStorage.getItem('smartpos_network_ip');
        const storedPort = localStorage.getItem('smartpos_network_port');
        const storedDrawer = localStorage.getItem('smartpos_kick_drawer');
        const storedCut = localStorage.getItem('smartpos_auto_cut');
        const storedLogo = localStorage.getItem('smartpos_print_logo');

        const payload = {
            mode: overrides.mode || storedMode || 'spooler',
            paper_width: overrides.paper_width || storedWidth || undefined,
            printer_ip: overrides.printer_ip || storedIp || undefined,
            printer_port: overrides.printer_port || storedPort || undefined,
            qz_printer_name: overrides.qz_printer_name || storedPrinter || undefined,
            kick_drawer: overrides.kick_drawer !== undefined ? overrides.kick_drawer : (storedDrawer === 'true'),
            cut_paper: overrides.cut_paper !== undefined ? overrides.cut_paper : (storedCut !== 'false'),
            print_logo: overrides.print_logo !== undefined ? overrides.print_logo : (storedLogo !== 'false'),
        };

        console.log('[ThermalPrint] Sending print request for sale', saleId, 'mode:', payload.mode);

        const res = await fetch(`/api/receipts/${saleId}/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            console.error('[ThermalPrint] Server error:', data);
            throw new Error(data.error || `Receipt print failed with status ${res.status}`);
        }

        console.log('[ThermalPrint] Success:', data.mode, data.message);

        // Server-side printing modes (spooler, network) — printing already happened
        if (data.mode === 'spooler' || data.mode === 'network') {
            return {
                success: true,
                mode: data.mode,
                message: data.message || 'Receipt printed successfully!',
            };
        }

        // Mock / Dev Simulation — return preview text
        if (data.mode === 'mock' || data.simulated) {
            return {
                success: true,
                mode: 'mock',
                simulated: true,
                preview_text: data.preview_text,
                byte_count: data.byte_count,
                message: 'Receipt simulated successfully in developer mode.',
            };
        }

        // Fallback for any other mode
        return {
            success: true,
            mode: data.mode || 'unknown',
            message: data.message || 'Print job dispatched.',
        };
    }

    /**
     * Trigger a calibration / test print
     */
    async printTestReceipt(options = {}) {
        const res = await fetch('/api/receipts/test-print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify(options),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            console.error('[ThermalPrint] Test print error:', data);
            throw new Error(data.error || 'Test print request failed');
        }

        console.log('[ThermalPrint] Test print success:', data.mode, data.message);

        if (data.mode === 'spooler' || data.mode === 'network') {
            return {
                success: true,
                mode: data.mode,
                message: data.message || 'Test print sent successfully!',
            };
        }

        if (data.mode === 'mock' || data.simulated) {
            return {
                success: true,
                mode: 'mock',
                simulated: true,
                preview_text: data.preview_text,
                byte_count: data.byte_count,
            };
        }

        return {
            success: true,
            mode: data.mode || 'unknown',
            message: data.message || 'Test print dispatched.',
        };
    }

    /**
     * Send hardware cash drawer kick pulse via server-side spooler
     */
    async triggerCashDrawer(printerName = null) {
        const target = printerName || localStorage.getItem('smartpos_qz_printer') || 'E-PoS printer driver (1)';

        try {
            const res = await fetch('/api/receipts/test-print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    qz_printer_name: target,
                    kick_drawer: true,
                    cut_paper: false,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Cash drawer kick failed');
            }
            return true;
        } catch (e) {
            console.warn('[ThermalPrintService] Drawer kick error:', e);
            throw e;
        }
    }
}

export default new ThermalPrintService();

