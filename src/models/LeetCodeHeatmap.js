import mongoose from 'mongoose';

const leetCodeHeatmapSchema = new mongoose.Schema({
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
    activeYears: [Number], // Years available in the cache/API
    years: {
        type: Map,
        of: new mongoose.Schema({
            submissionCalendar: String,
            totalActiveDays: Number,
            totalSubmissions: Number,
            maxStreak: Number
        }, { _id: false })
    },
    totalActiveDays: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}, {
    timestamps: true
});

export default mongoose.model('LeetCodeHeatmap', leetCodeHeatmapSchema);
