export type DeltaType = "NEW" | "CHANGED" | "REPEATED" | "CONTRADICTED" | "DEPRECATED" | "REPLACED";
export interface DeltaEngine {
  detect(input: { channelId: string; facts: unknown[] }): Promise<Array<{ type: DeltaType; subject: string; explanation: string; previousValue?: unknown; newValue?: unknown }>>;
}