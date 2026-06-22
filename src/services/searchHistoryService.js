const searchHistoryService = {
  getMyHistory: async () => {
    return {
      data: {
        code: 1000,
        result: []
      }
    };
  },

  deleteHistory: async () => {
    return {
      data: {
        code: 1000,
        result: true
      }
    };
  },

  clearAllHistory: async () => {
    return {
      data: {
        code: 1000,
        result: true
      }
    };
  }
};

export default searchHistoryService;