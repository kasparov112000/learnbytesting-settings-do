import * as mongoose from 'mongoose';
const SettingSchema = new mongoose.Schema(
    {
        _id: String,
        createAvailable: Boolean,
        allowDownloadWordDocumentEnabled: Boolean,
        hideFooter: Boolean,
    }
);
const model = mongoose.model('Settings', SettingSchema);
export { model };