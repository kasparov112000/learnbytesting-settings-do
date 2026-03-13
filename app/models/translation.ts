import * as mongoose from 'mongoose';

const TranslationSchema = new mongoose.Schema(
    {
        app: { type: String, required: true, enum: ['mobile', 'webapp'] },
        lang: { type: String, required: true },
        keys: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
        version: { type: Number, default: 1 }
    },
    {
        timestamps: true
    }
);

TranslationSchema.index({ app: 1, lang: 1 }, { unique: true });

const model = mongoose.model('Translation', TranslationSchema);
export { model };
