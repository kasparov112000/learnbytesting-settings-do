/**
 * Seed script to create NOTEBOOKLM_FLASHCARD_GENERATION setting
 * Run with: npm run seed:notebooklm-flashcard-generation
 *
 * This setting configures the flashcard generation feature that uses
 * NotebookLM RAG to analyze user's chess game weaknesses and generate
 * personalized flashcards.
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

// NotebookLM Flashcard Generation Setting Document
const NOTEBOOKLM_FLASHCARD_GENERATION_SETTING = {
  name: 'NOTEBOOKLM_FLASHCARD_GENERATION',
  description: 'Configuration for generating flashcards from NotebookLM game weakness analysis. Controls prompts, card limits, and generation behavior.',
  type: 'Feature',
  category: 'NotebookLM',
  adminOnly: true,
  environment: 'both',
  value: 'NotebookLM Flashcard Generation Configuration',

  // ========== FEATURE TOGGLE ==========
  enabled: true,

  // ========== RAG QUERY CONFIGURATION ==========
  // Prompt template for querying NotebookLM RAG to identify weaknesses
  // Placeholders: {{maxWeaknesses}}
  ragQueryPrompt: `Analyze all my chess games and identify my top {{maxWeaknesses}} most critical and specific weaknesses that I should work on improving.

For EACH weakness, provide the following in a structured format:
1. **Weakness Name**: A short, descriptive title (e.g., "Weak Endgame Technique with Rooks")
2. **Description**: A clear explanation of what I'm doing wrong and why it's hurting my game
3. **Example Position**: If applicable, provide a FEN notation of a typical position where this weakness occurs
4. **Correct Approach**: The moves or strategy I should use instead (in PGN format if applicable)
5. **Opening Context**: If this weakness relates to a specific opening, name it
6. **Difficulty Level**: Rate 1-5 how complex this concept is to master

Focus on actionable, specific weaknesses rather than general advice like "calculate more" or "study tactics".
Reference specific games or patterns you've observed in my game history.`,

  // ========== FLASHCARD GENERATION CONFIGURATION ==========
  // Prompt template for LLM to generate flashcard JSON from weakness analysis
  // Placeholders: {{maxCards}}, {{weaknessAnalysis}}, {{userEmail}}
  flashcardGenerationPrompt: `You are a chess coach creating study flashcards. Based on the following weakness analysis, generate exactly {{maxCards}} flashcards in JSON format.

RULES:
1. Each flashcard should test ONE specific concept from the weakness analysis
2. Questions should be practical and scenario-based when possible
3. Include chess positions (FEN) when the weakness involves board positions
4. Include move sequences (PGN) when testing tactical or opening knowledge
5. Vary difficulty levels based on concept complexity
6. Make hints helpful but not give away the answer

FLASHCARD STRUCTURE:
{
  "front": "The question or scenario (be specific and clear)",
  "back": "The answer with explanation (concise but complete)",
  "hint": "A helpful hint without giving away the answer (optional)",
  "difficulty": 1-5 (1=beginner, 5=advanced),
  "tags": ["relevant", "tags", "for", "categorization"],
  "fen": "FEN notation if position-based (optional)",
  "pgn": "Move sequence for practice mode (optional)",
  "startingFen": "Starting position if different from standard (optional)",
  "openingName": "Opening name if relevant (optional)"
}

EXAMPLE FLASHCARD WITH CHESS POSITION:
{
  "front": "You're playing Black in the Sicilian. White just played 6.Be2. What's the best response to maintain equality?",
  "back": "6...e6! Preparing ...Be7 and ...O-O. This solid setup prevents White's attacking ideas while completing development.",
  "hint": "Think about king safety and development",
  "difficulty": 3,
  "tags": ["opening", "sicilian", "black", "development"],
  "fen": "rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP1BPPP/R1BQK2R b KQkq - 0 6",
  "pgn": "6...e6",
  "openingName": "Sicilian Defense: Classical Variation"
}

WEAKNESS ANALYSIS:
{{weaknessAnalysis}}

OUTPUT ONLY VALID JSON (no markdown, no explanation):
{"flashcards": [...]}`,

  // ========== GENERATION LIMITS ==========
  maxCards: 10,
  maxWeaknesses: 5,
  defaultDifficulty: 3,

  // ========== CHESS POSITION OPTIONS ==========
  includeChessPositions: true,
  includePracticeMode: true,

  // ========== FLASHCARD DEFAULTS ==========
  // Default values applied to all generated flashcards
  flashcardDefaults: {
    sourceType: 'ai-generated',
    tags: ['weakness', 'notebooklm-generated', 'personalized'],
    canBeQuizzed: true
  },

  // ========== CATEGORY CONFIGURATION ==========
  // Category to assign generated flashcards to
  defaultCategoryName: 'My Weaknesses',
  createCategoryIfMissing: true,

  // ========== RATE LIMITING ==========
  maxGenerationsPerDay: 5,
  cooldownMinutes: 10,

  // ========== N8N WORKFLOW ==========
  n8nWebhookPath: '/webhook/notebooklm-generate-flashcards',

  // ========== LOGGING ==========
  logGenerations: true,
  logPrompts: false  // Set to true for debugging
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
    const existing = await Setting.findOne({ name: NOTEBOOKLM_FLASHCARD_GENERATION_SETTING.name });

    if (existing) {
      console.log('Setting already exists. Updating...');
      await Setting.findByIdAndUpdate(existing._id, NOTEBOOKLM_FLASHCARD_GENERATION_SETTING, { new: true });
      console.log('Setting updated successfully:', NOTEBOOKLM_FLASHCARD_GENERATION_SETTING.name);
    } else {
      console.log('Creating new setting...');
      await Setting.create(NOTEBOOKLM_FLASHCARD_GENERATION_SETTING);
      console.log('Setting created successfully:', NOTEBOOKLM_FLASHCARD_GENERATION_SETTING.name);
    }

    console.log('\nSeed completed successfully!');
    console.log('\nSetting structure:');
    console.log(JSON.stringify(NOTEBOOKLM_FLASHCARD_GENERATION_SETTING, null, 2));

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
