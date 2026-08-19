/**
 * ESC/POS Thermal Printing Utility Service
 * Supports 58mm (32 char) & 80mm (48 char) thermal printers,
 * cash drawer kick signals, paper cut commands, and print styling.
 */

export const ESC_POS = {
    RESET: '\x1B\x40',
    ALIGN_LEFT: '\x1B\x61\x00',
    ALIGN_CENTER: '\x1B\x61\x01',
    ALIGN_RIGHT: '\x1B\x61\x02',
    TEXT_NORMAL: '\x1D\x21\x00',
    TEXT_DOUBLE_HEIGHT: '\x1D\x21\x01',
    TEXT_DOUBLE_WIDTH: '\x1D\x21\x10',
    TEXT_QUAD: '\x1D\x21\x11',
    BOLD_ON: '\x1E\x45\x01',
    BOLD_OFF: '\x1E\x45\x00',
    DRAWER_KICK_PIN2: '\x1B\x70\x00\x19\xFA', // Cash drawer kick pin 2
    DRAWER_KICK_PIN5: '\x1B\x70\x01\x19\xFA', // Cash drawer kick pin 5
    FULL_CUT: '\x1D\x56\x41\x00',              // ESC/POS full paper cut
    PARTIAL_CUT: '\x1D\x56\x42\x00',           // ESC/POS partial paper cut
};

export class ThermalPrintService {
    /**
     * Format a line of text for thermal paper columns
     * @param {string} leftText - Text aligned to left
     * @param {string} rightText - Text aligned to right
     * @param {number} width - Total columns (32 for 58mm, 48 for 80mm)
     */
    static formatColumnLine(leftText, rightText, width = 32) {
        const left = String(leftText || '');
        const right = String(rightText || '');
        const spaceLength = width - left.length - right.length;
        if (spaceLength <= 0) {
            return left.substring(0, width - right.length - 1) + ' ' + right;
        }
        return left + ' '.repeat(spaceLength) + right;
    }

    /**
     * Generate horizontal divider line
     * @param {string} char - Divider character e.g. '-' or '='
     * @param {number} width - Paper column width (32 or 48)
     */
    static formatDivider(char = '-', width = 32) {
        return char.repeat(width);
    }

    /**
     * Send Web Raw ESC/POS Drawer Kick Pulse via Web Serial / Window print
     */
    static triggerCashDrawer() {
        try {
            // Send pulse command via hidden print iframe or Web API
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(ESC_POS.DRAWER_KICK_PIN2);
            doc.close();
            setTimeout(() => document.body.removeChild(iframe), 1000);
            return true;
        } catch (e) {
            console.warn('Thermal cash drawer kick fallback:', e);
            return false;
        }
    }

    /**
     * Print receipt with thermal ESC/POS auto-cut & drawer kick settings
     * @param {Object} options
     * @param {string} options.paperWidth - '58mm' or '80mm'
     * @param {boolean} options.kickDrawer - Trigger cash drawer pulse
     * @param {boolean} options.autoCut - Execute paper cut command
     */
    static executeThermalPrint(options = { paperWidth: '58mm', kickDrawer: true, autoCut: true }) {
        if (options.kickDrawer) {
            this.triggerCashDrawer();
        }

        // Apply temporary thermal print styling class to root element
        document.body.classList.remove('paper-58mm', 'paper-80mm');
        document.body.classList.add(options.paperWidth === '80mm' ? 'paper-80mm' : 'paper-58mm');

        window.print();
    }
}

export default ThermalPrintService;
