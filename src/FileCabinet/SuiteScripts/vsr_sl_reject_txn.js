/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Receives the rejection from vsr_cs_reject_popup.js, re-validates that the caller is the
 * Next Approver and the record is pending, saves the reason, then rejects the record
 * (via workflow trigger or by setting the approval status directly — see config).
 */
define(['N/record', 'N/runtime', 'N/workflow', 'N/log', './vsr_lib_reject_config'],
    (record, runtime, workflow, log, CONFIG) => {

        const respond = (response, code, payload) => {
            response.setHeader({ name: 'Content-Type', value: 'application/json' });
            if (code !== 200) log.audit({ title: 'VSR Reject - ' + code, details: payload });
            response.write(JSON.stringify(payload));
        };

        const toIdList = (value) => {
            if (value === null || value === undefined || value === '') return [];
            return (Array.isArray(value) ? value : [value]).map(String);
        };

        const onRequest = (context) => {
            const { request, response } = context;

            if (request.method !== 'POST') {
                return respond(response, 405, { success: false, message: 'Method not allowed.' });
            }

            let payload;
            try {
                payload = JSON.parse(request.body || '{}');
            } catch (e) {
                return respond(response, 400, { success: false, message: 'Invalid request body.' });
            }

            const recordType = String(payload.recordType || '').toLowerCase();
            const recordId = parseInt(payload.recordId, 10);
            const reason = String(payload.reason || '').trim();
            const cfg = CONFIG.RECORDS[recordType];

            if (!cfg) return respond(response, 400, { success: false, message: 'Unsupported record type.' });
            if (!recordId) return respond(response, 400, { success: false, message: 'Missing record id.' });
            if (!reason) return respond(response, 400, { success: false, message: 'Rejection reason is required.' });
            if (reason.length > CONFIG.MAX_REASON_LENGTH) {
                return respond(response, 400, { success: false, message: 'Rejection reason is too long.' });
            }

            try {
                // Server-side re-validation (never trust the client)
                const rec = record.load({ type: recordType, id: recordId });
                const userId = String(runtime.getCurrentUser().id);
                const approvers = toIdList(rec.getValue({ fieldId: cfg.nextApproverField }));

                if (!approvers.includes(userId)) {
                    return respond(response, 200, { success: false, message: 'You are not the next approver for this record.' });
                }
                if (cfg.statusField) {
                    const status = String(rec.getValue({ fieldId: cfg.statusField }) || '');
                    if (!cfg.pendingValues.includes(status)) {
                        return respond(response, 200, { success: false, message: 'This record is no longer pending approval.' });
                    }
                }

                // 1) Save the reason
                const values = {};
                values[CONFIG.REASON_FIELD] = reason;
                if (!cfg.workflowId && cfg.statusField) {
                    values[cfg.statusField] = cfg.rejectedStatusValue;
                }
                record.submitFields({
                    type: recordType,
                    id: recordId,
                    values: values,
                    options: { enableSourcing: false, ignoreMandatoryFields: true }
                });

                // 2) Let the approval workflow move to its Rejected state
                if (cfg.workflowId) {
                    const triggerOptions = {
                        recordType: recordType,
                        recordId: recordId,
                        workflowId: cfg.workflowId
                    };
                    if (cfg.workflowActionId) triggerOptions.actionId = cfg.workflowActionId;
                    workflow.trigger(triggerOptions);
                }

                log.audit({
                    title: 'VSR Reject - success',
                    details: { recordType, recordId, rejectedBy: userId }
                });
                return respond(response, 200, { success: true });

            } catch (e) {
                log.error({ title: 'VSR Reject - error', details: e });
                return respond(response, 200, {
                    success: false,
                    message: 'Could not reject the record: ' + (e.message || e.name || String(e))
                });
            }
        };

        return { onRequest };
    });