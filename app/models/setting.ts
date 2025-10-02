import * as mongoose from 'mongoose';
const SettingSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        value: mongoose.Schema.Types.Mixed,
        description: String,
        type: String,
        category: String,
        createAvailable: Boolean,
        siteUnderMaintenance: Boolean,
        hideFooter: Boolean,
        isMonitorSettingsIsRunning: Boolean,
        isAIAvailable: Boolean,
        numOfQuestionsForAI: Number,
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
const model = mongoose.model('Settings', SettingSchema);
export { model };