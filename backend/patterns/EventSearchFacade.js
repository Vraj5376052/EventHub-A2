const Event = require('../models/Event');
const EventQueryBuilder = require('./EventQueryBuilder');

class EventSearchFacade {
  static async searchEvents({ category, keyword, sort = 'date' } = {}) {
    const pipeline = new EventQueryBuilder()
      .withCategory(category)
      .withKeyword(keyword)
      .sortedBy(sort)
      .build();

    return Event.aggregate(pipeline);
  }
}

module.exports = EventSearchFacade;
