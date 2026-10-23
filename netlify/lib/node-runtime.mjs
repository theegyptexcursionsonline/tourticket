// Read the serving process on every invocation; build settings cannot attest it.
export function logNodeRuntime(functionName) {
  console.log('[node-runtime] ' + JSON.stringify({ function: functionName, node: process.version }));
}
