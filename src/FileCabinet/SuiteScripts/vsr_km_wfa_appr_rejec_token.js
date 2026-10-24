/**
 * VSR | Email Approval - build Approve / Reject links
 *
 * Workflow Action. Add on ENTRY to "Pending L1 Approval", BEFORE the Send Email action.
 * Puts a one-time token on the record and the two Suitelet URLs in body fields, so the
 * workflow's Send Email body can use them in its Approve / Reject buttons.
 *
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/crypto/random', 'N/url'], (random, url) => {

    const onAction = (ctx) => {
        const rec = ctx.newRecord;
        const token = (random.generateUUID() + random.generateUUID()).replace(/-/g, '').toLowerCase();

        const link = (action) => url.resolveScript({
            scriptId: 'customscript_vsr_ea_sl_approve',
            deploymentId: 'customdeploy_vsr_ea_sl_approve',
            returnExternalUrl: true,
            params: { rt: rec.type, id: rec.id, t: token, a: action }
        });

        rec.setValue({ fieldId: 'custbody_vsr_ea_token', value: token });
        rec.setValue({ fieldId: 'custbody_vsr_ea_approve_url', value: link('A') });
        rec.setValue({ fieldId: 'custbody_vsr_ea_reject_url', value: link('R') });
        rec.setValue({ fieldId: 'custbody_vsr_ea_decision', value: '' });
        return 'OK';
    };

    return { onAction };
});