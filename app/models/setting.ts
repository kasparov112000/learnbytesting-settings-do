import * as mongoose from 'mongoose';

const SettingSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        value: mongoose.Schema.Types.Mixed,
        description: String,
        type: String,
        category: String,
        // Access control
        adminOnly: { type: Boolean, default: false, index: true }, // If true, only visible to admin users
        // Environment targeting - admin only field
        // Values: 'prod' (production only), 'local' (local only), 'both' (all environments)
        environment: {
            type: String,
            enum: ['prod', 'local', 'both'],
            default: 'both',
            index: true
        },
        // Feature flags
        createAvailable: Boolean,
        siteUnderMaintenance: Boolean,
        hideFooter: Boolean,
        isMonitorSettingsIsRunning: Boolean,
        isAIAvailable: Boolean,
        numOfQuestionsForAI: Number,
        // Module logging configuration
        moduleLogging: mongoose.Schema.Types.Mixed,
        // Audit fields
        createdAt: Date,
        updatedAt: Date,
        createdBy: String,
        updatedBy: String
    },
    {
        timestamps: true, // This will automatically manage createdAt and updatedAt
        strict: false // Allow any additional fields not defined in the schema
    }
);

// Create compound indexes for common query patterns
SettingSchema.index({ adminOnly: 1, category: 1 });
SettingSchema.index({ type: 1, adminOnly: 1 });
SettingSchema.index({ environment: 1, adminOnly: 1 });
SettingSchema.index({ environment: 1, category: 1 });

const model = mongoose.model('Settings', SettingSchema);
export { model };