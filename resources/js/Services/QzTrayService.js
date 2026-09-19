import qz from 'qz-tray';

class QzTrayService {
    constructor() {
        this.securityConfigured = false;
        this.connectionPromise = null;
    }

    /**
     * Set up QZ Tray Digital Certificate and RSA Signature handshake
     */
    configureSecurity() {
        if (this.securityConfigured) return;

        qz.security.setCertificatePromise((resolve, reject) => {
            fetch('/api/receipts/qz-certificate')
                .then(res => {
                    if (!res.ok) throw new Error(`Certificate fetch failed with status ${res.status}`);
                    return res.text();
                })
                .then(resolve)
                .catch(err => {
                    console.warn('[QZ Security] Certificate load error:', err);
                    reject(err);
                });
        });

        qz.security.setSignatureAlgorithm("SHA512");

        qz.security.setSignaturePromise((toSign) => {
            return (resolve, reject) => {
                fetch('/api/receipts/qz-sign', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/plain',
                    },
                    body: JSON.stringify({ request: toSign }),
                })
                .then(res => {
                    if (!res.ok) throw new Error(`Signing request failed with status ${res.status}`);
                    return res.text();
                })
                .then(resolve)
                .catch(err => {
                    console.warn('[QZ Security] Sign error:', err);
                    reject(err);
                });
            };
        });

        this.securityConfigured = true;
    }

    /**
     * Check if WebSocket connection to QZ Tray is active
     */
    isConnected() {
        try {
            return qz.websocket.isActive();
        } catch (e) {
            return false;
        }
    }

    /**
     * Connect to local QZ Tray instance (localhost:8182 or 8181)
     */
    async connect(retries = 1, delay = 1000) {
        this.configureSecurity();

        if (this.isConnected()) {
            return { success: true, connected: true, version: await this.getVersion() };
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            try {
                await qz.websocket.connect({
                    retries,
                    delay,
                    keepAlive: 60,
                });

                const version = await this.getVersion();
                return { success: true, connected: true, version };
            } catch (err) {
                console.warn('[QZ Tray] Connection failed:', err);
                return {
                    success: false,
                    connected: false,
                    error: err.message || 'Could not connect to QZ Tray daemon on localhost:8182'
                };
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    /**
     * Disconnect cleanly from QZ Tray
     */
    async disconnect() {
        if (this.isConnected()) {
            try {
                await qz.websocket.disconnect();
            } catch (e) {
                console.warn('[QZ Tray] Disconnect error:', e);
            }
        }
    }

    /**
     * Get QZ Tray software version
     */
    async getVersion() {
        try {
            return await qz.api.getVersion();
        } catch (e) {
            return 'Unknown';
        }
    }

    /**
     * Fetch all installed Windows / system printers
     */
    async getPrinters() {
        const conn = await this.connect();
        if (!conn.success) {
            throw new Error(conn.error || 'QZ Tray is not running');
        }

        return await qz.printers.find();
    }

    /**
     * Find a specific printer or default matching printer
     */
    async findPrinter(printerName = null) {
        const conn = await this.connect();
        if (!conn.success) {
            throw new Error(conn.error || 'QZ Tray is not running');
        }

        if (printerName) {
            return await qz.printers.find(printerName);
        }

        return await qz.printers.getDefault();
    }

    /**
     * Send raw base64 ESC/POS command stream directly to printer
     */
    async printRaw(printerName, base64Payload) {
        if (!base64Payload) {
            throw new Error('No ESC/POS print payload provided.');
        }

        const conn = await this.connect();
        if (!conn.success) {
            throw new Error(conn.error || 'QZ Tray is not running on this PC. Please start QZ Tray and retry.');
        }

        // Validate printer
        let targetPrinter = printerName;
        if (!targetPrinter) {
            targetPrinter = await qz.printers.getDefault();
        }

        // Configure raw binary print job
        // altPrinting: true sends raw bytes directly to the print spooler without driver interception
        const config = qz.configs.create(targetPrinter, {
            altPrinting: true,
            encoding: 'ISO-8859-1',
        });

        const printData = [
            {
                type: 'raw',
                format: 'command',
                flavor: 'base64',
                data: base64Payload
            }
        ];

        return await qz.print(config, printData);
    }
}

export default new QzTrayService();
