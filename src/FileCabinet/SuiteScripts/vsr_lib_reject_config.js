/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Shared configuration for the Reject button solution.
 * Used by: vsr_ue_reject_button.js, vsr_cs_reject_popup.js, vsr_sl_reject_txn.js
 *
 * Review per account:
 *  - nextApproverField / statusField: standard ids are used below. If your custom
 *    approval workflow tracks the approver in a custom field (e.g. custbody_xxx_next_approver),
 *    put that field id here.
 *  - workflowId: script id of the approval workflow (e.g. 'customworkflow_vsr_vb_approval').
 *    When set, the Suitelet triggers the workflow after saving the reason so the workflow
 *    can transition to its Rejected state. When blank, the Suitelet sets statusField to
 *    rejectedStatusValue directly.
 *  - workflowActionId: optional. Internal id of a workflow BUTTON action to fire
 *    (e.g. 'workflowaction123'). Leave blank to let the workflow evaluate its
 *    non-triggered transitions instead (recommended, see README).
 */
define([], () => {
    return {
        REASON_FIELD: 'custbody_vsr_km_rejection_reason',
        MAX_REASON_LENGTH: 3900,

        BUTTON: {
            id: 'custpage_vsr_reject',
            label: 'Reject'
        },

        SUITELET: {
            scriptId: 'customscript_vsr_sl_reject_txn',
            deploymentId: 'customdeploy_vsr_sl_reject_txn'
        },

        RECORDS: {
            vendorbill: {
                label: 'Vendor Bill',
                nextApproverField: 'nextapprover',
                statusField: 'approvalstatus',
                pendingValues: ['1'],        // 1 = Pending Approval
                rejectedStatusValue: '3',    // 3 = Rejected (used only when workflowId is blank)
                workflowId: '',
                workflowActionId: ''
            },
            expensereport: {
                label: 'Expense Report',
                nextApproverField: 'nextapprover',
                statusField: 'approvalstatus',
                pendingValues: ['1'],
                rejectedStatusValue: '3',
                workflowId: '',
                workflowActionId: ''
            }
        }
    };
});