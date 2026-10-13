class EventQueryBuilder {
  constructor() {
    this.match = {
      status: 'published',
    };

    this.sort = 'date';
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
      pipeline.push({
        $sort: { startsAt: 1 },
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
