
import SystemSettings, { ISystemSettings } from '../models/SystemSettings';

class SystemSettingsService {
    private static instance: SystemSettingsService;
    private cache: ISystemSettings | null = null;
    private lastFetch: number = 0;
    private readonly CACHE_TTL = 60 * 1000; // 1 minute cache

    private constructor() { }

    public static getInstance(): SystemSettingsService {
        if (!SystemSettingsService.instance) {
            SystemSettingsService.instance = new SystemSettingsService();
        }
        return SystemSettingsService.instance;
    }

    /**
     * Get the singleton SystemSettings document.
     * Creates default settings if none exist.
     */
    public async getSettings(): Promise<ISystemSettings> {
        const now = Date.now();
        if (this.cache && (now - this.lastFetch < this.CACHE_TTL)) {
            return this.cache;
        }

        let settings = await SystemSettings.findOne();

        if (!settings) {
            console.log('⚠️ No System Settings found. Creating defaults...');
            settings = await SystemSettings.create({
                country: 'South Korea',
                language: 'ko',
                currency: 'KRW',
                timeZone: 'Asia/Seoul',
            });
        }

        this.cache = settings;
        this.lastFetch = now;
        return settings;
    }

    /**
     * Update system settings. Invalidates cache.
     */
    public async updateSettings(data: Partial<ISystemSettings>): Promise<ISystemSettings> {
        const settings = await this.getSettings();

        Object.assign(settings, data);
        settings.updatedAt = new Date();

        await settings.save();

        this.cache = settings;
        this.lastFetch = Date.now();

        return settings;
    }

    /**
     * Helper to format currency based on system settings
     */
    public async formatCurrency(amount: number): Promise<string> {
        const settings = await this.getSettings();
        return new Intl.NumberFormat(settings.language === 'ko' ? 'ko-KR' : 'en-US', {
            style: 'currency',
            currency: settings.currency,
            maximumFractionDigits: settings.floatPrecision
        }).format(amount);
    }
}

export const systemSettingsService = SystemSettingsService.getInstance();
