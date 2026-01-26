/**
 * Seed script to create NOTEBOOKLM_POSITION_ANALYSIS setting
 * Run with: npm run seed:notebooklm-position-analysis
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

// NotebookLM Position Analysis Setting Document
const NOTEBOOKLM_POSITION_ANALYSIS_SETTING = {
  name: 'NOTEBOOKLM_POSITION_ANALYSIS',
  description: 'Prompt template for NotebookLM position analysis. Use {{fen}} as placeholder for the FEN string.',
  type: 'Site',
  category: 'Chess',
  adminOnly: true,
  environment: 'both',

  // ========== MAIN PROMPT TEMPLATE ==========
  // The value field contains the prompt template with {{fen}} placeholder
  // This is the ONLY field that stores the active prompt - edit this in the webapp
  value: `Analyze this chess position (FEN: {{fen}}).
What are the key strategic ideas, typical plans, and important considerations for both sides?
Include any relevant opening theory, middlegame plans, or endgame considerations if applicable.
Provide practical advice for playing this position.`,

  // ========== FEATURE TOGGLE ==========
  enabled: true,

  // ========== ALTERNATIVE PROMPTS (for reference only) ==========
  // Different prompt styles for various analysis needs
  promptTemplates: {
    default: `Analyze this chess position (FEN: {{fen}}).
What are the key strategic ideas, typical plans, and important considerations for both sides?
Include any relevant opening theory, middlegame plans, or endgame considerations if applicable.
Provide practical advice for playing this position.`,

    beginner: `Analyze this chess position (FEN: {{fen}}) for a beginner player.
Explain in simple terms:
1. What is the current situation on the board?
2. What should each side try to do?
3. What are the most important pieces to watch?
4. What simple moves or plans would you recommend?
Keep the explanation easy to understand.`,

    tactical: `Analyze this chess position (FEN: {{fen}}) focusing on tactics.
Look for:
1. Any immediate threats or hanging pieces
2. Tactical motifs (forks, pins, skewers, discovered attacks)
3. Candidate moves that create tactical opportunities
4. Defensive resources if under attack
Be specific about the squares and pieces involved.`,

    strategic: `Analyze this chess position (FEN: {{fen}}) from a strategic perspective.
Evaluate:
1. Pawn structure strengths and weaknesses
2. Piece activity and coordination
3. King safety for both sides
4. Long-term plans and positional goals
5. Key squares and outposts
Focus on understanding the position deeply rather than calculating specific lines.`,

    opening: `Analyze this chess position (FEN: {{fen}}) in the context of opening theory.
Identify:
1. What opening or variation this position comes from
2. The main ideas and plans for both sides in this opening
3. Typical piece placements and pawn breaks
4. Common mistakes to avoid
5. How this position typically develops
Reference any relevant games or theory if applicable.`
  },

  // ========== ANALYSIS SETTINGS ==========
  includeVariations: true,
  maxResponseLength: 'medium', // short, medium, long
  focusAreas: ['strategy', 'tactics', 'plans'], // configurable focus areas

  // ========== RATE LIMITING ==========
  maxAnalysesPerDay: 20,
  cooldownSeconds: 10
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
    const existing = await Setting.findOne({ name: NOTEBOOKLM_POSITION_ANALYSIS_SETTING.name });

    if (existing) {
      console.log('Setting already exists. Updating...');
      await Setting.findByIdAndUpdate(existing._id, NOTEBOOKLM_POSITION_ANALYSIS_SETTING, { new: true });
      console.log('Setting updated successfully:', NOTEBOOKLM_POSITION_ANALYSIS_SETTING.name);
    } else {
      console.log('Creating new setting...');
      await Setting.create(NOTEBOOKLM_POSITION_ANALYSIS_SETTING);
      console.log('Setting created successfully:', NOTEBOOKLM_POSITION_ANALYSIS_SETTING.name);
    }

    console.log('\nSeed completed successfully!');
    console.log('\nSetting structure:');
    console.log(JSON.stringify(NOTEBOOKLM_POSITION_ANALYSIS_SETTING, null, 2));

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
