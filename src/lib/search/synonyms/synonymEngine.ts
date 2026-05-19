import mongoose, { Schema, Document, Model } from 'mongoose';
import synonymsData from './synonyms.json';

// Define the interface for custom database synonyms (for admin extensibility)
export interface ISynonym extends Document {
    word: string;
    synonyms: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

const SynonymSchema = new Schema<ISynonym>({
    word: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    synonyms: {
        type: [String],
        required: true,
        default: []
    }
}, { timestamps: true });

// Prevent overwriting model in dev hot-reload
export const SynonymModel: Model<ISynonym> = mongoose.models.Synonym || mongoose.model<ISynonym>('Synonym', SynonymSchema);

export class SynonymEngine {
    private static instance: SynonymEngine;
    private synonymMap: Map<string, Set<string>> = new Map();
    private loadedFromDb: boolean = false;
    private lastDbLoadTime: number = 0;
    private DB_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

    private constructor() {
        this.initializeStaticSynonyms();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): SynonymEngine {
        if (!SynonymEngine.instance) {
            SynonymEngine.instance = new SynonymEngine();
        }
        return SynonymEngine.instance;
    }

    /**
     * Load hardcoded synonyms from synonyms.json
     */
    private initializeStaticSynonyms(): void {
        const rawMap = synonymsData as Record<string, string[]>;
        for (const [word, list] of Object.entries(rawMap)) {
            const cleanWord = word.toLowerCase().trim();
            const set = this.synonymMap.get(cleanWord) || new Set<string>();
            list.forEach(syn => {
                const cleanSyn = syn.toLowerCase().trim();
                if (cleanSyn && cleanSyn !== cleanWord) {
                    set.add(cleanSyn);
                }
            });
            if (set.size > 0) {
                this.synonymMap.set(cleanWord, set);
            }
        }
    }

    /**
     * Load custom synonyms from MongoDB and merge them with static ones
     */
    public async loadCustomSynonymsFromDb(force: boolean = false): Promise<void> {
        const now = Date.now();
        if (this.loadedFromDb && !force && (now - this.lastDbLoadTime < this.DB_REFRESH_INTERVAL_MS)) {
            return; // Cache hit, skip load
        }

        try {
            // Verify if mongoose is connected
            if (mongoose.connection.readyState !== 1) {
                console.warn('MongoDB not connected, skipping custom synonyms load');
                return;
            }

            const customSynonyms = await SynonymModel.find().lean();
            if (customSynonyms && customSynonyms.length > 0) {
                for (const item of customSynonyms) {
                    const cleanWord = item.word.toLowerCase().trim();
                    const set = this.synonymMap.get(cleanWord) || new Set<string>();
                    
                    item.synonyms.forEach(syn => {
                        const cleanSyn = syn.toLowerCase().trim();
                        if (cleanSyn && cleanSyn !== cleanWord) {
                            set.add(cleanSyn);
                        }
                    });
                    
                    if (set.size > 0) {
                        this.synonymMap.set(cleanWord, set);
                    }
                }
                console.log(`Successfully merged ${customSynonyms.length} custom synonyms from MongoDB`);
            }
            this.loadedFromDb = true;
            this.lastDbLoadTime = now;
        } catch (error) {
            console.error('Failed to load custom synonyms from DB:', error);
        }
    }

    /**
     * Get all synonyms for a single word
     */
    public getSynonyms(word: string): string[] {
        const cleanWord = word.toLowerCase().trim();
        const set = this.synonymMap.get(cleanWord);
        return set ? Array.from(set) : [];
    }

    /**
     * Expand query tokens with all associated synonyms.
     * Keeps original tokens and adds unique synonyms.
     */
    public expandTokens(tokens: string[]): string[] {
        const expandedSet = new Set<string>();
        
        for (const token of tokens) {
            const cleanToken = token.toLowerCase().trim();
            if (!cleanToken) continue;
            
            // Keep original token
            expandedSet.add(cleanToken);
            
            // Get synonyms
            const synonyms = this.getSynonyms(cleanToken);
            synonyms.forEach(syn => expandedSet.add(syn));
        }

        return Array.from(expandedSet);
    }
}
