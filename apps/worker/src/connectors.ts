export interface ConnectionHealth {
  status: "ok" | "needs_auth" | "error";
  message: string;
}

export interface NormalizedConnectorEvent {
  provider: "salesnav" | "linkedin" | "gmail" | "outlook" | "google_calendar" | "microsoft_calendar" | "caldav";
  externalId: string;
  type: "lead" | "activity" | "busy_block";
  payload: Record<string, unknown>;
}

export interface SyncResult {
  importedLeads: number;
  importedActivities: number;
  events: NormalizedConnectorEvent[];
}

export interface Connector {
  provider: NormalizedConnectorEvent["provider"];
  testConnection(accountId: string): Promise<ConnectionHealth>;
  syncAccount(accountId: string): Promise<SyncResult>;
}

export const plannedConnectors: Connector[] = [
  {
    provider: "salesnav",
    async testConnection() {
      return { status: "needs_auth", message: "SalesNav connector boundary is ready; credentials are not configured." };
    },
    async syncAccount() {
      return { importedLeads: 0, importedActivities: 0, events: [] };
    }
  },
  {
    provider: "linkedin",
    async testConnection() {
      return { status: "needs_auth", message: "LinkedIn connector boundary is ready; browser-worker ingestion comes next." };
    },
    async syncAccount() {
      return { importedLeads: 0, importedActivities: 0, events: [] };
    }
  },
  {
    provider: "gmail",
    async testConnection() {
      return { status: "needs_auth", message: "Email connector boundary is ready; OAuth ingestion comes next." };
    },
    async syncAccount() {
      return { importedLeads: 0, importedActivities: 0, events: [] };
    }
  }
];
