
import express, { Request, Response } from 'express';
import User from '../models/User';
import Company from '../models/Company';
import { systemSettingsService } from '../services/SystemSettingsService';
import { hashPassword } from '../utils/password';

const router = express.Router();

// Check verify system setup status
router.get('/status', async (req: Request, res: Response) => {
    try {
        const adminExists = await User.exists({ role: 'admin' });
        const companyExists = await Company.exists({});

        const settings = await systemSettingsService.getSettings();

        // If 'NexERP' is the default name, it likely hasn't been configured by user
        const isConfigured = !!(adminExists && companyExists && settings.appName !== 'NexERP');

        res.json({
            isSetupComplete: isConfigured,
            steps: {
                adminCreated: !!adminExists,
                companyCreated: !!companyExists,
                settingsConfigured: settings.appName !== 'NexERP'
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Run Setup Wizard
router.post('/complete', async (req: Request, res: Response) => {
    try {
        const {
            // Admin User
            adminName, adminEmail, adminPassword,
            // Company
            companyName, taxId, ceoName,
            // Settings
            country, currency, timeZone, language
        } = req.body;

        // 1. Validation limits
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            // In a real scenario, we might allow re-setup or block it. 
            // For now, we update if exists, or block if strict.
            // Let's adopt ERPNext style: If admin exists, we assume setup is done, but allow "Re-run" for company/settings if authenticated.
            // But for an unauthenticated /setup endpoint, we should be careful.
            // Simplified: If admin exists, reject "fresh setup".
            return res.status(403).json({ message: "System is already set up. Please login to changes settings." });
        }

        // 2. Create Admin User
        const hashedPassword = await hashPassword(adminPassword);
        const newAdmin = await User.create({
            username: 'admin', // Fixed username for root
            email: adminEmail,
            password: hashedPassword, // In real model this might be hashed in pre-save
            firstName: adminName,
            lastName: 'Administrator',
            role: 'admin',
            isActive: true
        });

        // 3. Create Default Company
        const newCompany = await Company.create({
            name: companyName,
            taxId: taxId,
            ceoName: ceoName,
            defaultCurrency: currency,
            email: adminEmail, // Default to admin email
            isActive: true
        });

        // 4. Update System Settings
        const settings = await systemSettingsService.updateSettings({
            country,
            currency,
            timeZone,
            language,
            appName: companyName // Set App Name to Company Name by default
        });

        res.json({
            success: true,
            message: "Setup completed successfully!",
            admin: {
                email: newAdmin.email,
                username: newAdmin.username
            },
            company: newCompany.name
        });

    } catch (error: any) {
        console.error("Setup Error:", error);
        res.status(500).json({ message: "Setup failed: " + error.message });
    }
});

export default router;
