
import { PolicyService } from '../packages/core/src/security/PolicyService.js';
import { AuditService } from '../packages/core/src/security/AuditService.js';
import path from 'path';

async function testSecurity() {
    console.log("🔒 Starting Security Verification...");

    // 1. Setup Services
    const policy = new PolicyService(process.cwd());
    const audit = new AuditService(path.join(process.cwd(), '.hypercode_test_audit'));

    // 2. Test Default Policy (Allow)
    console.log("\n1. Testing Default Policy (Allow)");
    const check1 = policy.check('read_file', { path: 'test.txt' });
    if (check1.allowed) console.log("✅ Default Allow: PASSED");
    else console.error("❌ Default Allow: FAILED", check1);

    // 3. Test Global Block
    console.log("\n2. Testing Global Block (format_disk)");
    const check2 = policy.check('format_disk', {});
    if (!check2.allowed) console.log("✅ Global Block: PASSED");
    else console.error("❌ Global Block: FAILED", check2);

    // 4. Test Audit Logging
    console.log("\n3. Testing Audit Logging");
    audit.log('TEST_ACTION', { foo: 'bar' }, 'INFO');
    await audit.flush();

    const logs = await audit.queryLogs(10);
    const found = logs.find(l => l.action === 'TEST_ACTION');

    if (found) {
        console.log("✅ Audit Log: PASSED");
        console.log("   Entry:", JSON.stringify(found));
    } else {
        console.error("❌ Audit Log: FAILED - Entry not found");
    }

    console.log("\n🏁 Verification Complete.");
}

testSecurity().catch(console.error);
