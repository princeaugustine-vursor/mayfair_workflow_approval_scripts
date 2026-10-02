/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Adds a "Reject" button on Vendor Bill / Expense Report in VIEW mode,
 * visible only to the current Next Approver while the record is pending approval.
 * Deploy to: Vendor Bill, Expense Report.
 */
define(['N/runtime', 'N/log', './vsr_lib_reject_config'], (runtime, log, CONFIG) => {

    const toIdList = (value) => {
        if (value === null || value === undefined || value === '') return [];
        return (Array.isArray(value) ? value : [value]).map(String);
    };

    const beforeLoad = (context) => {
        try {
            if (context.type !== context.UserEventType.VIEW) return;
            if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return;

            const rec = context.newRecord;
            const cfg = CONFIG.RECORDS[rec.type];
            if (!cfg) return;

            // Only while pending approval
            if (cfg.statusField) {
                const status = String(rec.getValue({ fieldId: cfg.statusField }) || '');
                if (!cfg.pendingValues.includes(status)) return;
            }

            // Only for the Next Approver
            const approvers = toIdList(rec.getValue({ fieldId: cfg.nextApproverField }));
            const userId = String(runtime.getCurrentUser().id);
            if (!approvers.includes(userId)) return;

            context.form.clientScriptModulePath = './vsr_cs_reject_popup.js';
            context.form.addButton({
                id: CONFIG.BUTTON.id,
                label: CONFIG.BUTTON.label,
                functionName: 'vsrOpenRejectDialog'
            });
        } catch (e) {
            log.error({ title: 'VSR Reject Button - beforeLoad', details: e });
        }
    };

    return { beforeLoad };
});