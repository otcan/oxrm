import { createCrmServices } from "@orkestr-crm/core";
import { createDatabase } from "@orkestr-crm/db";

export function createCrmTools(databaseUrl: string) {
  const { db, queryClient } = createDatabase(databaseUrl);
  const services = createCrmServices({ db });

  return {
    services,
    async close() {
      await queryClient.end();
    }
  };
}
