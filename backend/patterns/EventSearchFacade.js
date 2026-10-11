const Event = require('../models/Event');

class EventSearchFacade {
  static async searchPublishedEvents() {
    return Event.find({ status: 'published' }).sort({ startsAt: 1 });
  }
}

module.exports = EventSearchFacade;
