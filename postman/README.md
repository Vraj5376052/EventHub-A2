# Postman collection

`EventHub-A2.postman_collection.json` covers every backend endpoint in the project, across
all four member features, with the error cases sitting next to the successes rather than in
a separate folder.

| Folder | Requests | Covers |
|---|---|---|
| 1. Authentication | 12 | register, login, get and update profile (Assessment 1 baseline) |
| 2. Events | 13 | create, browse, search, filter, sort, list own (FR-04, FR-05, FR-06, FR-11) |
| 3. Bookings | 9 | book, list, cancel, refund preview (FR-01 to FR-03) |
| 4. Reviews | 7 | leave a review, list reviews and average rating (FR-07, FR-08) |
| 5. Notifications | 8 | list mine, mark one read, mark all read (FR-09) |
| 6. Audit trail | 8 | read trail, filter, paging, write and delete refused (FR-10, NFR-04) |

57 requests and 102 assertions in total. Every request has assertions, so the whole
collection can be run with the Collection Runner, or with Newman, and read as pass or fail.

## Running it

1. Seed the two fixtures the API will not create for itself (see below).
2. Import the file into Postman.
3. Set the `baseUrl` collection variable to `http://localhost:5001` for a local run, or to
   the deployed address.
4. Run the folders **in order**. The tests save the tokens and record ids that later folders
   need, so nothing has to be copied by hand between requests.

From the command line:

```
newman run postman/EventHub-A2.postman_collection.json --env-var baseUrl=http://localhost:5001
```

## Seeding the fixtures

Two things the API deliberately refuses to create are needed before the collection will pass
end to end.

**An admin account.** `admin` is a valid role on the `User` model because it reads the audit
trail (FR-10), but it is left out of the whitelist in `registerUser` so nobody can grant it
to themselves. The request "Register refuses the admin role" in folder 1 proves this, which
is why the account has to come from outside the API.

**A reviewable event.** A review is only accepted once the event has finished and only from a
customer holding a confirmed booking, but `createEvent` refuses a start date in the past. So
the past event and its booking are seeded too.

`backend/scripts/seedDemoFixtures.js` creates all of it against whichever database
`MONGO_URI` points at, and prints the ids the collection needs. It matches on email and on
the pair of ids, so running it a second time updates rather than duplicates.

```
cd backend
node scripts/seedDemoFixtures.js
```

It creates `admin@eventhub.test`, `seed.organiser@eventhub.test` and
`reviewer@eventhub.test`. No password is stored in the script: set `SEED_PASSWORD` to choose
one, or let it generate a random one and print it once.

Then set these collection variables:

| Variable | Value |
|---|---|
| `reviewerEmail` | `reviewer@eventhub.test` |
| `seedPassword` | whatever the script used |
| `seedEventId` | the past event id the script prints |
| `adminToken` | see below |

For `adminToken`, log in once as the seeded admin and copy the token out of the response:

```
POST {{baseUrl}}/api/auth/login
{ "email": "admin@eventhub.test", "password": "<the seed password>" }
```

The admin login is not a request in the collection on purpose. The collection is what a
marker runs, and it should not carry an administrator credential in a committed file.

The `401` and `403` requests in folder 6 run without the admin token and are the ones that
demonstrate the access control, so they pass either way.

## Rerunning

The Reviews folder leaves a review behind, and one review per customer per event is enforced
by a unique index. A second full run therefore answers `409` on "Leave a review" where the
first answered `201`. Reseed, or clear that review, before repeating a full run.
