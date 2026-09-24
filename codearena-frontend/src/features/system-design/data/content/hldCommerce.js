// HLD content: Real-time + Commerce & payments.

export default {
  "hld-chat-app": {
    scenario:
      "Design a messaging app like WhatsApp. People chat one-to-one, see when messages are delivered and read, and get messages they missed while offline as soon as they reconnect.",
    requirements: ["Send and receive messages in real time", "Delivery and read receipts", "Messages sent while offline arrive later", "Chat history on the device and server"],
    constraints: ["500M daily users", "50B messages per day", "Message delivery under 200 ms when both users are online"],
    solution: {
      summary:
        "Clients hold a persistent WebSocket to a gateway; a session registry maps users to gateways; messages are stored per conversation and routed to the recipient's gateway or queued for push when they're offline.",
      parts: [
        ["WebSocket gateways", "Keep millions of long-lived connections."],
        ["Session registry (Redis)", "userId → gateway server currently holding their connection."],
        ["Chat service", "Validates, assigns a per-conversation sequence number, stores and routes messages."],
        ["Message store (Cassandra-like)", "Partitioned by conversationId, clustered by sequence."],
        ["Push notification service", "Wakes offline users' phones."],
      ],
      flow: [
        ["Alice's app", "Gateway A", "Send message (with a client message ID)"],
        ["Gateway A", "Chat service", "Forward; chat service assigns sequence number"],
        ["Chat service", "Message store", "Persist, then ack 'sent' to Alice"],
        ["Chat service", "Session registry", "Where is Bob connected?"],
        ["Chat service", "Gateway B → Bob", "Deliver; Bob's app acks → 'delivered' sent back to Alice"],
        ["Chat service", "Push service", "If Bob is offline: push notification; he syncs from his last sequence on reconnect"],
      ],
      decisions: [
        "Client message IDs make retries idempotent (no duplicate messages).",
        "Ordering is guaranteed per conversation via sequence numbers, not globally.",
        "Group chats: fan out to each member's gateway; very large groups use a pub/sub channel.",
      ],
    },
  },

  "hld-online-presence": {
    scenario:
      "Show a green dot next to contacts who are online and 'last seen 5 minutes ago' for those who aren't, in a messaging app. Phones often drop connection briefly on mobile networks.",
    requirements: ["Show online/offline for each contact", "Show last-seen time", "Update contacts within a few seconds of a change"],
    constraints: ["100M concurrent users", "Users have up to 5,000 contacts", "Flaky mobile connections"],
    solution: {
      summary:
        "Clients send heartbeats over their existing connection; a presence service stores last heartbeat time with a TTL and publishes changes only to contacts who are currently viewing that user.",
      parts: [
        ["Heartbeats", "Every ~30 s over the WebSocket."],
        ["Presence store (Redis)", "userId → lastSeen, with a TTL slightly longer than the heartbeat interval."],
        ["Presence service", "Detects online→offline (TTL expiry) and offline→online transitions."],
        ["Pub/sub channels", "presence:{userId}; subscribed by clients viewing that user."],
      ],
      flow: [
        ["App", "Gateway → Presence service", "Heartbeat"],
        ["Presence service", "Presence store", "Update lastSeen and refresh TTL"],
        ["Presence service", "Pub/sub", "On a state change only, publish presence:{userId}"],
        ["Contact's app", "Gateway", "Subscribed to users on screen → receives update"],
      ],
      decisions: [
        "Grace period before showing offline avoids flapping on brief disconnects.",
        "Subscribe only to users currently visible (open chat or contact list), not all 5,000 contacts.",
        "Presence is best-effort; small delays are fine.",
      ],
    },
  },

  "hld-live-comments": {
    scenario:
      "During a live cricket stream, viewers post comments that appear for everyone watching in near real time. The biggest matches have tens of millions of viewers at once.",
    requirements: ["Post a comment on a live stream", "See new comments within a few seconds", "Moderate abusive comments"],
    constraints: ["10M concurrent viewers on one stream", "Thousands of comments per second at peak", "Viewers can only read a few comments per second"],
    solution: {
      summary:
        "Comments go through moderation into a pub/sub channel per stream; a tier of edge WebSocket servers subscribes once per stream and fans out to their connected viewers, sampling when volume exceeds what anyone can read.",
      parts: [
        ["Comment API", "Validates, rate-limits per user."],
        ["Moderation filter", "Blocklist/ML check in the hot path; async deeper review."],
        ["Pub/sub (per stream)", "One channel per live stream."],
        ["Edge WebSocket servers", "Each holds ~100K viewers, subscribes to the stream channel once."],
        ["Comment store", "Persists comments for replay."],
      ],
      flow: [
        ["Viewer", "Comment API", "Post comment"],
        ["Comment API", "Moderation", "Reject or pass"],
        ["Comment API", "Pub/sub stream:123", "Publish"],
        ["Edge server", "Viewers", "Batch and push every ~500 ms, sampled to a readable rate"],
      ],
      decisions: [
        "Fan-out happens in two levels (pub/sub → edges → viewers) so no single server sends 10M messages.",
        "Sampling is a product decision: showing everything is unreadable anyway.",
        "A viewer always sees their own comment immediately, even if it's sampled out for others.",
      ],
    },
  },

  "hld-collaborative-editor": {
    scenario:
      "Design a document editor where several people can type in the same document at the same time and see each other's changes and cursors live, like Google Docs.",
    requirements: ["Multiple users edit one document simultaneously", "Everyone converges to the same content", "Show collaborators' cursors", "Version history"],
    constraints: ["Up to 50 editors per document", "Edits appear for others within ~100 ms", "Work must not be lost if someone disconnects"],
    solution: {
      summary:
        "Each open document is handled by one collaboration server; clients send operations over WebSockets, which the server orders and transforms (OT) or merges (CRDT) and broadcasts; the operation log is persisted and periodically snapshotted.",
      parts: [
        ["Collaboration service", "Document sessions assigned to a server by documentId (sticky routing)."],
        ["OT or CRDT engine", "Resolves concurrent edits so every copy converges."],
        ["Operation log", "Append-only list of operations with versions."],
        ["Snapshots", "Full document every N operations for fast loading and history."],
        ["Presence channel", "Cursor positions and selections (not persisted)."],
      ],
      flow: [
        ["Editor A", "Collab server", "Open doc: load latest snapshot + later ops"],
        ["Editor A", "Collab server", "Send op 'insert 'x' at 120' based on version 57"],
        ["Collab server", "OT engine", "Transform against ops since version 57, assign version 58"],
        ["Collab server", "Operation log", "Persist"],
        ["Collab server", "Other editors", "Broadcast transformed op; they apply it"],
      ],
      decisions: [
        "OT needs a central server to order ops; CRDTs work peer-to-peer and offline but carry more metadata.",
        "Sticky routing per document keeps one authoritative ordering point.",
        "Offline edits are sent as a batch of ops on reconnect and merged.",
      ],
    },
  },

  "hld-video-calling": {
    scenario:
      "Design a video calling product for team meetings: people join a meeting link and see and hear each other in real time, from browsers and phones on varying networks.",
    requirements: ["1:1 and group video calls", "Join via a link", "Mute, camera on/off, screen share", "Adapt to poor networks"],
    constraints: ["Meetings up to 100 people", "Audio/video latency under 300 ms", "Many users are behind strict firewalls/NAT"],
    solution: {
      summary:
        "WebRTC media with a signalling service to set up connections, STUN/TURN for NAT traversal, and Selective Forwarding Units (SFUs) that receive each participant's stream once and forward suitable qualities to others.",
      parts: [
        ["Signalling service (WebSocket)", "Exchanges session descriptions and ICE candidates; manages meeting membership."],
        ["STUN / TURN servers", "Discover public addresses; relay media when direct connection fails."],
        ["SFU media servers", "Forward streams without decoding; choose quality per receiver (simulcast)."],
        ["Meeting service", "Meeting links, permissions, recordings metadata."],
        ["Recording workers", "Join as hidden participants and write media to storage."],
      ],
      flow: [
        ["Participant", "Meeting service", "Join meeting via link"],
        ["Participant", "Signalling service", "Exchange SDP offer/answer with the assigned SFU"],
        ["Participant", "STUN/TURN", "Find a network path"],
        ["Participant", "SFU", "Send audio + video (several qualities)"],
        ["SFU", "Other participants", "Forward the quality each one can handle"],
      ],
      decisions: [
        "Mesh (everyone to everyone) only works for ~4 people; SFU scales to large calls cheaply.",
        "MCU mixes streams into one (less client bandwidth, much more server CPU).",
        "Audio is prioritised over video when bandwidth drops.",
      ],
    },
  },

  "hld-food-delivery": {
    scenario:
      "Design the backend for a food delivery app like Swiggy or Zomato: customers find nearby restaurants, order, pay, and track their food; restaurants accept orders; delivery partners pick them up and deliver.",
    requirements: ["Browse and search nearby restaurants and menus", "Place and pay for an order", "Restaurant accepts and prepares the order", "Assign a delivery partner and track the order live"],
    constraints: ["Millions of orders per day, 10x spike at dinner time", "Restaurant search under 200 ms", "Orders and payments must never be lost or duplicated"],
    solution: {
      summary:
        "Microservices around the order lifecycle, connected by events: a search service for discovery, an order service owning a state machine, payments, a dispatch service that assigns partners, and a tracking service for live location.",
      parts: [
        ["Restaurant & menu service", "Source of truth for restaurants, menus, availability."],
        ["Search service", "Geo-indexed (Elasticsearch/geohash) restaurant search with filters."],
        ["Cart & order service", "Order state machine: placed → accepted → preparing → picked up → delivered."],
        ["Payment service", "Talks to the payment gateway with idempotency keys."],
        ["Dispatch service", "Matches ready orders to nearby available partners."],
        ["Tracking service", "Partner locations and live updates to customers."],
        ["Event bus (Kafka)", "OrderPlaced, OrderAccepted, PartnerAssigned…"],
      ],
      flow: [
        ["Customer", "Search service", "Restaurants near me, open now"],
        ["Customer", "Order service", "Place order (idempotency key)"],
        ["Order service", "Payment service", "Charge; order becomes PLACED on success"],
        ["Order service", "Restaurant app (via events)", "New order → restaurant accepts, sets prep time"],
        ["Dispatch service", "Partner app", "Offer the order to the best nearby partner"],
        ["Partner app", "Tracking service → Customer", "Location updates shown on the map"],
      ],
      decisions: [
        "Events decouple services so a slow restaurant app doesn't block ordering.",
        "Start dispatch before food is ready (based on prep time) to cut delivery time.",
        "Scale search and menu reads with caches; the order path is protected with rate limits during peaks.",
      ],
    },
  },

  "hld-location-tracking": {
    scenario:
      "When a customer's order is out for delivery, they watch the delivery partner move on a map in real time. Operations teams also want to replay any delivery's route later.",
    requirements: ["Partners' apps send their GPS location", "Customers see their partner's live position", "Store route history for later replay"],
    constraints: ["300K active partners", "A location update every 4 seconds per partner", "Customer map updates within ~2 seconds"],
    solution: {
      summary:
        "Partner apps stream locations to an ingestion service; the latest position per partner lives in memory, updates are pushed to watching customers over WebSockets, and the full stream is written to cheap storage for history.",
      parts: [
        ["Location ingestion service", "Accepts batched GPS pings (~75K writes/sec)."],
        ["Latest-location store (Redis)", "partnerId → { lat, lng, ts }, plus a geo index for dispatch."],
        ["Location stream (Kafka)", "Every ping, for history and analytics."],
        ["History store", "Time-series / columnar storage partitioned by day."],
        ["Customer push service", "WebSocket or SSE to customers tracking an order."],
      ],
      flow: [
        ["Partner app", "Ingestion service", "Send location (batched if the network is poor)"],
        ["Ingestion service", "Redis", "Overwrite latest location"],
        ["Ingestion service", "Kafka", "Append the ping"],
        ["Push service", "Customer app", "Forward the new position for that order"],
        ["Kafka consumer", "History store", "Write for route replay"],
      ],
      decisions: [
        "Only the latest position is kept hot; history goes to cheap storage.",
        "Smooth or interpolate on the client so the icon moves nicely between updates.",
        "Adaptive ping rate (slower when the partner is stationary) saves battery and traffic.",
      ],
    },
  },

  "hld-ride-hailing": {
    scenario:
      "Design a ride-hailing app like Uber or Ola. A rider requests a ride from their location; the system finds a nearby driver who accepts, and both see each other's position until the trip ends and the rider pays.",
    requirements: ["Drivers share location while available", "Riders request a ride and get matched to a nearby driver", "Live tracking during pickup and trip", "Fare calculation and payment"],
    constraints: ["1M active drivers sending location every 4 s", "Match within a few seconds", "A driver must never get two trips at once"],
    solution: {
      summary:
        "A location service keeps drivers in a geospatial index; a matching service searches nearby cells, offers the trip to drivers one at a time with a lock on each, and a trip service owns the trip state machine and fare.",
      parts: [
        ["Location service", "Driver positions in an in-memory geo index (geohash / H3 cells)."],
        ["Matching service", "Finds candidate drivers in nearby cells, ranks by ETA."],
        ["Driver lock", "Atomic 'reserve driver' so two matchers can't assign the same driver."],
        ["Trip service", "requested → driver assigned → arriving → in trip → completed; persisted."],
        ["Pricing service", "Base fare, distance, time, surge multiplier per area."],
        ["Payment service", "Charges at trip end."],
      ],
      flow: [
        ["Driver app", "Location service", "Location every 4 s"],
        ["Rider app", "Trip service", "Request ride; get a fare estimate from Pricing"],
        ["Trip service", "Matching service", "Find drivers in nearby cells"],
        ["Matching service", "Driver lock → Driver app", "Reserve the best driver and send the offer (15 s timeout)"],
        ["Driver app", "Trip service", "Accept → trip assigned; otherwise release lock and try the next driver"],
        ["Trip service", "Payment service", "On completion, charge the rider"],
      ],
      decisions: [
        "Geo cells turn 'nearby' into a lookup of a few keys instead of a scan.",
        "Locking the driver is what prevents double assignment.",
        "Surge is computed per cell from demand vs supply over the last few minutes.",
      ],
    },
  },

  "hld-product-search": {
    scenario:
      "Shoppers on a large e-commerce site search for products by keywords, then narrow results by brand, price, rating and other filters. Results must be relevant and reflect current prices and stock.",
    requirements: ["Keyword search with typo tolerance", "Filters and facet counts (brand, price range, rating)", "Sort by relevance, price, popularity", "Reflect price/stock changes quickly"],
    constraints: ["200M products", "20K searches per second", "Results in under 200 ms"],
    solution: {
      summary:
        "Product data is the source of truth in the catalogue DB; change events feed an indexing pipeline into a sharded search engine that handles text relevance, filters and facets.",
      parts: [
        ["Catalogue service + DB", "Products, prices, stock."],
        ["Change events (CDC/Kafka)", "Emitted on every product, price or stock change."],
        ["Indexer", "Builds search documents and updates the index in near real time."],
        ["Search cluster (Elasticsearch)", "Sharded and replicated; inverted index + filterable fields."],
        ["Search API", "Parses the query, adds ranking signals, caches popular queries."],
      ],
      flow: [
        ["Seller", "Catalogue service", "Update price"],
        ["Catalogue service", "Kafka", "ProductUpdated event"],
        ["Indexer", "Search cluster", "Partial update of that document"],
        ["Shopper", "Search API", "q=running shoes&brand=Nike&price<5000"],
        ["Search API", "Search cluster", "Query + filters + aggregations for facets"],
      ],
      decisions: [
        "Search index is eventually consistent; the product page and checkout always read live price and stock.",
        "Ranking mixes text relevance with business signals (sales, rating, stock).",
        "Cache results for popular queries for a short TTL.",
      ],
    },
  },

  "hld-cart-checkout": {
    scenario:
      "Design the cart and checkout for an online store. Shoppers add items (logged in or not), then check out: the system confirms prices and stock, takes payment and creates the order.",
    requirements: ["Add/remove items in a cart, for guests and logged-in users", "Merge a guest cart after login", "Checkout: validate prices, reserve stock, pay, create order", "No double orders or double charges"],
    constraints: ["Carts must survive across devices for logged-in users", "Checkout can fail at any step", "High traffic during sales"],
    solution: {
      summary:
        "A cart service stores carts per user or guest token; checkout is an orchestrated saga (reserve stock → create pending order → pay → confirm) with idempotency keys and compensating steps on failure.",
      parts: [
        ["Cart service", "Carts in a fast store (Redis + DB backup), keyed by userId or guest token."],
        ["Checkout orchestrator", "Runs the saga steps and compensations."],
        ["Inventory service", "Reserves stock with an expiry."],
        ["Order service", "Creates PENDING orders, then CONFIRMED."],
        ["Payment service", "Charges with an idempotency key; handles webhooks."],
      ],
      flow: [
        ["Shopper", "Checkout orchestrator", "Checkout (idempotency key)"],
        ["Orchestrator", "Catalogue / pricing", "Re-validate prices and offers"],
        ["Orchestrator", "Inventory service", "Reserve items for 10 minutes"],
        ["Orchestrator", "Order service", "Create PENDING order"],
        ["Orchestrator", "Payment service", "Charge"],
        ["Orchestrator", "Order + Inventory", "Success: confirm order, commit stock. Failure: cancel order, release stock"],
      ],
      decisions: [
        "Distributed transactions across services are avoided; a saga with compensations is used instead.",
        "If payment status is unknown (timeout), the order stays PENDING until the gateway's webhook or a status poll resolves it.",
        "Idempotency key on checkout means a double-click creates one order.",
      ],
    },
  },

  "hld-flash-sale": {
    scenario:
      "An e-commerce site runs a flash sale: 1,000 phones at a huge discount go live at exactly 12:00, and millions of users are waiting to click Buy. The sale must be fair, must not oversell, and must not take down the rest of the site.",
    requirements: ["Sell exactly the available stock, never more", "Handle a massive spike at the start", "Fair first-come ordering", "Unpaid reservations return to stock"],
    constraints: ["2M users click within seconds", "1,000 units", "Rest of the site must stay up"],
    solution: {
      summary:
        "Throttle entry with a queue or token gate, keep sale stock in Redis and decrement it atomically, reserve units with a timeout, and process orders asynchronously, isolated from the main site.",
      parts: [
        ["CDN + static sale page", "Countdown and product info served without hitting servers."],
        ["Admission gate / virtual queue", "Lets users in at a rate the backend can handle; bots filtered (captcha, per-user limits)."],
        ["Stock counter (Redis)", "Atomic DECR (Lua) on sale stock; reject when it hits 0."],
        ["Reservation store", "userId → unit, expires in 5–10 minutes if not paid."],
        ["Order queue + workers", "Create orders and payments asynchronously."],
        ["Isolated sale service", "Separate deployment so the spike doesn't affect the main shop."],
      ],
      flow: [
        ["User", "Admission gate", "Click Buy; get a queue position or a token"],
        ["Sale service", "Redis", "Atomic decrement if stock > 0 and user hasn't bought"],
        ["Sale service", "Reservation store", "Hold the unit for 10 minutes"],
        ["User", "Payment", "Pay within the window"],
        ["Order workers", "Order DB", "Create the order; expired reservations increment stock back"],
      ],
      decisions: [
        "The database never sees 2M concurrent writes; Redis absorbs the contention.",
        "Per-user limit (1 unit) enforced in the same atomic script.",
        "Serving 'sold out' instantly from a cached flag once stock hits zero cuts load sharply.",
      ],
    },
  },

  "hld-payment-gateway": {
    scenario:
      "Design a payment gateway like Razorpay. Merchants integrate it to accept card, UPI and net-banking payments; the gateway talks to banks and card networks, tells merchants the result, and settles money to them.",
    requirements: ["Create a payment for a merchant order", "Support cards, UPI, net banking", "Notify merchants of results (webhooks)", "Settle funds to merchants; handle refunds"],
    constraints: ["Money must never be charged twice or lost", "Banks can be slow or not respond", "Strict security and compliance (PCI DSS)"],
    solution: {
      summary:
        "A payment service with an explicit state machine and idempotency keys, a router that sends each payment to the right bank/processor, a double-entry ledger, webhooks to merchants, and reconciliation against bank reports.",
      parts: [
        ["Merchant API", "Create order/payment with idempotency keys; authenticated with API keys."],
        ["Payment service", "created → authorized → captured / failed / refunded."],
        ["Tokenization vault", "Card data stored and handled in an isolated, PCI-compliant zone."],
        ["Router / processor adapters", "Pick the bank or network per method; retry or fail over."],
        ["Ledger", "Double-entry records for every money movement."],
        ["Webhook dispatcher", "Signed callbacks to merchants with retries."],
        ["Reconciliation jobs", "Match internal records to bank settlement files daily."],
      ],
      flow: [
        ["Merchant", "Merchant API", "Create payment (idempotency key)"],
        ["Customer", "Checkout page", "Enter card / approve UPI"],
        ["Payment service", "Router → Bank", "Authorize"],
        ["Payment service", "Ledger", "Record the state change and entries"],
        ["Webhook dispatcher", "Merchant", "payment.captured (signed)"],
        ["Reconciliation", "Bank files", "Fix any payment stuck in an unknown state"],
      ],
      decisions: [
        "If the bank times out, the payment is 'pending', never assumed failed; status polling and reconciliation resolve it.",
        "Idempotency keys make merchant retries safe.",
        "Everything touching raw card numbers is isolated to minimise PCI scope.",
      ],
    },
  },

  "hld-digital-wallet": {
    scenario:
      "Design a digital wallet like Paytm or PhonePe. Users add money from a bank, pay merchants, send money to friends, and see their balance and history. Balances must always be correct.",
    requirements: ["Add money, pay, transfer to another user", "Show balance and transaction history", "No negative balances, no double spending", "Full audit trail"],
    constraints: ["Tens of thousands of transactions per second", "A user may tap Pay twice or from two phones", "Regulators require complete records"],
    solution: {
      summary:
        "A double-entry ledger is the source of truth; each transfer is one ACID transaction that locks both wallets in a consistent order, checks the balance, and writes balanced debit/credit entries with an idempotency key.",
      parts: [
        ["Wallet service", "APIs for add, pay, transfer."],
        ["Ledger DB (relational, ACID)", "Accounts and entries; each transaction's debits equal its credits."],
        ["Balance column / materialised balance", "Updated in the same transaction for fast reads."],
        ["Idempotency store", "Request key → result, so retries return the original outcome."],
        ["Bank integration", "Top-ups via payment gateway; confirmed by webhook."],
        ["Reconciliation", "Daily check that ledger totals match the bank."],
      ],
      flow: [
        ["User", "Wallet service", "Transfer ₹500 to Bob (idempotency key)"],
        ["Wallet service", "Idempotency store", "Return the previous result if this key was seen"],
        ["Wallet service", "Ledger DB", "BEGIN; lock both accounts (lower ID first)"],
        ["Wallet service", "Ledger DB", "Check balance ≥ 500; insert debit and credit entries; update balances; COMMIT"],
        ["Wallet service", "Notification service", "Tell both users"],
      ],
      decisions: [
        "Never store only a balance: entries make every rupee traceable.",
        "Consistent lock order prevents deadlocks between opposite transfers.",
        "Shard by user; cross-shard transfers use a two-step saga with a holding account.",
      ],
    },
  },

  "hld-coupon-engine": {
    scenario:
      "The marketing team wants to create offers like 'FLAT100 on orders above ₹499', '20% off for new users, max ₹150', or 'first 10,000 users only'. At checkout, the app should apply valid coupons instantly and enforce all limits.",
    requirements: ["Create coupons with rules (min order, user segment, categories, dates)", "Validate and apply a coupon at checkout", "Enforce per-user and total usage limits", "Suggest the best coupon for a cart"],
    constraints: ["50K checkouts per minute during sales", "A limited coupon may be used by thousands at the same moment", "Validation under 50 ms"],
    solution: {
      summary:
        "Coupons are stored as rule definitions cached in memory for fast evaluation; usage limits are enforced with atomic counters and reserved at checkout, then committed or released with the order.",
      parts: [
        ["Admin service", "Create and schedule coupons."],
        ["Rules engine", "Evaluates eligibility conditions against the cart and user."],
        ["Coupon cache", "Active coupons loaded in memory."],
        ["Usage counters (Redis)", "Global and per-user redemptions, decremented atomically."],
        ["Redemptions table", "Durable record tied to the order."],
      ],
      flow: [
        ["Checkout", "Coupon service", "Apply 'FLAT100' to this cart"],
        ["Coupon service", "Rules engine", "Check dates, min order, user segment, categories"],
        ["Coupon service", "Redis", "Atomically reserve one use (global + per user)"],
        ["Order service", "Coupon service", "Order paid → commit redemption; failed → release"],
      ],
      decisions: [
        "Reserve-then-commit prevents a limited coupon being over-redeemed during concurrent checkouts.",
        "Rules as data (not code) let marketing launch offers without deployments.",
        "Stacking rules define which coupon types can combine.",
      ],
    },
  },

  "hld-movie-booking": {
    scenario:
      "Design a movie ticket booking system like BookMyShow. Users pick a movie, theatre and show, choose seats on a seat map, pay, and get tickets. When tickets for a big release open, huge numbers of people try to book at once.",
    requirements: ["Browse movies, theatres, shows", "View live seat availability", "Hold chosen seats while paying", "Confirm booking after payment; release seats if payment fails"],
    constraints: ["Two users must never book the same seat", "Blockbuster openings: millions of users in minutes", "Seat holds expire after ~10 minutes"],
    solution: {
      summary:
        "Seats per show are locked with short-lived holds (Redis SET NX with TTL or a DB row with status/expiry); booking confirms the held seats after payment in a transaction, and expired holds free the seats automatically.",
      parts: [
        ["Catalogue service", "Movies, theatres, screens, shows (heavily cached)."],
        ["Seat inventory service", "Seat status per show: available / held / booked."],
        ["Seat hold store", "hold:{showId}:{seatId} → userId with a 10-minute TTL."],
        ["Booking service", "Creates booking, talks to payment, confirms seats."],
        ["Virtual waiting room", "For blockbuster openings."],
      ],
      flow: [
        ["User", "Seat inventory", "Get seat map for show 55"],
        ["User", "Seat inventory", "Hold seats A5, A6"],
        ["Seat inventory", "Hold store", "SET NX each seat with TTL; if any fails, release the others"],
        ["User", "Booking service → Payment", "Pay"],
        ["Booking service", "Seat DB", "Transaction: mark A5, A6 booked only if held by this user"],
        ["Hold expiry", "Seat inventory", "Unpaid holds expire; seats become available"],
      ],
      decisions: [
        "Holds make seat selection feel instant while the DB only sees confirmed bookings.",
        "All-or-nothing holds so a user doesn't end up with half their seats.",
        "Seat maps are read-heavy: cache and push updates only for changed seats.",
      ],
    },
  },

  "hld-hotel-booking": {
    scenario:
      "Design a hotel booking platform like MakeMyTrip. Travellers search hotels in a city for their dates, see prices and availability, and book rooms. Hotels also sell the same rooms on other websites.",
    requirements: ["Search hotels by city, dates and guests", "See room types with price and availability", "Book and pay; cancel per policy", "Keep availability in sync with other sales channels"],
    constraints: ["Searches outnumber bookings 100:1", "Double-booking the last room is costly", "Inventory changes from external channels"],
    solution: {
      summary:
        "Inventory is stored per hotel per room type per date; search reads cached availability, while booking checks and decrements every night of the stay in one transaction, and a channel manager syncs external changes.",
      parts: [
        ["Hotel catalogue", "Hotels, room types, photos, policies."],
        ["Inventory table", "(hotelId, roomTypeId, date) → total, booked; versioned."],
        ["Search service", "Index + availability cache for fast date-range queries."],
        ["Booking service", "Reserves inventory, handles payment, confirmations, cancellations."],
        ["Channel manager integration", "Pushes/pulls availability to other sites."],
      ],
      flow: [
        ["Traveller", "Search service", "Goa, 3–6 Oct, 2 guests"],
        ["Search service", "Availability cache", "Hotels with a room type available every night"],
        ["Traveller", "Booking service", "Book room type X"],
        ["Booking service", "Inventory DB", "Transaction: for each night check booked < total, increment booked"],
        ["Booking service", "Payment → Channel manager", "Confirm, then push updated availability out"],
      ],
      decisions: [
        "Optimistic locking (version column) on inventory rows handles concurrent bookings.",
        "Search can be slightly stale; booking always checks live inventory.",
        "Small controlled overbooking is a business policy, not a bug, for some hotels.",
      ],
    },
  },

  "hld-stock-exchange": {
    scenario:
      "Design the order system for a stock broker like Zerodha: users place buy and sell orders, orders are checked against their funds, sent for matching, and users see live prices and their order status.",
    requirements: ["Place, modify and cancel orders", "Risk checks (funds, limits) before sending", "Match buy and sell orders fairly", "Stream live prices and order updates"],
    constraints: ["Order volume jumps 50x at market open", "Matching latency in microseconds to milliseconds", "Every order must be processed exactly once and in sequence"],
    solution: {
      summary:
        "Orders pass through a risk service, are sequenced into an ordered log, and processed by an in-memory matching engine per instrument using price-time priority; results flow back as events and market data is fanned out to clients.",
      parts: [
        ["Order gateway", "Validates and authenticates orders."],
        ["Risk service", "Checks margin, holdings and limits; blocks funds."],
        ["Sequencer", "Assigns a global sequence number; writes to a durable log."],
        ["Matching engine", "In-memory order book per symbol: buy side (highest first), sell side (lowest first)."],
        ["Execution / trade events", "Fills sent to users, ledger and clearing."],
        ["Market data service", "Order book and price updates fanned out via WebSockets."],
      ],
      flow: [
        ["User", "Order gateway", "Buy 10 INFY at ₹1,500 limit"],
        ["Order gateway", "Risk service", "Check and block funds"],
        ["Risk service", "Sequencer", "Append to the ordered log"],
        ["Matching engine", "Order book", "Match against best sell orders; partial or full fill"],
        ["Matching engine", "Trade events", "Emit fills; update user positions and ledger"],
        ["Market data service", "Clients", "Broadcast new last price and depth"],
      ],
      decisions: [
        "Single-threaded matching per symbol avoids locks and guarantees ordering.",
        "The engine rebuilds its state by replaying the log after a crash.",
        "Market data uses conflation: clients get the latest snapshot, not every tick.",
      ],
    },
  },

  "hld-recommendation": {
    scenario:
      "An online store wants a 'Recommended for you' row on the home page and 'Customers also bought' on product pages. Recommendations should feel personal and change as users browse.",
    requirements: ["Personalised home recommendations", "Similar / frequently-bought-together products", "React to recent browsing", "Handle new users and new products"],
    constraints: ["100M users, 10M products", "Home page recommendations in under 100 ms"],
    solution: {
      summary:
        "Offline pipelines train models and precompute candidates; at request time a serving layer fetches candidates, ranks them with fresh user features, filters, and returns the top N.",
      parts: [
        ["Event collection", "Views, clicks, carts, purchases streamed to a data lake."],
        ["Offline training", "Collaborative filtering / embeddings; co-purchase statistics."],
        ["Candidate store", "Precomputed candidates per user and per product."],
        ["Feature store", "User and product features, including recent activity (online)."],
        ["Ranking service", "Scores candidates with a model, applies business rules (in stock, not purchased)."],
      ],
      flow: [
        ["App", "Recommendation API", "Home recommendations for user 42"],
        ["Recommendation API", "Candidate store", "Fetch ~500 candidates"],
        ["Recommendation API", "Feature store", "Get user's recent views and product features"],
        ["Ranking service", "Model", "Score and sort; filter out-of-stock and duplicates"],
        ["Event stream", "Feature store", "Recent clicks update features within seconds"],
      ],
      decisions: [
        "Two stages (cheap candidate generation, expensive ranking) keep latency low.",
        "Cold start: popular/trending items for new users; content similarity for new products.",
        "Cache results per user for a few minutes.",
      ],
    },
  },

  "hld-ad-click-aggregation": {
    scenario:
      "An ad platform bills advertisers per click. Each ad click is logged, and advertisers see click counts per ad per minute on a dashboard. Counts are used for billing, so they must be accurate and auditable.",
    requirements: ["Record every ad click", "Aggregate clicks per ad per minute", "Dashboards query recent and historical counts", "Filter out duplicate and fraudulent clicks"],
    constraints: ["1B clicks per day, 50K per second at peak", "Dashboard data within a minute", "Billing numbers must be exact"],
    solution: {
      summary:
        "Clicks flow into Kafka, a stream processor deduplicates and aggregates them into per-minute windows with exactly-once semantics, results go to an OLAP store, and a daily batch job recomputes from raw logs to reconcile billing.",
      parts: [
        ["Click logger", "Redirect endpoint that records the click with a unique click ID."],
        ["Kafka", "Durable click stream, partitioned by adId."],
        ["Stream aggregator (Flink)", "Dedupes by click ID, tumbling 1-minute windows, handles late events with watermarks."],
        ["OLAP store", "Per-ad per-minute counts for dashboards."],
        ["Raw click archive", "All raw events in cheap storage."],
        ["Batch reconciliation", "Recomputes daily totals for billing and corrects drift."],
      ],
      flow: [
        ["User", "Click logger", "Click an ad"],
        ["Click logger", "Kafka", "Publish click event; redirect the user"],
        ["Aggregator", "Kafka", "Consume, dedupe, count per ad per minute"],
        ["Aggregator", "OLAP store", "Write window results (transactional sink)"],
        ["Daily batch", "Raw archive → Billing", "Recompute and reconcile"],
      ],
      decisions: [
        "Streaming for freshness, batch for correctness (lambda-style).",
        "Exactly-once via Kafka transactions and idempotent writes keyed by (adId, minute).",
        "Partition by adId to keep aggregation local; hot ads get sub-partitions.",
      ],
    },
  },
};
