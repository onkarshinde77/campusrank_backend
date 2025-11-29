// server/src/utils/mongooseLogger.js

export const setupMongooseLogging = (mongoose) => {
  // Enable mongoose debugging in development
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', (coll, method, query, doc, options) => {
      console.log(`[MongoDB] ${coll}.${method}()`);
      if (Object.keys(query).length > 0) {
        console.log('Query:', JSON.stringify(query, null, 2));
      }
    });
  }

  // Connection events
  mongoose.connection.on('connected', () => {
    console.log('✓ Mongoose connected to MongoDB');
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️  Mongoose disconnected from MongoDB');
  });

  mongoose.connection.on('error', (error) => {
    console.error('❌ Mongoose connection error:', error);
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✓ Mongoose reconnected to MongoDB');
  });
};

// Query performance tracking plugin
export const queryPerformancePlugin = (schema) => {
  // Track query start time
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'], function() {
    this._startTime = Date.now();
  });

  // Log slow queries
  schema.post(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'], function() {
    if (this._startTime) {
      const duration = Date.now() - this._startTime;
      const slowThreshold = process.env.SLOW_QUERY_THRESHOLD || 100; // milliseconds

      if (duration > slowThreshold) {
        console.warn(`⚠️  Slow query detected: ${duration}ms`, {
          operation: this.getOptions().op || 'unknown',
          collection: this.collection?.name || 'unknown',
          query: this.getQuery?.() || this.getFilter?.() || 'N/A'
        });
      }
    }
  });

  // Track save operation
  schema.pre('save', function() {
    this._saveStartTime = Date.now();
  });

  schema.post('save', function() {
    if (this._saveStartTime) {
      const duration = Date.now() - this._saveStartTime;
      const slowThreshold = process.env.SLOW_QUERY_THRESHOLD || 100;

      if (duration > slowThreshold) {
        console.warn(`⚠️  Slow save detected: ${duration}ms`, {
          collection: this.collection?.name || 'unknown',
          _id: this._id
        });
      }
    }
  });
};

// Connection monitoring
export const setupConnectionMonitoring = (mongoose) => {
  setInterval(() => {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MongoDB Connection] Status: ${states[state] || 'unknown'}`);
    }
  }, 30000); // Check every 30 seconds
};

export default {
  setupMongooseLogging,
  queryPerformancePlugin,
  setupConnectionMonitoring
};
