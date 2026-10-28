import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const quotaCells = sqliteTable("quota_cells", {
  key: text("key").primaryKey(),
  district: text("district").notNull(),
  education: text("education").notNull(),
  age: text("age").notNull(),
  quota: integer("quota").notNull(),
});

export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  cellKey: text("cell_key").notNull(),
  claimantName: text("claimant_name").notNull(),
  organization: text("organization").notNull(),
  phone: text("phone").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_reservations_cell_key").on(table.cellKey),
  index("idx_reservations_created_at").on(table.createdAt),
]);

export const admins = sqliteTable("admins", {
  email: text("email").primaryKey(),
  createdAt: text("created_at").notNull(),
});
