import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  employeeId: text("employee_id").notNull().unique(),
  role: text("role").notNull().default("employee"), // employee, tl, manager, admin
  isActive: boolean("is_active").notNull().default(true),
  loginTime: timestamp("login_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  companySize: text("company_size"),
  notes: text("notes"),
  comments:text("comments"),
  status: text("status").notNull().default("active"), // active, inactive
  assignedToUserId: integer("assigned_to_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // followup, hot, block
  commentDate: timestamp("comment_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dataRequests = pgTable("data_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  requestType: text("request_type").notNull(),
  industry: text("industry"),
  justification: text("justification").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by"),
  companiesAssigned: integer("companies_assigned").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  duration: text("duration").notNull().default("full_day"), // full_day, half_day, extended
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const facebookDataRequests = pgTable("facebook_data_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  justification: text("justification").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const facebookData = pgTable("facebook_data", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  address: text("address").notNull(),
  email: text("email").notNull(),
  contact: text("contact").notNull(),
  products: text("products").array().notNull(),
  services: text("services").array().notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
  dataRequests: many(dataRequests),
  assignedCompanies: many(companies),
  facebookDataRequests: many(facebookDataRequests),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [companies.assignedToUserId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  company: one(companies, {
    fields: [comments.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const dataRequestsRelations = relations(dataRequests, ({ one }) => ({
  user: one(users, {
    fields: [dataRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [dataRequests.approvedBy],
    references: [users.id],
  }),
}));

export const facebookDataRequestsRelations = relations(facebookDataRequests, ({ one }) => ({
  user: one(users, {
    fields: [facebookDataRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [facebookDataRequests.approvedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  fullName: true,
  employeeId: true,
  role: true,
}).extend({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .trim()
    .min(1, "Username is required"),
  email: z.string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(100, "Email must be less than 100 characters")
    .trim()
    .toLowerCase()
    .min(1, "Email is required"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters")
    .min(1, "Password is required"),
  fullName: z.string()
    .min(1, "Full name is required")
    .max(100, "Full name must be less than 100 characters")
    .trim()
    .min(1, "Full name is required"),
  employeeId: z.string()
    .min(1, "Employee ID is required")
    .max(20, "Employee ID must be less than 20 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Employee ID can only contain letters, numbers, and hyphens")
    .trim()
    .min(1, "Employee ID is required"),
  role: z.enum(["employee", "tl", "manager", "admin"], {
    errorMap: () => ({ message: "Role must be one of: employee, tl, manager, admin" })
  }).default("employee")
});

export const insertCompanySchema = createInsertSchema(companies).pick({
  name: true,
  industry: true,
  email: true,
  phone: true,
  address: true,
  website: true,
  companySize: true,
  notes: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  companyId: true,
  content: true,
  category: true,
  commentDate: true,
}).extend({
  companyId: z.number().int().positive(),
  content: z.string().min(1, "Comment content is required"),
  category: z.enum(["followup", "hot", "block","general"], {
    errorMap: () => ({ message: "Category must be one of: followup, hot, block,general" })
  }),
  commentDate: z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) {
      return val.toISOString();
    }
    return val;
  })
});

export const insertDataRequestSchema = createInsertSchema(dataRequests).pick({
  requestType: true,
  industry: true,
  justification: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).pick({
  name: true,
  date: true,
  description: true,
  duration: true,
}).extend({
  name: z.string().min(1, "Holiday name is required"),
  date: z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) {
      return val;
    }
    return new Date(val);
  }),
  description: z.string().optional(),
  duration: z.enum(["full_day", "half_day", "extended"], {
    errorMap: () => ({ message: "Duration must be one of: full_day, half_day, extended" })
  })
});

export const insertFacebookDataRequestSchema = createInsertSchema(facebookDataRequests).pick({
  justification: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type DataRequest = typeof dataRequests.$inferSelect;
export type InsertDataRequest = z.infer<typeof insertDataRequestSchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type FacebookDataRequest = typeof facebookDataRequests.$inferSelect;
export type InsertFacebookDataRequest = z.infer<typeof insertFacebookDataRequestSchema>;

// Add the Section type definition here
export type Section = 
  | "allData" 
  | "todayData" 
  | "facebookData" 
  | "facebookRequest" 
  | "general" 
  | "followUp" 
  | "hotData" 
  | "blockData" 
  | "newList" 
  | "requestData" 
  | "holidays" 
  | "adminPanel"
  | "assignedData";
