import { ExcelStore } from './ExcelStore';
import { nanoid } from 'nanoid';
const balancesStore = new ExcelStore(process.env.BALANCES_XLSX || 'Balances.xlsx');
const requestsStore = new ExcelStore(process.env.REQUESTS_XLSX || 'Requests.xlsx');
const policyCacheStore = new ExcelStore(process.env.POLICY_CACHE_XLSX || 'Policy_Cache.xlsx');
const auditStore = new ExcelStore(process.env.AUDIT_XLSX || 'Audit.xlsx');
async function init() {
    // Balances.xlsx
    {
        const { workbook } = await balancesStore.read();
        balancesStore.writeRows(workbook, 'Balances', [
            { employeeid: '', employeelevel: '', ytd_spend: 0, ytd_limit: 0, available_balance: 0, last_update: '', carryover_policy_flag: 'reset' }
        ]);
        balancesStore.writeRows(workbook, 'Transactions', [
            { tx_id: nanoid(), employeeid: '', amount: 0, item_category: '', status: 'Init', approved_by: '', approved_at: '', requested_at: '', notes: '' }
        ]);
        await balancesStore.write(workbook);
    }
    // Requests.xlsx
    {
        const { workbook } = await requestsStore.read();
        balancesStore.sheet(workbook, 'Requests');
        const now = new Date().toISOString();
        balancesStore.writeRows(workbook, 'Requests', [
            { request_id: nanoid(), employeeid: '', emailid: '', item_category: '', amount: 0, justification: '', status: 'Pending', approver_email: '', sla_due: now, created_at: now, updated_at: now }
        ]);
        balancesStore.writeRows(workbook, 'SLA', [
            { status: 'Pending', sla_hours: 48, level_priority: 1 },
            { status: 'NeedsInfo', sla_hours: 72, level_priority: 2 },
            { status: 'Approved', sla_hours: 0, level_priority: 0 },
            { status: 'Rejected', sla_hours: 0, level_priority: 0 }
        ]);
        await requestsStore.write(workbook);
    }
    // Policy_Cache.xlsx
    {
        const { workbook } = await policyCacheStore.read();
        policyCacheStore.writeRows(workbook, 'Policy', [
            { level: 'L1', purchase_limit: 0, approved_items_list: '', version: 'v0', parsed_at: new Date().toISOString() }
        ]);
        await policyCacheStore.write(workbook);
    }
    // Audit.xlsx
    {
        const { workbook } = await auditStore.read();
        auditStore.writeRows(workbook, 'Audit', [
            { event_id: nanoid(), actor: '', action: 'Init', entity_type: '', entity_id: '', before_hash: '', after_hash: '', timestamp: new Date().toISOString(), ip: '', chain_hash: '' }
        ]);
        await auditStore.write(workbook);
    }
    console.log('Initialized Excel workbooks.');
}
async function seed() {
    // No-op seed; examples will be added by tests or manual steps.
    console.log('Seed complete.');
}
const cmd = process.argv[2];
if (cmd === 'init')
    init();
else if (cmd === 'seed')
    seed();
else
    console.log('Usage: migrations.ts [init|seed]');
