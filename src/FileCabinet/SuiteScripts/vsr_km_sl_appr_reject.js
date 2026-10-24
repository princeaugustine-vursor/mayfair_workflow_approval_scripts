/**
 * VSR | Email Approval - Approve / Reject Suitelet
 *
 * Deployment: Available Without Login = T, Execute As Role = role with Edit on Bills and
 * Expense Reports, Status = Released.
 *
 * GET  -> small confirmation page (nothing is saved; email link scanners stop here)
 * POST -> sets custbody_vsr_ea_decision (+ rejection reason), clears the token, saves.
 *         The workflow transitions on custbody_vsr_ea_decision.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/log'], (record, log) => {

    const TYPES = { vendorbill: 'Vendor Bill', expensereport: 'Expense Report' };
    const PENDING = '1';                                  // approvalstatus: Pending Approval
    const DECISION = { A: '1', R: '2' };                  // customlist_vsr_ea_decision: Approved, Rejected
    const REJECT_REASON = 'custbody_vsr_rejection_reason'; // your existing rejection reason field

    const esc = (s) => String(s || '').replace(/[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const page = (title, body) =>
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>${esc(title)}</title></head><body style="font-family:Arial,sans-serif;max-width:560px;margin:40px auto;padding:0 16px">` +
        `<h2>${esc(title)}</h2>${body}</body></html>`;

    const INVALID = page('Link not valid',
        '<p>This link has already been used, or the document is no longer waiting for your approval.</p>');

    const confirmForm = (approve, label, num, error) => page(`${approve ? 'Approve' : 'Reject'} ${label} ${num}`,
        (error ? `<p style="color:#c62828"><b>${esc(error)}</b></p>` : '') +
        `<form method="POST">` +
        (approve ? '' : `<p><label>Reason for rejection<br><textarea name="reason" rows="4" style="width:100%" required></textarea></label></p>`) +
        `<button type="submit" style="padding:10px 24px;border:0;border-radius:4px;color:#fff;font-weight:bold;` +
        `background:${approve ? '#2e7d32' : '#c62828'}">${approve ? 'Confirm approval' : 'Confirm rejection'}</button>` +
        `</form>`);

    const onRequest = (ctx) => {
        const p = ctx.request.parameters;
        const res = ctx.response;
        try {
            if (!TYPES[p.rt] || !/^\d+$/.test(p.id || '') || !/^[a-f0-9]{64}$/.test(p.t || '') || !DECISION[p.a]) {
                res.write(INVALID);
                return;
            }

            const rec = record.load({ type: p.rt, id: p.id });
            const stored = rec.getValue({ fieldId: 'custbody_vsr_ea_token' });
            if (!stored || stored !== p.t || String(rec.getValue({ fieldId: 'approvalstatus' })) !== PENDING) {
                res.write(INVALID);
                return;
            }

            const approve = p.a === 'A';
            const label = TYPES[p.rt];
            const num = rec.getValue({ fieldId: 'tranid' }) || p.id;

            if (ctx.request.method !== 'POST') {
                res.write(confirmForm(approve, label, num));
                return;
            }

            const reason = String(p.reason || '').trim();
            if (!approve && !reason) {
                res.write(confirmForm(approve, label, num, 'Please enter a reason for the rejection.'));
                return;
            }

            rec.setValue({ fieldId: 'custbody_vsr_ea_decision', value: DECISION[p.a] });
            if (!approve) rec.setValue({ fieldId: REJECT_REASON, value: reason });
            rec.setValue({ fieldId: 'custbody_vsr_ea_token', value: '' });   // link works only once
            rec.save({ ignoreMandatoryFields: true });

            res.write(page(approve ? 'Approved' : 'Rejected',
                `<p>${esc(label)} ${esc(num)} has been ${approve ? 'approved' : 'rejected'}. You can close this window.</p>`));
        } catch (e) {
            log.error({ title: 'VSR email approval error', details: `${e.name}: ${e.message}` });
            res.write(page('Something went wrong', '<p>Please try again later or contact the accounts payable team.</p>'));
        }
    };

    return { onRequest };
});