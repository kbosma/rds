import { Authority } from '../../shared/models';

/**
 * Alle authorities die {@code name} direct of indirect nodig heeft (zonder de authority zelf). Dezelfde regel als de
 * backend (AuthorizationRules#requiredClosure); hier alleen om het concept in de matrix meteen goed te tonen.
 */
export function requiredClosure(name: string, byName: ReadonlyMap<string, Authority>): Set<string> {
  const closure = new Set<string>();
  const todo = [...(byName.get(name)?.requires ?? [])];
  while (todo.length > 0) {
    const next = todo.pop()!;
    if (next !== name && !closure.has(next)) {
      closure.add(next);
      todo.push(...(byName.get(next)?.requires ?? []));
    }
  }
  return closure;
}

/** Per authority de aangevinkte authorities die hem nodig hebben (die kun je dus niet los weghalen). */
export function neededBy(assigned: ReadonlySet<string>, byName: ReadonlyMap<string, Authority>): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const name of [...assigned].sort()) {
    for (const required of requiredClosure(name, byName)) {
      result.set(required, [...(result.get(required) ?? []), name]);
    }
  }
  return result;
}
