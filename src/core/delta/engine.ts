import type { DeltaEngine, DeltaType } from "./contracts";
type Fact = { subject: string; predicate: string; value: unknown };
type Delta = { type: DeltaType; subject: string; explanation: string; previousValue?: unknown; newValue?: unknown };
const key = (fact: Fact) => `${fact.subject.trim().toLowerCase()}::${fact.predicate.trim().toLowerCase()}`;
const valueKey = (value: unknown) => JSON.stringify(value, Object.keys((value && typeof value === "object") ? value as object : {}).sort());

export class SimpleDeltaEngine implements DeltaEngine {
  async detect(input: { channelId: string; facts: unknown[] }): Promise<Delta[]> {
    const facts = input.facts as Fact[];
    const previous = new Map<string, Fact>();
    const current = new Map<string, Fact>();
    for (const item of facts) {
      const target = (item as Fact & { existing?: boolean }).existing ? previous : current;
      target.set(key(item), item);
    }
    const result: Delta[] = [];
    const matchedPrevious = new Set<string>();
    for (const [factKey, item] of current) {
      const old = previous.get(factKey);
      if (old) {
        matchedPrevious.add(factKey);
        if (item.predicate.trim().toLowerCase() === "contradicts") result.push({ type: "CONTRADICTED", subject: item.subject, explanation: "New fact explicitly contradicts existing knowledge.", previousValue: old.value, newValue: item.value });
        else if (valueKey(old.value) === valueKey(item.value)) result.push({ type: "REPEATED", subject: item.subject, explanation: "Fact repeats existing channel knowledge.", previousValue: old.value, newValue: item.value });
        else result.push({ type: "CHANGED", subject: item.subject, explanation: "Fact value changed.", previousValue: old.value, newValue: item.value });
        continue;
      }
      if (item.predicate.trim().toLowerCase() === "replaces") {
        const replaced = [...previous.entries()].find(([, previousFact]) => previousFact.subject.trim().toLowerCase() === String(item.value).trim().toLowerCase());
        if (replaced) {
          matchedPrevious.add(replaced[0]);
          result.push({ type: "REPLACED", subject: item.subject, explanation: `${item.subject} replaces ${replaced[1].subject}.`, previousValue: replaced[1].value, newValue: item.value });
          continue;
        }
      }
      result.push({ type: "NEW", subject: item.subject, explanation: "Fact did not exist in channel knowledge.", newValue: item.value });
    }
    for (const [factKey, old] of previous) if (!current.has(factKey) && !matchedPrevious.has(factKey)) result.push({ type: "DEPRECATED", subject: old.subject, explanation: "Existing fact was not present in the new extraction.", previousValue: old.value });
    return result;
  }
}