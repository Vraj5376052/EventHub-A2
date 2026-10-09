# Postman collection

`EventHub-A2.postman_collection.json` covers every backend endpoint in the project, with
the error cases next to the successes rather than in a separate folder.

| Folder | Requests | Covers |
|---|---|---|
| 1. Authentication | 12 | register, login, profile, FR-01 baseline |
| 2. Events | 6 | create, browse, list own |
| 3. Bookings | 9 | book, list, cancel, refund preview (FR-01 to FR-03) |
| 4. Notifications | 8 | FR-09, US-4.1 and US-4.2 |
| 5. Audit trail | 8 | FR-10, NFR-04, US-4.3 |

43 requests in total. Every one has test assertions, so the whole collection can be run
with the Collection Runner and read as pass or fail.

## Running it

1. Import the file into Postman.
2. Set the `baseUrl` collection variable to `http://localhost:5001` for a local run, or to
   the deployed address.
3. Run the folders **in order**. The tests save the tokens and record ids that later
   folders need, so nothing has to be copied by hand between requests.

## The admin token

Three requests in folder 5 expect `200` and need an account with the `admin` role.

An admin cannot be registered through the API, and that is deliberate: `admin` is a valid
role on the `User` model because it reads the audit trail, but it is left out of the
whitelist in `registerUser`, so nobody can grant it to themselves. The request
"Register refuses the admin role" in folder 1 proves this.

To create one, insert the user directly in MongoDB:

```js
db.users.updateOne(
  { email: "admin@eventhub.test" },
  { $set: { role: "admin" } }
)
```

Then log in as that user and put the returned token in the `adminToken` collection
variable. The `401` and `403` requests in folder 5 run without it and are the ones that
demonstrate the access control.
