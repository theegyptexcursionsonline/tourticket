export function configuredRevenuePilotMachineKeys(env: NodeJS.ProcessEnv = process.env): Map<string, string> {
  const raw = env.REVENUEPILOT_HMAC_KEYS || '';
  const entries: Array<[string, string]> = raw.split(',').map((entry) => entry.trim()).filter(Boolean).flatMap((entry) => {
    const separator = entry.indexOf(':');
    if (separator <= 0) return [];
    const pair: [string, string] = [entry.slice(0, separator), entry.slice(separator + 1)];
    return pair[1].length >= 32 ? [pair] : [];
  });
  return new Map(entries);
}

export function revenuePilotMachineScopes(keyId: string, env: NodeJS.ProcessEnv = process.env) {
  const raw = env.REVENUEPILOT_HMAC_SCOPES || '';
  const entry = raw.split(',').map((value) => value.trim()).find((value) => value.startsWith(`${keyId}=`));
  return new Set((entry?.slice(keyId.length + 1) || '').split('|').map((value) => value.trim()).filter(Boolean));
}

export function revenuePilotMachineConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const configuredKeys = configuredRevenuePilotMachineKeys(env);
  const configuredScopes = [...configuredKeys.keys()].map((keyId) => revenuePilotMachineScopes(keyId, env));
  return {
    hmacKeysConfigured: configuredKeys.size > 0,
    dualHmacKeysConfigured: configuredKeys.size >= 2,
    readScopeConfigured: configuredScopes.some((entry) => entry.has('read')),
    writeScopeConfigured: configuredScopes.some((entry) => entry.has('write')),
  };
}
