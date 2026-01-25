/**
 * Test script to verify transaction schema migration and CRUD operations.
 * Run with: npx tsx scripts/test-transactions.ts
 */
import { createWorkspace, getWorkspaceDb } from '../src/lib/server/workspace';
import { removeWorkspace } from '../src/lib/server/workspace/registry';
import {
	transactions,
	tags,
	transactionTags,
	transactionHistory
} from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
	dollarsToCents,
	centsToDollars,
	formatCurrency,
	parseCurrencyToCents
} from '../src/lib/utils/currency';

const DATA_DIR = process.env.DATA_DIR ?? './data';
const TEST_WORKSPACE_ID = 'test-transactions-' + Date.now();

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, details?: string) {
	if (condition) {
		console.log(`  PASS: ${name}`);
		passed++;
	} else {
		console.log(`  FAIL: ${name}${details ? ' - ' + details : ''}`);
		failed++;
	}
}

console.log('Testing transaction schema and CRUD operations...\n');

try {
	// Setup: Create test workspace
	console.log('Setup: Creating test workspace:', TEST_WORKSPACE_ID);
	createWorkspace(TEST_WORKSPACE_ID, 'Transaction Test Workspace', 'sole_prop');
	const db = getWorkspaceDb(TEST_WORKSPACE_ID);
	console.log('');

	// Test 1: Verify tables were created
	console.log('1. Testing table creation...');
	const tableNames = ['transactions', 'tags', 'transaction_tags', 'transaction_history'];
	for (const tableName of tableNames) {
		// Use raw SQLite to check table existence
		const tableResult = db.$client
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
			.get(tableName) as { name: string } | undefined;
		test(`${tableName} table exists`, tableResult?.name === tableName);
	}
	console.log('');

	// Test 2: Create a tag
	console.log('2. Testing tag creation...');
	const tagResult = db.insert(tags).values({ name: 'Business Supplies' }).returning().get();
	test('Tag created', !!tagResult);
	test('Tag has ID', typeof tagResult?.id === 'number');
	test('Tag name matches', tagResult?.name === 'Business Supplies');
	test('Tag has createdAt', !!tagResult?.createdAt);
	console.log('');

	// Test 3: Create an income transaction with cents amount
	console.log('3. Testing transaction creation with cents...');
	const publicId = crypto.randomUUID();
	const amountInDollars = 150.75;
	const amountInCents = dollarsToCents(amountInDollars);

	const txnResult = db
		.insert(transactions)
		.values({
			publicId,
			type: 'income',
			amountCents: amountInCents,
			date: '2026-01-25',
			payee: 'Test Client',
			description: 'Invoice payment',
			paymentMethod: 'check',
			checkNumber: '1234'
		})
		.returning()
		.get();

	test('Transaction created', !!txnResult);
	test('Amount stored as cents', txnResult?.amountCents === 15075);
	test('Public ID matches', txnResult?.publicId === publicId);
	test('Type is income', txnResult?.type === 'income');
	test('Date stored correctly', txnResult?.date === '2026-01-25');
	test('Payee stored correctly', txnResult?.payee === 'Test Client');
	test('Payment method stored', txnResult?.paymentMethod === 'check');
	test('Check number stored', txnResult?.checkNumber === '1234');
	test('voidedAt defaults to null', txnResult?.voidedAt === null);
	test('deletedAt defaults to null', txnResult?.deletedAt === null);
	test('createdAt is set', !!txnResult?.createdAt);
	test('updatedAt is set', !!txnResult?.updatedAt);
	console.log('');

	// Test 4: Create transactionTag linking them with 100% allocation
	console.log('4. Testing transaction-tag linking...');
	const tagLinkResult = db
		.insert(transactionTags)
		.values({
			transactionId: txnResult!.id,
			tagId: tagResult!.id,
			percentage: 100
		})
		.returning()
		.get();

	test('TransactionTag created', !!tagLinkResult);
	test('Percentage stored correctly', tagLinkResult?.percentage === 100);
	test('TransactionId matches', tagLinkResult?.transactionId === txnResult?.id);
	test('TagId matches', tagLinkResult?.tagId === tagResult?.id);
	console.log('');

	// Test 5: Create a history entry for the 'created' action
	console.log('5. Testing history entry creation...');
	const historyResult = db
		.insert(transactionHistory)
		.values({
			transactionId: txnResult!.id,
			action: 'created',
			previousState: null,
			changedFields: null
		})
		.returning()
		.get();

	test('History entry created', !!historyResult);
	test('Action is created', historyResult?.action === 'created');
	test('TransactionId matches', historyResult?.transactionId === txnResult?.id);
	test('Timestamp is set', !!historyResult?.timestamp);
	console.log('');

	// Test 6: Query transactions with relations (using manual joins since relational queries depend on schema)
	console.log('6. Testing relational queries...');
	// Use a simpler join query to verify relationships work
	const txnTagsJoin = db
		.select({
			txnId: transactions.id,
			txnType: transactions.type,
			tagName: tags.name,
			percentage: transactionTags.percentage
		})
		.from(transactions)
		.innerJoin(transactionTags, eq(transactionTags.transactionId, transactions.id))
		.innerJoin(tags, eq(tags.id, transactionTags.tagId))
		.where(eq(transactions.id, txnResult!.id))
		.all();

	test('Transaction found with join', txnTagsJoin.length > 0);
	test('Tag name accessible via join', txnTagsJoin[0]?.tagName === 'Business Supplies');
	test('Percentage accessible via join', txnTagsJoin[0]?.percentage === 100);

	// Also verify we can get tag allocations for a transaction
	const allocations = db
		.select()
		.from(transactionTags)
		.where(eq(transactionTags.transactionId, txnResult!.id))
		.all();
	test('Tag allocations queryable', allocations.length === 1);
	console.log('');

	// Test 7: Test currency utility functions
	console.log('7. Testing currency utility functions...');
	test('dollarsToCents(1.50) = 150', dollarsToCents(1.5) === 150);
	test('dollarsToCents(0) = 0', dollarsToCents(0) === 0);
	test('dollarsToCents(-5.25) = -525', dollarsToCents(-5.25) === -525);
	test('dollarsToCents handles precision (1.10)', dollarsToCents(1.1) === 110);
	test('dollarsToCents handles precision (2.20)', dollarsToCents(2.2) === 220);
	test('centsToDollars(150) = 1.5', centsToDollars(150) === 1.5);
	test('centsToDollars(0) = 0', centsToDollars(0) === 0);
	test('formatCurrency(15075) = "$150.75"', formatCurrency(15075) === '$150.75');
	test('formatCurrency(0) = "$0.00"', formatCurrency(0) === '$0.00');
	test('formatCurrency(100) = "$1.00"', formatCurrency(100) === '$1.00');
	test('parseCurrencyToCents("1.50") = 150', parseCurrencyToCents('1.50') === 150);
	test('parseCurrencyToCents("$1.50") = 150', parseCurrencyToCents('$1.50') === 150);
	test('parseCurrencyToCents("1") = 100', parseCurrencyToCents('1') === 100);
	test('parseCurrencyToCents("") = 0', parseCurrencyToCents('') === 0);
	console.log('');

	// Test 8: Test expense transaction
	console.log('8. Testing expense transaction type...');
	const expenseResult = db
		.insert(transactions)
		.values({
			publicId: crypto.randomUUID(),
			type: 'expense',
			amountCents: dollarsToCents(42.99),
			date: '2026-01-24',
			payee: 'Office Store',
			paymentMethod: 'card'
		})
		.returning()
		.get();

	test('Expense created', !!expenseResult);
	test('Type is expense', expenseResult?.type === 'expense');
	test('Amount is 4299 cents', expenseResult?.amountCents === 4299);
	console.log('');

	// Test 9: Test foreign key cascade on transaction delete
	console.log('9. Testing foreign key cascades...');
	// First verify tag allocations exist
	const tagsBefore = db
		.select()
		.from(transactionTags)
		.where(eq(transactionTags.transactionId, txnResult!.id))
		.all();
	test('Tag allocations exist before delete', tagsBefore.length === 1);

	// Delete the transaction (should cascade to transactionTags and history)
	db.delete(transactions).where(eq(transactions.id, txnResult!.id)).run();

	const tagsAfter = db
		.select()
		.from(transactionTags)
		.where(eq(transactionTags.transactionId, txnResult!.id))
		.all();
	test('Tag allocations cascaded on delete', tagsAfter.length === 0);

	const historyAfter = db
		.select()
		.from(transactionHistory)
		.where(eq(transactionHistory.transactionId, txnResult!.id))
		.all();
	test('History entries cascaded on delete', historyAfter.length === 0);
	console.log('');

	// Cleanup
	console.log('Cleanup: Removing test workspace...');
	removeWorkspace(TEST_WORKSPACE_ID);
	const dbPath = join(DATA_DIR, 'workspaces', `${TEST_WORKSPACE_ID}.db`);
	try {
		unlinkSync(dbPath);
		const walPath = dbPath + '-wal';
		const shmPath = dbPath + '-shm';
		if (existsSync(walPath)) unlinkSync(walPath);
		if (existsSync(shmPath)) unlinkSync(shmPath);
		console.log('Cleanup: PASS');
	} catch (e) {
		console.log('Cleanup: FAIL -', e);
	}

	// Summary
	console.log('\n========================================');
	console.log(`Results: ${passed} passed, ${failed} failed`);
	console.log('========================================');

	if (failed > 0) {
		process.exit(1);
	} else {
		console.log('\nAll tests completed successfully!');
		process.exit(0);
	}
} catch (error) {
	console.error('\nFATAL ERROR:', error);
	// Attempt cleanup
	try {
		removeWorkspace(TEST_WORKSPACE_ID);
		const dbPath = join(DATA_DIR, 'workspaces', `${TEST_WORKSPACE_ID}.db`);
		if (existsSync(dbPath)) unlinkSync(dbPath);
	} catch {
		/* ignore cleanup errors */
	}
	process.exit(1);
}
