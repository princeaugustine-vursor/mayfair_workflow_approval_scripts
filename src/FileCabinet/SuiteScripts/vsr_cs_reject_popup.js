/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Attached by vsr_ue_reject_button.js via form.clientScriptModulePath.
 * Opens an in-page modal to capture the rejection reason and posts it to the Suitelet.
 */
define(['N/currentRecord', 'N/url', 'N/https', 'N/ui/dialog', './vsr_lib_reject_config'],
    (currentRecord, url, https, dialog, CONFIG) => {

        const MODAL_ID = 'vsr-reject-modal';

        function pageInit() {
            // Required entry point; no action on load.
        }

        function el(tag, styles, text) {
            const node = document.createElement(tag);
            if (styles) node.style.cssText = styles;
            if (text) node.textContent = text;
            return node;
        }

        function closeModal() {
            const modal = document.getElementById(MODAL_ID);
            if (modal) modal.parentNode.removeChild(modal);
        }

        function vsrOpenRejectDialog() {
            if (document.getElementById(MODAL_ID)) return;

            const rec = currentRecord.get();
            const cfg = CONFIG.RECORDS[rec.type] || { label: 'Transaction' };

            const overlay = el('div',
                'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100000;' +
                'display:flex;align-items:center;justify-content:center;');
            overlay.id = MODAL_ID;

            const box = el('div',
                'background:#fff;width:520px;max-width:92vw;border-radius:6px;' +
                'box-shadow:0 8px 30px rgba(0,0,0,.3);font-family:Arial,Helvetica,sans-serif;');

            const header = el('div',
                'padding:14px 18px;border-bottom:1px solid #ddd;font-size:15px;font-weight:bold;',
                'Reject ' + cfg.label);

            const body = el('div', 'padding:16px 18px;');
            const lbl = el('label', 'display:block;font-size:12px;margin-bottom:6px;color:#333;',
                'Rejection Reason *');
            const textarea = el('textarea',
                'width:100%;box-sizing:border-box;height:130px;padding:8px;font-size:13px;' +
                'border:1px solid #bbb;border-radius:4px;resize:vertical;');
            textarea.maxLength = CONFIG.MAX_REASON_LENGTH;
            const counter = el('div', 'font-size:11px;color:#777;text-align:right;margin-top:4px;',
                '0 / ' + CONFIG.MAX_REASON_LENGTH);
            const errorMsg = el('div', 'font-size:12px;color:#c00;margin-top:6px;display:none;');

            textarea.addEventListener('input', () => {
                counter.textContent = textarea.value.length + ' / ' + CONFIG.MAX_REASON_LENGTH;
                errorMsg.style.display = 'none';
            });

            body.append(lbl, textarea, counter, errorMsg);

            const footer = el('div',
                'padding:12px 18px;border-top:1px solid #ddd;text-align:right;');
            const btnStyle = 'padding:6px 16px;margin-left:8px;font-size:13px;border-radius:4px;cursor:pointer;';
            const cancelBtn = el('button', btnStyle + 'background:#f2f2f2;border:1px solid #bbb;', 'Cancel');
            const submitBtn = el('button', btnStyle + 'background:#c0392b;color:#fff;border:1px solid #a93226;', 'Submit Rejection');
            cancelBtn.type = 'button';
            submitBtn.type = 'button';
            footer.append(cancelBtn, submitBtn);

            box.append(header, body, footer);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            textarea.focus();

            cancelBtn.addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

            submitBtn.addEventListener('click', () => {
                const reason = textarea.value.trim();
                if (!reason) {
                    errorMsg.textContent = 'Please enter a rejection reason.';
                    errorMsg.style.display = 'block';
                    return;
                }

                submitBtn.disabled = true;
                cancelBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';

                const slUrl = url.resolveScript({
                    scriptId: CONFIG.SUITELET.scriptId,
                    deploymentId: CONFIG.SUITELET.deploymentId,
                    returnExternalUrl: false
                });

                https.post.promise({
                    url: slUrl,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recordType: rec.type, recordId: rec.id, reason: reason })
                }).then((response) => {
                    let result = {};
                    try { result = JSON.parse(response.body); } catch (e) { /* non-JSON response */ }

                    if (response.code === 200 && result.success) {
                        closeModal();
                        window.location.reload();
                    } else {
                        throw new Error(result.message || ('Unexpected response (HTTP ' + response.code + ').'));
                    }
                }).catch((err) => {
                    submitBtn.disabled = false;
                    cancelBtn.disabled = false;
                    submitBtn.textContent = 'Submit Rejection';
                    dialog.alert({
                        title: 'Rejection Failed',
                        message: (err && err.message) ? err.message : String(err)
                    });
                });
            });
        }

        return {
            pageInit,
            vsrOpenRejectDialog
        };
    });