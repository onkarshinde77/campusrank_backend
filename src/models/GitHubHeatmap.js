import mongoose from 'mongoose';

const gitHubHeatmapSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    activeYears: [Number],
    // Store data per year
    years: {
        type: Map,
        of: new mongoose.Schema({
            year: Number,
            totalContributions: Number,
            weeks: [] // Storing the weeks array structure from GitHub GraphQL
        }, { _id: false })
    },
    lastUpdated: { type: Date, default: Date.now }
}, {
    timestamps: true
});

export default mongoose.model('GitHubHeatmap', gitHubHeatmapSchema);
