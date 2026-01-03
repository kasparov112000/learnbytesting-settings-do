/**
 * Seed script to create CHESS_PLAY_AI_ANALYSIS setting
 * Run with: npm run seed:chess-ai-analysis
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

// MongoDB connection configuration
const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_NAME = process.env.MONGO_NAME || 'mdr-settings';
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;

let mongoUri: string;
if (MONGO_USER && MONGO_PASSWORD) {
  mongoUri = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_NAME}?authSource=admin`;
} else {
  mongoUri = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_NAME}`;
}

// Settings schema
const SettingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    description: String,
    type: String,
    category: String,
    adminOnly: { type: Boolean, default: false },
    environment: { type: String, enum: ['prod', 'local', 'both'], default: 'both' }
  },
  { timestamps: true, strict: false }
);

const Setting = mongoose.model('Settings', SettingSchema);

// Chess AI Analysis Setting Document
// Using top-level custom fields for better UI display and editing
const CHESS_AI_ANALYSIS_SETTING = {
  name: 'CHESS_PLAY_AI_ANALYSIS',
  description: 'Configuration for AI-powered game analysis in Chess Play. Controls which AI model is used and the prompt template for generating game reviews.',
  type: 'Site',
  category: 'Chess',
  adminOnly: true,
  environment: 'both',
  value: 'AI Game Analysis Configuration', // Simple display value

  // ========== FEATURE TOGGLE ==========
  enabled: true,

  // ========== HUMAN IN THE LOOP ==========
  // When enabled, creates an AI job instead of calling the API directly
  // This allows admins to review/modify the prompt and response
  humanInTheLoop: false,

  // ========== AI MODEL CONFIGURATION ==========
  // The model ID to use for game reviews
  defaultModel: 'claude-sonnet-4-5-20250929',

  // Available models as JSON array (for dropdown selection in future UI)
  availableModels: [
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)', provider: 'anthropic' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (Latest Fast)', provider: 'anthropic' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Balanced)', provider: 'anthropic' },
    { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5 (Best Quality)', provider: 'anthropic' },
    { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro (Flagship)', provider: 'google' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)', provider: 'google' }
  ],

  // ========== PROMPT TEMPLATE ==========
  // System context prepended to all prompts
  systemContext: 'You are an experienced chess coach providing constructive game reviews. Your reviews should be educational, encouraging, and actionable.',

  // Main prompt template with placeholders
  // Placeholders: {{playerColor}}, {{opponentElo}}, {{result}}, {{accuracy}}, {{blunders}}, {{mistakes}}, {{inaccuracies}}, {{moves}}, {{keyPositions}}
  promptTemplate: `Analyze this chess game and provide helpful feedback:

**Game Details:**
- Player color: {{playerColor}}
- Opponent ELO: {{opponentElo}}
- Result: {{result}}
- Accuracy: {{accuracy}}%
- Blunders: {{blunders}}
- Mistakes: {{mistakes}}
- Inaccuracies: {{inaccuracies}}

**Moves:**
{{moves}}

**Key Moments:**
{{keyPositions}}

Please provide a constructive game review that includes:
1. **Overall Assessment**: How well did the player perform?
2. **Opening Phase**: Evaluate the opening play and preparation
3. **Critical Moments**: Discuss the key turning points and what could have been done better
4. **Strengths**: What did the player do well?
5. **Areas for Improvement**: Specific areas to work on
6. **Recommendations**: 2-3 concrete tips for improving

Keep the review encouraging but honest. Focus on the most important learning points.
Write in a conversational, coaching style. Keep the review concise (3-4 paragraphs).`,

  // ========== REVIEW SETTINGS ==========
  maxResponseTokens: 2000,
  temperature: 0.7,
  includeMoveSuggestions: true,
  readingLevel: 'intermediate',

  // ========== ACCURACY THRESHOLDS ==========
  // Used to determine the tone of the review
  accuracyExcellent: 90,
  accuracyGood: 80,
  accuracyDecent: 70,
  accuracyNeedsWork: 60,

  // ========== RATE LIMITING ==========
  maxReviewsPerDay: 10,
  cooldownSeconds: 30
};

async function seed() {
  try {
    console.log('Connecting to MongoDB:', mongoUri.replace(/:[^:@]+@/, ':***@'));
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    } as any);

    console.log('Connected to MongoDB');

    // Check if setting already exists
    const existing = await Setting.findOne({ name: CHESS_AI_ANALYSIS_SETTING.name });

    if (existing) {
      console.log('Setting already exists. Updating...');
      await Setting.findByIdAndUpdate(existing._id, CHESS_AI_ANALYSIS_SETTING, { new: true });
      console.log('Setting updated successfully:', CHESS_AI_ANALYSIS_SETTING.name);
    } else {
      console.log('Creating new setting...');
      await Setting.create(CHESS_AI_ANALYSIS_SETTING);
      console.log('Setting created successfully:', CHESS_AI_ANALYSIS_SETTING.name);
    }

    // Also update/create the CHESS_AI_CLAUDE_MODEL setting for backward compatibility
    const modelSetting = {
      name: 'CHESS_AI_CLAUDE_MODEL',
      description: 'Default AI model for chess-ai service. This is used as a fallback if CHESS_PLAY_AI_ANALYSIS is not configured.',
      type: 'Site',
      category: 'Chess',
      adminOnly: true,
      environment: 'both',
      value: 'claude-sonnet-4-5-20250929'
    };

    const existingModel = await Setting.findOne({ name: modelSetting.name });
    if (existingModel) {
      console.log('CHESS_AI_CLAUDE_MODEL already exists, skipping...');
    } else {
      await Setting.create(modelSetting);
      console.log('Created CHESS_AI_CLAUDE_MODEL setting');
    }

    console.log('\nSeed completed successfully!');
    console.log('\nSetting structure:');
    console.log(JSON.stringify(CHESS_AI_ANALYSIS_SETTING, null, 2));

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
