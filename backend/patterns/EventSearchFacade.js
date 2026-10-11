const Event = require('../models/Event');

const escapeRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class EventSearchFacade {
  static async searchEvents({ category, keyword, sort = 'date' } = {}) {
    const allowedSorts = ['date', 'price', 'seatsRemaining'];

    if (!allowedSorts.includes(sort)) {
      const error = new Error(
        'Invalid sort value. Use date, price, or seatsRemaining.'
      );
      error.statusCode = 400;
      throw error;
    }

    const match = {
      status: 'published',
    };

    if (category && category.trim()) {
      match.category = category.trim().toLowerCase();
    }

    if (keyword && keyword.trim()) {
      const safeKeyword = escapeRegex(keyword.trim());

      match.$or = [
        { title: { $regex: safeKeyword, $options: 'i' } },
        { venue: { $regex: safeKeyword, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          seatsRemaining: {
            $subtract: ['$capacity', '$bookedSeats'],
          },
        },
      },
    ];

    if (sort === 'date') {
      pipeline.push({
        $sort: { startsAt: 1 },
      });
    }

    if (sort === 'price') {
      pipeline.push({
        $sort: { price: 1, startsAt: 1 },
      });
    }

    if (sort === 'seatsRemaining') {
      pipeline.push({
        $sort: { seatsRemaining: -1, startsAt: 1 },
      });
    }

    return Event.aggregate(pipeline);
  }
}

module.exports = EventSearchFacade;
