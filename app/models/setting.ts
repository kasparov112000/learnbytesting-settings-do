import * as mongoose from 'mongoose';
const SettingSchema = new mongoose.Schema(
    {
        createAvailable: Boolean,
        allowDownloadWordDocumentEnabled: Boolean,
        hideFooter: Boolean,
        isMonitorSettingsIsRunning: Boolean,
        isAIAvailable: Boolean,
    }
);
const model = mongoose.model('Settings', SettingSchema);
export { model };