// server/src/utils/pagination.js

// Helper function to calculate pagination metadata
export const calculatePaginationMetadata = (page, limit, total) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;
  const totalPages = Math.ceil(total / limitNum);

  return {
    page: pageNum,
    limit: limitNum,
    skip,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  };
};

// Pagination middleware
export const paginationMiddleware = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Validate and sanitize
  req.pagination = {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    skip: Math.max(1, page - 1) * Math.min(100, Math.max(1, limit))
  };

  next();
};

// Format paginated response
export const formatPaginatedResponse = (data, page, limit, total) => {
  const metadata = calculatePaginationMetadata(page, limit, total);

  return {
    success: true,
    data,
    pagination: {
      page: metadata.page,
      limit: metadata.limit,
      total: metadata.total,
      totalPages: metadata.totalPages,
      hasNext: metadata.hasNext,
      hasPrev: metadata.hasPrev
    }
  };
};

// Helper for query pagination
export const applyPagination = (query, page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  return query.skip(skip).limit(limitNum);
};

export default {
  calculatePaginationMetadata,
  paginationMiddleware,
  formatPaginatedResponse,
  applyPagination
};
