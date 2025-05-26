import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCompanySchema, insertCommentSchema, insertDataRequestSchema, insertHolidaySchema, insertFacebookDataRequestSchema, insertUserSchema, dataRequests, companies, facebookData, facebookDataRequests } from "@shared/schema";
import * as z from "zod";
import { eq, isNull, sql, inArray, and, desc } from "drizzle-orm";
import { db } from "./db";

export function registerRoutes(app: Express): Server {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Company management routes
  app.get("/api/companies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/today", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get companies created today by the current user
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCompanies = await db
        .select()
        .from(companies)
        .where(
          and(
            eq(companies.assignedToUserId, req.user!.id),
            sql`DATE(${companies.createdAt}) = DATE(${today})`
          )
        )
        .orderBy(desc(companies.createdAt));
      
      res.json(todayCompanies);
    } catch (error) {
      console.error('Failed to fetch today\'s companies:', error);
      res.status(500).json({ message: "Failed to fetch today's companies" });
    }
  });

  app.get("/api/companies/my", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[/api/companies/my] User not authenticated');
      return res.sendStatus(401);
    }
    
    console.log('[/api/companies/my] User authenticated:', req.user!.id);

    try {
      const companies = await storage.getCompaniesByUser(req.user!.id);
      console.log('[/api/companies/my] Fetched companies:', companies.length);
      console.log('[/api/companies/my] Sample company:', companies.length > 0 ? companies[0] : 'N/A');
      res.json(companies);
    } catch (error) {
      console.error('[/api/companies/my] Failed to fetch user companies:', error);
      res.status(500).json({ message: "Failed to fetch user companies" });
    }
  });

  app.get("/api/companies/category/:category", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { category } = req.params;
      const companies = await storage.getCompaniesByCategory(category, req.user!.id);
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies by category" });
    }
  });

  app.post("/api/companies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      // Create company without assigning to any user by default
      const company = await storage.createCompany({
        ...validatedData,
        assignedToUserId: undefined, // Use undefined instead of null
      });
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid company data" });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const validatedData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(parseInt(id), validatedData);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid company data" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can delete companies
    if (!["tl", "manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const { id } = req.params;
      await storage.deleteCompany(parseInt(id));
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Comment management routes
  app.get("/api/comments/today", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const comments = await storage.getTodaysCommentsByUser(req.user!.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's comments" });
    }
  });

  app.get("/api/comments/company/:companyId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { companyId } = req.params;
      const comments = await storage.getCommentsByCompany(parseInt(companyId));
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      console.log('Received comment data:', req.body);
      
      // Validate the data
      const validatedData = insertCommentSchema.parse(req.body);
      
      // Create the comment with the validated data
      const comment = await storage.createComment({
        ...validatedData,
        userId: req.user!.id,
      });
      res.status(201).json(comment);
    } catch (error) {
      console.error('Comment validation error:', error);
      if (error instanceof Error) {
        // Handle Zod validation errors
        if (error.name === 'ZodError') {
          const zodError = error as any;
          const errorMessage = zodError.errors?.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
          return res.status(400).json({ 
            message: errorMessage || 'Validation error',
            details: zodError.errors 
          });
        }
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Invalid comment data" });
      }
    }
  });

  // Data request routes
  app.get("/api/data-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const requests = await storage.getDataRequestsByUser(req.user!.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch data requests" });
    }
  });

  app.get("/api/data-requests/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can view pending requests
    if (!["tl", "manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const requests = await storage.getPendingDataRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.post("/api/data-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertDataRequestSchema.parse(req.body);
      const request = await storage.createDataRequest({
        ...validatedData,
        userId: req.user!.id,
      });
      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/data-requests/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can update request status
    if (!["tl", "manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      console.log('Updating request status:', { id, status, userId: req.user!.id });
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get the request first to know the user ID
      const request = await storage.getDataRequestById(parseInt(id));
      console.log('Found request:', request);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      try {
        // Start a transaction to ensure all operations succeed or fail together
        const result = await db.transaction(async (tx) => {
          console.log('Starting transaction for request update');
          
          // Update the request status
          const [updatedRequest] = await tx
            .update(dataRequests)
            .set({
              status,
              approvedBy: req.user!.id,
              updatedAt: new Date(),
            })
            .where(eq(dataRequests.id, parseInt(id)))
            .returning();
          
          console.log('Updated request:', updatedRequest);

          // If approved, assign companies to the user
          if (status === "approved") {
            console.log('Approving request, finding unassigned companies');
            
            // Get unassigned companies
            const unassignedCompanies = await tx
              .select()
              .from(companies)
              .where(isNull(companies.assignedToUserId))
              .limit(10);
            
            console.log('Found unassigned companies:', unassignedCompanies.length);

            if (unassignedCompanies.length > 0) {
              // Assign companies to the user
              const companyIds = unassignedCompanies.map(c => c.id);
              console.log('Assigning companies:', companyIds);
              
              // Update each company individually to avoid array issues
              for (const companyId of companyIds) {
                await tx
                  .update(companies)
                  .set({ 
                    assignedToUserId: request.userId, 
                    updatedAt: new Date()
                  })
                  .where(eq(companies.id, companyId));
              }

              // Update the request with the number of companies assigned
              await tx
                .update(dataRequests)
                .set({ companiesAssigned: unassignedCompanies.length })
                .where(eq(dataRequests.id, parseInt(id)));
              
              console.log('Updated request with assigned companies count');
            }
          }

          return updatedRequest;
        });

        console.log('Transaction completed successfully');
        res.json(result);
      } catch (txError) {
        console.error('Transaction error:', txError);
        throw txError; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      res.status(500).json({ 
        message: "Failed to update request status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Holiday routes
  app.get("/api/holidays", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const holidays = await storage.getAllHolidays();
      res.json(holidays);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can create holidays
    if (!["admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      console.log('Received holiday data:', req.body);
      const validatedData = insertHolidaySchema.parse(req.body);
      console.log('Validated holiday data:', validatedData);
      const holiday = await storage.createHoliday(validatedData);
      res.status(201).json(holiday);
    } catch (error) {
      console.error('Holiday creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid holiday data", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      res.status(400).json({ message: "Invalid holiday data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can delete holidays
    if (!["admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const { id } = req.params;
      await storage.deleteHoliday(parseInt(id));
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // Facebook data request routes
  app.get("/api/facebook-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const requests = await storage.getFacebookDataRequestsByUser(req.user!.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Facebook requests" });
    }
  });

  app.get("/api/facebook-requests/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can view pending requests
    if (!["tl", "manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const requests = await storage.getPendingFacebookDataRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending Facebook requests" });
    }
  });

  app.post("/api/facebook-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validatedData = insertFacebookDataRequestSchema.parse(req.body);
      const request = await storage.createFacebookDataRequest({
        ...validatedData,
        userId: req.user!.id,
      });
      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/facebook-requests/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can update request status
    if (!["tl", "manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get the request first to know the user ID
      const request = await storage.getFacebookDataRequestById(parseInt(id));
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      try {
        // Start a transaction to ensure all operations succeed or fail together
        const result = await db.transaction(async (tx) => {
          console.log('Starting transaction for Facebook data request update');
          
          // Update the request status
          const [updatedRequest] = await tx
            .update(facebookDataRequests)
            .set({
              status,
              approvedBy: req.user!.id,
              updatedAt: new Date(),
            })
            .where(eq(facebookDataRequests.id, parseInt(id)))
            .returning();
          
          console.log('Updated request status:', updatedRequest);

          // If approved, assign Facebook data to the user
          if (status === "approved") {
            console.log('Approving request, finding Facebook data records');
            
            // Get 10 random Facebook data records
            const facebookDataRecords = await tx
              .select()
              .from(facebookData)
              .orderBy(sql`RANDOM()`)
              .limit(10);
            
            console.log('Found Facebook data records:', facebookDataRecords.length);

            if (facebookDataRecords.length > 0) {
              // Create a new table to track assigned Facebook data
              await tx.execute(sql`
                CREATE TABLE IF NOT EXISTS assigned_facebook_data (
                  id SERIAL PRIMARY KEY,
                  facebook_data_id INTEGER NOT NULL REFERENCES facebook_data(id),
                  user_id INTEGER NOT NULL REFERENCES users(id),
                  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
                  UNIQUE(facebook_data_id, user_id)
                )
              `);

              // Assign the Facebook data to the user
              for (const record of facebookDataRecords) {
                await tx.execute(sql`
                  INSERT INTO assigned_facebook_data (facebook_data_id, user_id)
                  VALUES (${record.id}, ${request.userId})
                  ON CONFLICT (facebook_data_id, user_id) DO NOTHING
                `);
              }
              
              console.log('Assigned Facebook data records to user:', request.userId);
            }
          }

          return updatedRequest;
        });

        console.log('Transaction completed successfully');
        res.json(result);
      } catch (txError) {
        console.error('Transaction error:', txError);
        throw txError;
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      res.status(500).json({ 
        message: "Failed to update request status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can view all users
    if (!["tl", "manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can create users
    if (!["tl", "manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      console.log('Received user creation request:', {
        body: req.body,
        user: req.user
      });
      
      const userData = req.body;
      
      // Validate the data before hashing
      try {
        console.log('Validating user data:', {
          ...userData,
          password: '[REDACTED]'
        });
        
        const validatedData = insertUserSchema.parse(userData);
        console.log('Data validation successful:', {
          ...validatedData,
          password: '[REDACTED]'
        });
      } catch (validationError: any) {
        console.error('Validation error:', {
          name: validationError.name,
          message: validationError.message,
          errors: validationError.errors,
          stack: validationError.stack
        });
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: validationError.errors?.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      // Hash password before storing
      const { hashPassword } = require("./auth");
      userData.password = await hashPassword(userData.password);
      
      console.log('Hashed user data:', {
        ...userData,
        password: '[REDACTED]'
      });
      
      try {
        const user = await storage.createUser(userData);
        console.log('User created successfully:', {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        });
        res.status(201).json(user);
      } catch (dbError: any) {
        console.error('Database error:', {
          name: dbError.name,
          message: dbError.message,
          code: dbError.code,
          constraint: dbError.constraint_name,
          detail: dbError.detail,
          stack: dbError.stack
        });
        
        // Handle unique constraint violations
        if (dbError.code === '23505') { // PostgreSQL unique violation code
          const field = dbError.constraint_name?.includes('username') ? 'username' :
                       dbError.constraint_name?.includes('email') ? 'email' :
                       dbError.constraint_name?.includes('employee_id') ? 'employeeId' : 'unknown';
          return res.status(400).json({ 
            message: `User with this ${field} already exists`,
            field,
            error: dbError.message
          });
        }
        
        // Handle other database errors
        return res.status(400).json({ 
          message: "Database error occurred",
          error: dbError.message,
          details: {
            code: dbError.code,
            constraint: dbError.constraint_name,
            detail: dbError.detail
          }
        });
      }
    } catch (error: any) {
      console.error('User creation error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        constraint: error.constraint_name,
        detail: error.detail,
        stack: error.stack
      });
      
      // Handle specific error types
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid user data",
          errors: error.errors?.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      if (error.code === '23505') {
        const field = error.constraint_name?.includes('username') ? 'username' :
                     error.constraint_name?.includes('email') ? 'email' :
                     error.constraint_name?.includes('employee_id') ? 'employeeId' : 'unknown';
        return res.status(400).json({ 
          message: `User with this ${field} already exists`,
          field,
          error: error.message
        });
      }
      
      // Handle any other errors
      return res.status(400).json({ 
        message: "Failed to create user",
        error: error instanceof Error ? error.message : String(error),
        details: {
          name: error.name,
          code: error.code,
          constraint: error.constraint_name,
          detail: error.detail
        }
      });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can update users
    if (!["manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Hash password if it's being updated
      if (updates.password) {
        const { hashPassword } = require("./auth");
        updates.password = await hashPassword(updates.password);
      }
      
      const user = await storage.updateUser(parseInt(id), updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only main admin can delete users
    if (req.user!.role !== "admin") {
      return res.sendStatus(403);
    }
    
    try {
      const { id } = req.params;
      await storage.deleteUser(parseInt(id));
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin company management
  app.post("/api/admin/companies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { name, address, email, phone, products, services } = req.body;
      
      // Create company without assigning to any user by default
      const company = await storage.createCompany({
        name,
        industry: "General", // Default industry
        email,
        phone,
        address,
        website: "", // Optional
        companySize: "Medium", // Default size
        notes: `Products: ${products.join(", ")}\nServices: ${services.join(", ")}`,
        assignedToUserId: undefined, // Use undefined instead of null
      });
      
      res.status(201).json(company);
    } catch (error) {
      console.error('Company creation error:', error);
      res.status(400).json({ message: "Invalid company data" });
    }
  });

  app.delete("/api/admin/companies/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admins can delete any company
    if (!["tl", "manager", "admin"].includes(req.user!.role)) {
      return res.sendStatus(403);
    }
    
    try {
      const { id } = req.params;
      await storage.deleteCompany(parseInt(id));
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Update login time when user accesses dashboard
  app.post("/api/user/login-time", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      await storage.updateUserLoginTime(req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to update login time" });
    }
  });

  // Facebook data routes
  app.get("/api/facebook-data", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log('Fetching Facebook data for user:', req.user!.id);
      
      // Get Facebook data assigned to the current user
      const data = await db.execute(sql`
        SELECT fd.*
        FROM facebook_data fd
        INNER JOIN assigned_facebook_data afd ON fd.id = afd.facebook_data_id
        WHERE afd.user_id = ${req.user!.id}
        ORDER BY fd.created_at DESC
      `);
      
      console.log('Found Facebook data records:', data.rows?.length || 0);
      return res.json(data.rows || []);
    } catch (error) {
      console.error("Error fetching Facebook data:", error);
      return res.status(500).json({ 
        error: "Failed to fetch Facebook data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/companies/:id/category", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      const { category } = req.body;
      
      // Only main admin can change category of assigned companies
      const company = await storage.getCompany(parseInt(id));
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      if (company.assignedToUserId && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Only main admin can change category of assigned companies" });
      }
      
      await storage.updateCompanyStatus(parseInt(id), category);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to update company category" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
