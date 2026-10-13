class EventQueryBuilder {
  constructor() {
    this.match = {
      status: 'published',
    };

    this.sort = 'date';
    this.timeframe = 'upcoming';
  }

  withCategory(category) {
    if (category && category.trim()) {
      this.match.category = category.trim().toLowerCase();
    }

    return this;
  }

  withKeyword(keyword) {
    if (keyword && keyword.trim()) {
      const safeKeyword = keyword
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      this.match.$or = [
        { title: { $regex: safeKeyword, $options: 'i' } },
        { venue: { $regex: safeKeyword, $options: 'i' } },
      ];
    }

    return this;
  }

  // Browsing is for events you can still book, so the date filter is applied
  // here rather than in the constructor. Reviews can only be left on an event
  // that has already started, which is why 'past' has to stay reachable.
  withTimeframe(when = 'upcoming') {
    const allowed = ['upcoming', 'past', 'all'];

    if (!allowed.includes(when)) {
      const error = new Error(
        'Invalid timeframe. Use upcoming, past, or all.'
      );

      error.statusCode = 400;
      throw error;
    }

    this.timeframe = when;

    if (when === 'upcoming') {
      this.match.startsAt = { $gte: new Date() };
    } else if (when === 'past') {
      this.match.startsAt = { $lt: new Date() };
    }

    return this;
  }

  sortedBy(sort = 'date') {
    const allowedSorts = ['date', 'price', 'seatsRemaining'];

    if (!allowedSorts.includes(sort)) {
      const error = new Error(
        'Invalid sort value. Use date, price, or seatsRemaining.'
      );

      error.statusCode = 400;
      throw error;
    }

    this.sort = sort;
    return this;
  }

  build() {
    const pipeline = [
      {
        $match: this.match,
      },
      {
        $addFields: {
          seatsRemaining: {
            $subtract: ['$capacity', '$bookedSeats'],
          },
        },
      },
    ];

    if (this.sort === 'date') {
      // Soonest first when looking forward, most recent first when looking back.
      pipeline.push({
        $sort: { startsAt: this.timeframe === 'past' ? -1 : 1 },
      });
    }

    if (this.sort === 'price') {
      pipeline.push({
        $sort: { price: 1, startsAt: 1 },
      });
    }

    if (this.sort === 'seatsRemaining') {
      pipeline.push({
        $sort: { seatsRemaining: -1, startsAt: 1 },
      });
    }

    return pipeline;
  }
}

module.exports = EventQueryBuilder;
