const { CLI, DefaultInvoker } = require('./dist/cli');
const { createOpenCodeInvoker } = require('./dist/opencode-invoker');

(async () => {
  console.log('=== Test 1: createOpenCodeInvoker() ===');
  const invoker1 = createOpenCodeInvoker();
  console.log('Invoker type:', invoker1.constructor.name);

  console.log('\n=== Test 2: CLI with DefaultInvoker ===');
  const cli = new CLI();
  await cli.scan();
  const result = await cli.runCombo('frontend-dev', new DefaultInvoker());
  console.log('Result:', JSON.stringify(result, null, 2));

  console.log('\n=== Test 3: CLI with createOpenCodeInvoker ===');
  const invoker2 = createOpenCodeInvoker();
  const result2 = await cli.runCombo('frontend-dev', invoker2);
  console.log('Result:', JSON.stringify(result2, null, 2));
})();
