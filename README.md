# EventHub

An event ticket booking system built for IFN636 Assessment 1.

Small event organisers (uni clubs, local venues) usually sell tickets with a Facebook post and a spreadsheet, which means nobody has an authoritative count of remaining seats and events get oversold. EventHub makes the system hold the seat count and enforces the limit at the moment of booking, so overselling can't happen rather than just being discouraged.

**Live:** http://13.238.141.88:3000

---

## Roles

Two roles, chosen at sign up and enforced on the server.

| | Customer | Organiser |
|---|---|---|
| Register and log in | Yes | Yes |
| Browse published events | Yes | Yes, read only |
| Book tickets | Yes | No, gets 403 |
| Create an event | No, gets 403 | Yes |
| View own events | No | Yes, own only |

The interface hides the options you can't use, but that's just tidiness. The real check is `requireRole` on the server, so calling the API directly still gets refused.

---

## Stack

- React 18 frontend
- Node 22 and Express backend
- MongoDB Atlas
- JWT for auth, bcrypt for passwords
- Runs on EC2 with `npm start`, the frontend on port 3000 and the API on port 5001

---

## Running it locally

You'll need Node 20 or later and a MongoDB Atlas connection string.

```bash
git clone https://github.com/Vraj5376052/EventHub.git
cd EventHub
npm run install-all
```

Create `backend/.env`:

```
MONGO_URI=your-atlas-connection-string
JWT_SECRET=any-long-random-string
PORT=5001
```

When upgrading a database that already contains reviews, stop the backend and run this once before starting the new version:

```bash
cd backend
npm run migrate:review-customer-id
```

This moves existing review ownership from `reviewerId` to `customerId` and replaces the old unique index. The command is safe to rerun.

Then:

```bash
npm start
```

Frontend runs on http://localhost:3000, backend on http://localhost:5001.

Add your own IP to the Atlas network allowlist or the backend won't connect.

---

## Architecture

A request goes through these layers:

```
React page
  sends the request with the login token attached
server.js
  picks the route file for the URL
routes/
  lists the URLs and who is allowed to call them
middleware/authMiddleware.js
  protect      are you logged in?      401 if not
  requireRole  are you allowed?        403 if not
controllers/
  validates the input, then does the work
models/
  the shape of the data in MongoDB
MongoDB Atlas
```

```
backend/
  models/       User.js, Event.js, Booking.js
  controllers/  authController.js, eventController.js, bookingController.js
  routes/       authRoutes.js, eventRoutes.js, bookingRoutes.js
  middleware/   authMiddleware.js
  server.js
frontend/src/
  pages/        Login, Register, BrowseEvents, CreateEvent, MyEvents
  components/   Navbar
  context/      AuthContext
  axiosConfig.jsx
```

### How booking avoids overselling

This is the part worth reading. The obvious way to book a seat is to read the current count, check there's room, then save the new number. That leaves a gap between the check and the save, and two people booking at the same moment both pass the check and both save, which oversells the event.

Instead the check and the increment happen in one database operation:

```js
const event = await Event.findOneAndUpdate(
  { _id: eventId,
    status: 'published',
    $expr: { $lte: [{ $add: ['$bookedSeats', qty] }, '$capacity'] } },
  { $inc: { bookedSeats: qty } },
  { new: true }
);
```

The capacity guard is part of the query rather than a check that runs first. MongoDB applies a single document update completely or not at all, so only one request can take the last seat. If the guard fails nothing matches, `null` comes back, no seats were taken and there's nothing to undo.

Checked with 50 booking requests fired at the same time against a 10 seat event. 10 succeeded, 40 were rejected, and the stored count was 10.

Seats remaining is always worked out as `capacity - bookedSeats`. It's never stored on its own, so the two numbers can't disagree.

---

## Deploying

There's no CI/CD, it's deliberately out of scope for this assessment. This is the manual procedure.

1. Start the EC2 instance and note the public IPv4 address
2. In the security group, add inbound rules for SSH (22), Custom TCP (3000) and Custom TCP (5001), each set to your own IP. The unit's AWS account deletes any rule with a source of `0.0.0.0/0` automatically, so every rule has to name a specific address
3. On the instance, run `sudo apt update && sudo apt upgrade`, then install git, Node.js and npm
4. Clone the repo
5. Create `backend/.env` directly on the server. It's gitignored and never committed.
6. Add the instance's IP to the MongoDB Atlas network allowlist
7. Create `frontend/.env` on the server so the browser knows where the API is:
   ```
   REACT_APP_API_URL=http://YOUR-IP:5001
   ```
   Without this the browser falls back to `localhost:5001`, which means the visitor's own machine, so the page loads and nothing works.
8. Install dependencies and start both processes together:
   ```bash
   cd ~/EventHub
   npm run install-all
   npm start
   ```
9. Open `http://YOUR-IP:3000` in a browser
10. Test both workflows from a network other than the one you developed on

**Step 7 matters.** It is the single most common reason a deployed copy of this app loads but does nothing.

**`npm start` runs in the foreground.** Closing the terminal stops the application, so it has to be started again after any restart of the instance.

### Ports

| Port | Open to | Why |
|---|---|---|
| 22 | Specific IPs | Admin access over SSH |
| 3000 | Specific IPs | Serves the page |
| 5001 | Specific IPs | The browser calls the API directly, so this cannot be closed |

Nothing is open to `0.0.0.0/0`, and nothing can be: the unit's AWS account runs a policy that deletes such rules within seconds of them being created. Access is granted per address instead, and the EC2 instance ID is supplied so the teaching team can reach the instance through the account.



### If the IP changes

No Elastic IP was available on the shared student account, and the instance is stopped automatically outside teaching hours, so the address does change. Recovery is:

1. Start the instance and note the new public IPv4 address
2. Re-select **My IP** on all three inbound rules
3. Update `REACT_APP_API_URL` in `frontend/.env` to the new address
4. `npm start` again

About five minutes. The MongoDB Atlas allowlist accepts any address, so it does not need updating.

---

## What isn't built

These are designed and sitting in the backlog, not forgotten. The brief asks for one complete workflow in code, so the effort went into making booking correct rather than half building several features.

| | Why not |
|---|---|
| View my bookings (EH-12) | Deferred, decision DL-06 |
| Cancel a booking (EH-13) | Deferred, decision DL-06 |
| Automated test suite (EH-14) | Dropped, decision DL-08. Concurrency was verified with a script instead. |
| Edit an event (EH-17) | Backlog |
| Publish and unpublish (EH-18) | Backlog |
| Cancel an event (EH-19) | Backlog |
| Attendee list (EH-20) | Backlog |
| Payments | Out of scope. The problem is seat counting, not taking money. |
| Assigned seating, notifications, waitlists, QR check in | Out of scope |

Other known limitations:

- The "My Bookings" link shows in the customer navigation but the page isn't built.
- Access is restricted to named source addresses, so the site is not reachable from an arbitrary network. This is a constraint of the unit's AWS account, not a choice.
- The instance has no Elastic IP, so the public address changes whenever it restarts, and `frontend/.env` has to be updated when it does.
- `npm start` runs in the foreground, so the application stops when the session that launched it ends.

---

## Links

| | |
|---|---|
| Live app | http://13.238.141.88:3000 |
| EC2 instance | `i-0c5b45be3f12330e3`, ap-southeast-2 |
| Repo | https://github.com/Vraj5376052/EventHub |

Built by Vraj Patel (n11820349) for IFN636 Software Life Cycle Management, Semester 2 2026.
