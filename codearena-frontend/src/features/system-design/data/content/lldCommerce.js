// LLD content: Booking & commerce.

export default {
  "lld-splitwise": {
    scenario:
      "Build an expense-sharing app like Splitwise. Friends add shared expenses, split equally, by exact amounts or by percentage, and see who owes whom. The app can suggest the fewest payments to settle up.",
    requirements: ["Add users and groups", "Add an expense paid by one user, split among several", "Equal, exact and percentage splits", "Show balances; settle up; simplify debts"],
    constraints: ["Exact splits must add up to the total; percentages to 100", "Rounding must not lose or create money", "New split types should be easy to add"],
    solution: {
      summary:
        "Expenses hold a list of Splits created by a split strategy per type; a balance sheet tracks net amounts between users; debt simplification works on each user's net balance.",
      parts: [
        ["User, Group", "Members of an expense group."],
        ["Expense", "paidBy, amount, splits, description, date."],
        ["Split (abstract) → EqualSplit, ExactSplit, PercentSplit", "user + amount owed."],
        ["SplitStrategy / validator per type", "Computes and validates splits; puts rounding remainder on one person."],
        ["BalanceSheet", "Map<userA, Map<userB, amount>> of who owes whom."],
        ["DebtSimplifier", "Greedy: match largest creditor with largest debtor using net balances."],
        ["ExpenseService", "addExpense, getBalances, settleUp."],
      ],
      flow: [
        ["User", "ExpenseService.addExpense(paidBy, 900, EQUAL, [A, B, C])", "Pick strategy"],
        ["SplitStrategy", "Splits", "300 each; validate total"],
        ["ExpenseService", "BalanceSheet", "Each non-payer owes the payer their split"],
        ["User", "DebtSimplifier.simplify(group)", "Net per user → minimal list of payments"],
      ],
      decisions: [
        "Strategy/factory per split type = Open/Closed.",
        "Use paise (integers), not floating point, for money.",
        "Net balances make simplification a clean greedy algorithm.",
      ],
    },
  },

  "lld-movie-booking": {
    scenario:
      "Design the classes for a movie ticket booking app. Theatres have screens with seat layouts; shows are scheduled on screens; users pick seats, which are held while they pay, then booked.",
    requirements: ["Movies, theatres, screens, seats, shows", "Show the seat map for a show with availability", "Hold selected seats during payment", "Confirm or cancel a booking; price by seat category"],
    constraints: ["Two users can never book the same seat for the same show", "Held seats are released after 10 minutes if unpaid", "Pricing rules may change (weekend, premium seats)"],
    solution: {
      summary:
        "Seat availability is tracked per show (not per seat), a SeatLockProvider handles timed holds atomically, and BookingService coordinates holds, pricing and payment.",
      parts: [
        ["Movie, Theatre, Screen, Seat", "Static catalogue; Seat has row, number, category."],
        ["Show", "movie, screen, startTime."],
        ["ShowSeat", "show + seat + status (AVAILABLE, LOCKED, BOOKED)."],
        ["SeatLockProvider (interface)", "lock(show, seats, user, ttl), unlock, isLockedBy; in-memory impl with timestamps."],
        ["PricingStrategy", "Price by category, day, time."],
        ["Booking", "id, user, show, seats, amount, status."],
        ["BookingService", "createBooking, confirm, cancel."],
      ],
      flow: [
        ["User", "BookingService.createBooking(show, [A5, A6])", "Request"],
        ["BookingService", "SeatLockProvider.lock", "Atomically lock all seats or fail"],
        ["BookingService", "PricingStrategy", "Calculate amount; create PENDING booking"],
        ["Payment", "BookingService.confirm(booking)", "Seats still locked by this user? → BOOKED"],
        ["Timer", "SeatLockProvider", "Expired locks released"],
      ],
      decisions: [
        "ShowSeat separates the physical seat from its per-show state.",
        "Lock provider behind an interface so it can become Redis later.",
        "All-or-nothing locking with a synchronised block or per-show lock.",
      ],
    },
  },

  "lld-food-ordering": {
    scenario:
      "Design the classes for a food ordering app like Zomato: customers browse restaurants and menus, add items to a cart from one restaurant, place orders, and track them; restaurants and delivery partners update the order.",
    requirements: ["Restaurants with menus and availability", "Cart with items from one restaurant", "Place an order and track its status", "Assign a delivery partner; rate the order"],
    constraints: ["Order status only moves forward along valid transitions", "Partner assignment rule should be swappable", "Menu items can go out of stock"],
    solution: {
      summary:
        "Restaurant, Menu and Cart model browsing; Order owns a state machine; a delivery assignment strategy picks partners; observers notify customers of status changes.",
      parts: [
        ["Restaurant, Menu, MenuItem", "Items with price and availability."],
        ["Cart", "Items from one restaurant; clearing when switching restaurants."],
        ["Order", "items (price snapshot), total, status, customer, partner."],
        ["OrderStatus (state)", "PLACED → ACCEPTED → PREPARING → PICKED_UP → DELIVERED; CANCELLED."],
        ["DeliveryPartner", "location, availability."],
        ["AssignmentStrategy", "NearestAvailablePartner, HighestRated…"],
        ["OrderService", "placeOrder, updateStatus, assignPartner."],
      ],
      flow: [
        ["Customer", "OrderService.placeOrder(cart)", "Validate items available; snapshot prices"],
        ["OrderService", "PaymentService", "Pay → Order PLACED"],
        ["Restaurant", "OrderService.updateStatus(ACCEPTED)", "Check valid transition"],
        ["OrderService", "AssignmentStrategy", "Pick a partner; notify"],
        ["OrderService", "Observers", "Push each status change to the customer"],
      ],
      decisions: [
        "Snapshot prices in the order so later menu changes don't alter it.",
        "State pattern/transition table prevents illegal status jumps.",
        "Strategy for assignment keeps dispatch logic replaceable.",
      ],
    },
  },

  "lld-cab-booking": {
    scenario:
      "Design the classes for a cab booking app: riders request a ride between two locations, the system finds a driver, the driver accepts, the trip happens, and the fare is calculated and paid.",
    requirements: ["Riders and drivers with locations", "Request a ride; match a driver", "Trip lifecycle and cancellation", "Fare calculation with surge"],
    constraints: ["A driver can have only one active trip", "Matching and pricing rules should be swappable", "Cancellation fee after driver acceptance"],
    solution: {
      summary: "A TripService coordinates a matching strategy and a fare strategy; Trip is a state machine; drivers are marked busy atomically when assigned.",
      parts: [
        ["Rider, Driver", "Driver has location, vehicle, status (AVAILABLE, ON_TRIP), rating."],
        ["Location", "lat, lng; distance()."],
        ["Trip", "rider, driver, pickup, drop, status, fare."],
        ["TripStatus", "REQUESTED → DRIVER_ASSIGNED → STARTED → COMPLETED; CANCELLED."],
        ["DriverMatchingStrategy", "NearestDriver, BestRatedNearby."],
        ["FareStrategy", "Base + per km + per min × surge."],
        ["TripService", "requestRide, accept, start, end, cancel."],
      ],
      flow: [
        ["Rider", "TripService.requestRide(pickup, drop)", "Create Trip REQUESTED"],
        ["TripService", "DriverMatchingStrategy", "Candidate drivers sorted by suitability"],
        ["TripService", "Driver", "Atomically set AVAILABLE → ON_TRIP; offer trip"],
        ["Driver", "TripService.start / end", "Status transitions"],
        ["TripService", "FareStrategy", "Compute fare on end; charge rider; driver AVAILABLE again"],
      ],
      decisions: [
        "Compare-and-set on driver status prevents double assignment.",
        "Strategies for matching and fares.",
        "Shared rides become a Trip with multiple riders and stops.",
      ],
    },
  },

  "lld-shopping-cart": {
    scenario:
      "Build the cart and pricing logic for an online store. Shoppers add products with quantities, and the cart shows the total after applying offers such as flat discounts, percentage off, and 'buy 2 get 1 free'.",
    requirements: ["Add, update, remove items", "Apply product-level and cart-level offers", "Show item prices, discounts and final total", "Explain which offers were applied"],
    constraints: ["New offer types must not require editing existing offer classes", "Offers have priorities and some can't be combined", "Totals must be exact (no floating point errors)"],
    solution: {
      summary:
        "Cart holds line items; a PricingEngine runs a prioritised list of Offer strategies, each of which inspects the cart and returns discount lines; totals use integer paise.",
      parts: [
        ["Product", "id, name, price (paise), category."],
        ["Cart", "Map<productId, CartItem>."],
        ["CartItem", "product, quantity."],
        ["Offer (interface)", "isApplicable(cart), apply(cart) → DiscountLine; priority, stackable."],
        ["FlatOffOffer, PercentOffOffer, BuyXGetYOffer, CategoryOffer", "Concrete offers."],
        ["PricingEngine", "Sorts offers, applies stacking rules, builds PriceBreakdown."],
        ["PriceBreakdown", "subtotal, discount lines, total."],
      ],
      flow: [
        ["Shopper", "Cart.add(product, 3)", "Update item"],
        ["UI", "PricingEngine.price(cart)", "Compute subtotal"],
        ["PricingEngine", "Offers (by priority)", "Apply applicable offers, skipping non-stackable conflicts"],
        ["PricingEngine", "PriceBreakdown", "Return totals and applied offers"],
      ],
      decisions: [
        "Strategy pattern for offers is the whole point of this question.",
        "Chain/priority ordering makes stacking rules explicit.",
        "Pure pricing function makes it trivial to unit-test.",
      ],
    },
  },

  "lld-inventory": {
    scenario:
      "Build an inventory system for an online seller with several warehouses. It tracks stock per product per warehouse, reserves stock when orders are placed, and alerts when stock runs low.",
    requirements: ["Add stock to a warehouse", "Reserve stock for an order; release or confirm it", "Choose which warehouse fulfils an order", "Low-stock alerts"],
    constraints: ["Available = on hand − reserved; never negative", "Concurrent orders for the last units", "Warehouse selection rule may change"],
    solution: {
      summary:
        "StockItem per (product, warehouse) with onHand and reserved; InventoryService reserves atomically using a warehouse selection strategy and notifies observers when stock drops below a threshold.",
      parts: [
        ["Product, Warehouse", "Warehouse has a location."],
        ["StockItem", "product, warehouse, onHand, reserved; available()."],
        ["Reservation", "orderId, items per warehouse, expiresAt."],
        ["WarehouseSelectionStrategy", "Nearest, MostStock, SplitAcrossWarehouses."],
        ["InventoryService", "addStock, reserve, confirm, release."],
        ["LowStockObserver", "Alerts purchasing team."],
      ],
      flow: [
        ["OrderService", "InventoryService.reserve(order)", "Request"],
        ["InventoryService", "WarehouseSelectionStrategy", "Pick warehouse(s)"],
        ["InventoryService", "StockItem (locked)", "available ≥ qty → reserved += qty"],
        ["OrderService", "confirm(reservation)", "onHand −= qty, reserved −= qty"],
        ["InventoryService", "LowStockObserver", "Notify if available < threshold"],
      ],
      decisions: [
        "Reserve/confirm/release avoids overselling while payment is pending.",
        "Lock per StockItem rather than the whole inventory.",
        "Reservations expire so abandoned checkouts don't lock stock forever.",
      ],
    },
  },

  "lld-hotel-booking": {
    scenario:
      "Design the classes for a hotel booking system: guests search room availability for dates, book rooms, pay, and cancel under the hotel's cancellation policy.",
    requirements: ["Hotels with room types and rooms", "Check availability for a date range", "Book, pay, cancel", "Different cancellation policies"],
    constraints: ["A room can't be booked twice for overlapping dates", "Check-out day is free for the next check-in", "Policies may vary by rate plan"],
    solution: {
      summary:
        "Bookings hold a room and a date range; availability checks for overlaps per room; pricing and cancellation are strategies attached to the rate plan.",
      parts: [
        ["Hotel, RoomType, Room", "Room belongs to a type."],
        ["DateRange", "checkIn, checkOut; overlaps(other) using half-open intervals."],
        ["Booking", "guest, room, dateRange, amount, status."],
        ["AvailabilityService", "Free rooms of a type for a range."],
        ["PricingStrategy", "Per night, weekend, seasonal."],
        ["CancellationPolicy", "FreeUntil24h, NonRefundable, PartialRefund."],
        ["BookingService", "book, cancel, with payment via an interface."],
      ],
      flow: [
        ["Guest", "AvailabilityService.search(type, range)", "Rooms with no overlapping booking"],
        ["Guest", "BookingService.book(room, range)", "Re-check overlap under a lock"],
        ["BookingService", "PricingStrategy → Payment", "Charge"],
        ["Guest", "BookingService.cancel(booking)", "CancellationPolicy → refund amount"],
      ],
      decisions: [
        "Half-open [checkIn, checkOut) intervals make back-to-back stays work.",
        "Policies as strategies attach to rate plans.",
        "Assign a specific room at check-in if you sell by room type.",
      ],
    },
  },

  "lld-auction": {
    scenario:
      "Build an online auction system: sellers list items with a starting price and end time, buyers place bids, outbid users are notified, and when the auction ends the highest bidder wins.",
    requirements: ["Create auctions with start price and end time", "Place bids", "Notify users when outbid", "Close auctions and declare winners"],
    constraints: ["A bid must beat the current highest by a minimum increment", "No bids after the end time", "Concurrent bids must be handled correctly"],
    solution: {
      summary: "Auction owns its bid history and highest bid, updated under a lock; an observer notifies outbid users; a scheduler closes auctions at their end time.",
      parts: [
        ["Auction", "item, seller, startPrice, increment, endsAt, highestBid, bids, status."],
        ["Bid", "bidder, amount, time."],
        ["AuctionService", "createAuction, placeBid, close."],
        ["BidValidator", "Open? amount ≥ highest + increment? not the seller?"],
        ["BidListener (observer)", "OutbidNotifier, activity feed."],
        ["AuctionCloser", "Scheduled job at endsAt."],
      ],
      flow: [
        ["Bidder", "AuctionService.placeBid(a, 5000)", "Lock auction"],
        ["AuctionService", "BidValidator", "Reject invalid bids"],
        ["AuctionService", "Auction", "Record bid; previous highest becomes 'outbid'"],
        ["AuctionService", "BidListeners", "Notify the previous highest bidder"],
        ["AuctionCloser", "Auction", "At end time: CLOSED, winner = highest bidder"],
      ],
      decisions: [
        "Per-auction lock keeps bids ordered.",
        "Observer for notifications.",
        "Auto-bidding adds a proxy bid per user that responds to new bids up to a maximum.",
      ],
    },
  },

  "lld-wallet": {
    scenario:
      "Build the core of a payments wallet like Paytm: users add money, pay merchants, transfer to other users, and view their transaction history.",
    requirements: ["Add money, pay, transfer", "Transaction history with filters", "Balances can't go negative", "Transfers between two users are all-or-nothing"],
    constraints: ["The same user may pay from two devices at once", "Amounts are in paise (integers)", "Cashback offers may be applied after payments"],
    solution: {
      summary:
        "Wallet balances change only through Transactions created by a WalletService, which locks the wallets involved in a fixed order, validates, and records debit and credit entries.",
      parts: [
        ["User, Wallet", "Wallet: balance, owner."],
        ["Transaction", "id, type (ADD, PAY, TRANSFER), amount, from, to, status, time."],
        ["LedgerEntry", "wallet, amount (+/−), transaction."],
        ["WalletService", "addMoney, pay, transfer, history."],
        ["PaymentSource (interface)", "Bank, card for top-ups."],
        ["PostPaymentHook (observer)", "CashbackService."],
      ],
      flow: [
        ["User", "WalletService.transfer(A, B, 500)", "Validate amount"],
        ["WalletService", "Locks", "Lock wallets in ID order"],
        ["WalletService", "Wallet A", "balance ≥ 500? debit"],
        ["WalletService", "Wallet B", "Credit; record Transaction + 2 LedgerEntries"],
        ["WalletService", "PostPaymentHooks", "Cashback evaluated"],
      ],
      decisions: [
        "Ordered locking avoids deadlocks.",
        "Ledger entries give an audit trail and let you rebuild balances.",
        "Idempotency key on each request prevents double payments on retries.",
      ],
    },
  },

  "lld-order-book": {
    scenario:
      "Implement the order book and matching engine for a single stock: traders place buy and sell limit orders, and whenever a buy price is at or above a sell price, a trade happens.",
    requirements: ["Place limit buy/sell orders", "Match orders and record trades", "Partial fills", "Cancel and modify orders"],
    constraints: ["Best price first; at the same price, earliest order first", "Trade price is the resting order's price", "Matching must be deterministic"],
    solution: {
      summary:
        "Two priority queues (bids: highest price first; asks: lowest price first; ties by time); an incoming order matches against the opposite side until it's filled or no longer crosses, and the remainder rests in the book.",
      parts: [
        ["Order", "id, side, price, quantity, remaining, timestamp, status."],
        ["OrderBook", "bids (max-heap), asks (min-heap), index by orderId."],
        ["MatchingEngine", "submit(order), cancel(orderId), modify."],
        ["Trade", "buyOrderId, sellOrderId, price, quantity, time."],
        ["TradeListener", "Publish trades."],
      ],
      flow: [
        ["Trader", "MatchingEngine.submit(BUY 100 @ 50)", "Look at best ask"],
        ["MatchingEngine", "OrderBook.asks", "While best ask ≤ 50 and quantity left: trade at ask price"],
        ["MatchingEngine", "Trade", "Record trades; reduce remaining; remove filled asks"],
        ["MatchingEngine", "OrderBook.bids", "Rest any remaining quantity"],
      ],
      decisions: [
        "Price-time priority via heap ordering with a timestamp tiebreak.",
        "Cancel lazily (mark cancelled, skip when popped) or use price-level maps for O(1) cancel.",
        "Single-threaded engine per symbol keeps it deterministic.",
      ],
    },
  },

  "lld-car-rental": {
    scenario:
      "Design a car rental system: customers search available cars at a branch for their dates, reserve one, pick it up, return it, and pay rental plus any late fees.",
    requirements: ["Branches with vehicles of different types", "Search availability by branch, type and dates", "Reserve, pick up, return", "Charge rental and late fees"],
    constraints: ["A vehicle can't have overlapping reservations", "Late return charged per extra hour", "Pricing differs by vehicle type"],
    solution: {
      summary: "Reservations link a customer, vehicle and date range; a ReservationService checks overlaps, and billing uses pricing and late-fee strategies.",
      parts: [
        ["Branch", "location, vehicles."],
        ["Vehicle (abstract) → Car, SUV, Bike", "plate, type, status."],
        ["Reservation", "customer, vehicle, from, to, pickup/return times, status."],
        ["ReservationService", "search, reserve, pickUp, returnVehicle."],
        ["PricingStrategy", "Daily rate by type."],
        ["LateFeePolicy", "Per hour after the due time."],
        ["Invoice", "rental, late fees, total."],
      ],
      flow: [
        ["Customer", "ReservationService.search(branch, type, range)", "Vehicles without overlapping reservations"],
        ["Customer", "reserve(vehicle, range)", "Re-check overlap; create Reservation"],
        ["Staff", "pickUp(reservation)", "Vehicle → RENTED"],
        ["Staff", "returnVehicle(reservation, time)", "Invoice = pricing + late fee; vehicle AVAILABLE"],
      ],
      decisions: [
        "Same overlap logic as hotel bookings.",
        "Strategies for pricing and late fees.",
        "Returning to a different branch just moves the vehicle's branch.",
      ],
    },
  },

  "lld-restaurant-reservation": {
    scenario:
      "Build a table reservation system for a restaurant: guests book a time slot for a party size, the system picks a suitable table, and staff handle walk-ins and no-shows.",
    requirements: ["Tables with capacities", "Book a slot for a party size", "Choose the best-fitting free table", "Walk-ins, cancellations, no-shows"],
    constraints: ["A booking holds a table for 90 minutes", "Don't give a 6-seat table to 2 people if a 2-seat table is free", "Mark no-show after 15 minutes"],
    solution: {
      summary:
        "Reservations occupy a table for a time interval; an allocation strategy picks the smallest free table that fits; a scheduler releases no-shows.",
      parts: [
        ["Table", "id, capacity."],
        ["Reservation", "guest, partySize, table, start, end, status."],
        ["TableAllocationStrategy", "BestFit (smallest table ≥ party size)."],
        ["ReservationService", "book, cancel, seatWalkIn, markNoShow."],
        ["NoShowChecker", "Scheduled check 15 minutes after start."],
      ],
      flow: [
        ["Guest", "ReservationService.book(4, 20:00)", "Tables free for 20:00–21:30"],
        ["ReservationService", "BestFit strategy", "Pick the smallest table with capacity ≥ 4"],
        ["ReservationService", "Reservation", "Create CONFIRMED"],
        ["NoShowChecker", "Reservation", "Not seated by 20:15 → NO_SHOW, table freed"],
      ],
      decisions: [
        "Best-fit maximises covers per evening.",
        "Combining tables = a TableGroup treated as one table with summed capacity.",
      ],
    },
  },

  "lld-meeting-room": {
    scenario:
      "Build a meeting room scheduler for an office: people book rooms for a time slot, the system finds a free room of the right size, and bookings can be cancelled or changed.",
    requirements: ["Rooms with capacity and equipment", "Book a room for a time interval", "Find any free room matching size and equipment", "Cancel or update a meeting"],
    constraints: ["No overlapping meetings in the same room", "Meetings can be back-to-back", "Queries should be efficient with many bookings"],
    solution: {
      summary:
        "Each room keeps its meetings sorted by start time (a TreeMap or interval tree), so checking for overlap is a neighbour lookup; a scheduler searches rooms that satisfy the requirements.",
      parts: [
        ["Room", "id, capacity, equipment, calendar."],
        ["RoomCalendar", "Sorted map start → Meeting; isFree(interval) checks floor/ceiling neighbours."],
        ["Interval", "[start, end) with overlaps()."],
        ["Meeting", "id, organiser, attendees, interval, room."],
        ["Scheduler", "book(request), findFreeRooms, cancel, reschedule."],
        ["RoomFilter", "Capacity and equipment criteria."],
      ],
      flow: [
        ["User", "Scheduler.book(10 people, projector, 14:00–15:00)", "Filter rooms"],
        ["Scheduler", "RoomCalendar.isFree", "Check previous meeting ends ≤ 14:00 and next starts ≥ 15:00"],
        ["Scheduler", "RoomCalendar", "Insert meeting (under room lock)"],
        ["User", "Scheduler.reschedule(meeting, newInterval)", "Remove, check, re-insert (rollback if not free)"],
      ],
      decisions: [
        "Sorted structure makes overlap checks O(log n).",
        "Half-open intervals allow back-to-back meetings.",
        "Recurring meetings: store a rule and expand, with per-occurrence exceptions.",
      ],
    },
  },

  "lld-coupon-system": {
    scenario:
      "Implement the coupon validation logic for an online store: when a shopper enters a promo code, check if it's valid for their cart and account, and calculate the discount.",
    requirements: ["Coupon types: flat, percentage with cap, free delivery", "Eligibility: min order value, new users only, categories, date range", "Per-user and global usage limits", "Clear error message when a coupon isn't valid"],
    constraints: ["New rules must be addable without editing existing ones", "Some coupons stack, most don't", "Usage limits must hold under concurrent checkouts"],
    solution: {
      summary:
        "A coupon has a discount strategy and a list of eligibility rules; validation runs the rules as a chain and stops at the first failure with its reason; usage is reserved atomically.",
      parts: [
        ["Coupon", "code, discount, rules, limits, validity dates, stackable."],
        ["DiscountStrategy", "FlatDiscount, PercentWithCap, FreeDelivery."],
        ["EligibilityRule (Chain)", "MinOrderRule, NewUserRule, CategoryRule, DateRule, UsageLimitRule."],
        ["ValidationResult", "valid + reason."],
        ["UsageTracker", "Atomic per-user/global counts; reserve and commit."],
        ["CouponService", "apply(code, cart, user)."],
      ],
      flow: [
        ["Shopper", "CouponService.apply('SAVE20', cart)", "Load coupon"],
        ["CouponService", "Rule chain", "Each rule checks; first failure returns its reason"],
        ["CouponService", "DiscountStrategy", "Compute discount"],
        ["CouponService", "UsageTracker", "Reserve one use; commit when the order is paid"],
      ],
      decisions: [
        "Chain of Responsibility gives clear per-rule error messages.",
        "Strategy for discount calculation.",
        "Rules as data make coupons configurable by marketing.",
      ],
    },
  },

  "lld-payment-gateway": {
    scenario:
      "Design the classes for a payment module that supports cards, UPI and net banking through different bank partners, tracks each payment's status, and handles refunds.",
    requirements: ["Create a payment with a chosen method", "Process it through a bank partner", "Track status: created, processing, success, failed", "Full and partial refunds"],
    constraints: ["Retrying the same request must not charge twice", "Adding a payment method or bank must not change existing classes", "Refunds can't exceed the captured amount"],
    solution: {
      summary:
        "Payment methods are strategies; bank partners sit behind a common adapter interface chosen by a router; Payment is a state machine; idempotency keys guard creation.",
      parts: [
        ["Payment", "id, amount, method, status, idempotencyKey, refunds."],
        ["PaymentMethod (strategy)", "CardPayment, UpiPayment, NetBankingPayment: validate + build request."],
        ["BankAdapter (interface)", "HdfcAdapter, IciciAdapter…: charge, refund, status."],
        ["PaymentRouter", "Chooses a bank adapter by method and success rate."],
        ["PaymentService", "create, process, refund; idempotency store."],
        ["Refund", "amount, status."],
      ],
      flow: [
        ["Merchant", "PaymentService.create(req, key)", "Return existing payment if key seen"],
        ["PaymentService", "PaymentMethod", "Validate details"],
        ["PaymentService", "PaymentRouter → BankAdapter", "charge()"],
        ["PaymentService", "Payment", "PROCESSING → SUCCESS / FAILED"],
        ["Merchant", "PaymentService.refund(p, amount)", "Check refundable balance; adapter.refund"],
      ],
      decisions: [
        "Adapter pattern hides each bank's API differences.",
        "Strategy for payment methods.",
        "State transitions guard against refunding a failed payment.",
      ],
    },
  },

  "lld-flight-booking": {
    scenario:
      "Design the classes for a flight booking system: users search flights between cities on a date, pick seats in a cabin class, book for several passengers, and can cancel.",
    requirements: ["Flights with schedules and aircraft seat maps", "Search direct and one-stop flights", "Book seats for multiple passengers", "Cancel and refund per fare rules"],
    constraints: ["A seat can't be sold twice on the same flight instance", "Prices differ by class and fill level", "If the airline cancels, passengers must be rebooked"],
    solution: {
      summary:
        "Separate a Flight (route and schedule) from a FlightInstance (a specific date with its own seat inventory); bookings hold passenger-seat pairs on instances; pricing and fare rules are strategies.",
      parts: [
        ["Airport, Aircraft", "Aircraft has a seat map."],
        ["Flight", "number, from, to, schedule."],
        ["FlightInstance", "flight + date, seat statuses, status."],
        ["Seat", "number, class (ECONOMY, BUSINESS)."],
        ["Booking", "passengers, seats, amount, status."],
        ["FlightSearchService", "Direct and one-stop combinations with minimum layover."],
        ["PricingStrategy / FareRules", "Dynamic pricing; cancellation charges."],
      ],
      flow: [
        ["User", "FlightSearchService.search(DEL, BLR, date)", "Instances with free seats"],
        ["User", "BookingService.book(instance, seats, passengers)", "Lock seats on the instance"],
        ["BookingService", "Pricing → Payment", "Charge and confirm"],
        ["Airline", "cancel(instance)", "For each booking find alternatives and rebook"],
      ],
      decisions: [
        "Flight vs FlightInstance is the key modelling step.",
        "Seat locking per instance mirrors movie booking.",
      ],
    },
  },

  "lld-delivery-locker": {
    scenario:
      "Design software for self-service parcel lockers: couriers drop packages into lockers, customers get a code to open their locker, and uncollected parcels are returned after a few days.",
    requirements: ["Lockers of different sizes at locations", "Assign a free locker that fits a package", "Customer opens it with a one-time code", "Return uncollected parcels after 3 days"],
    constraints: ["Codes must be single-use and expire", "Small parcels may use bigger lockers only if no small one is free"],
    solution: {
      summary:
        "A LockerService allocates the smallest free locker that fits, generates a hashed pickup code, and a scheduled job handles expiries.",
      parts: [
        ["LockerLocation", "Lockers at a site."],
        ["Locker", "id, size, status (FREE, OCCUPIED)."],
        ["Package", "id, size, customer."],
        ["LockerAssignment", "package, locker, codeHash, expiresAt, status."],
        ["AllocationStrategy", "Smallest fitting size first."],
        ["CodeGenerator", "Random 6-digit codes."],
        ["ExpiryJob", "Marks for return and frees lockers."],
      ],
      flow: [
        ["Courier", "LockerService.deposit(package, location)", "Allocate locker"],
        ["LockerService", "CodeGenerator → Notification", "Send code to customer"],
        ["Customer", "LockerService.pickUp(location, code)", "Match hash, open locker, free it"],
        ["ExpiryJob", "LockerService", "After 3 days: flag for courier return"],
      ],
      decisions: [
        "Store code hashes, not codes.",
        "Size ordering as an enum makes 'fits' a comparison.",
      ],
    },
  },

  "lld-doctor-appointment": {
    scenario:
      "Build an appointment booking system for a clinic app like Practo: doctors publish their availability, patients book time slots, and both get reminders. Doctors sometimes run late.",
    requirements: ["Doctors define weekly availability", "Generate bookable slots", "Book, cancel and reschedule", "Reminders before appointments"],
    constraints: ["No double booking of a slot", "Slot length varies by doctor", "If a doctor is running late, later patients are notified"],
    solution: {
      summary:
        "Availability rules generate Slots; booking reserves a Slot atomically; a reminder scheduler and a delay notifier handle communication.",
      parts: [
        ["Doctor", "specialty, slotLength, availability rules."],
        ["AvailabilityRule", "day of week, start, end."],
        ["Slot", "doctor, start, end, status."],
        ["Appointment", "patient, slot, status."],
        ["SlotGenerator", "Rules → concrete slots for the next N days."],
        ["AppointmentService", "book, cancel, reschedule."],
        ["ReminderScheduler / DelayNotifier", "Notifications."],
      ],
      flow: [
        ["Patient", "AppointmentService.book(slot)", "Slot AVAILABLE → BOOKED (atomic)"],
        ["AppointmentService", "ReminderScheduler", "Schedule reminder 2 hours before"],
        ["Doctor", "DelayNotifier.reportDelay(30 min)", "Notify patients with later slots today"],
      ],
      decisions: [
        "Generating slots from rules keeps doctor setup simple.",
        "Compare-and-set on slot status prevents double booking.",
      ],
    },
  },

  "lld-bank-account": {
    scenario:
      "Design a simple banking system: customers open savings or current accounts, deposit, withdraw and transfer money, earn interest on savings, and view statements.",
    requirements: ["Open savings and current accounts", "Deposit, withdraw, transfer", "Monthly interest for savings", "Statements with all transactions"],
    constraints: ["Savings accounts can't go below a minimum balance", "Current accounts may have an overdraft limit", "Every change must be recorded"],
    solution: {
      summary:
        "An abstract Account defines deposit/withdraw with a transaction log; subclasses define their withdrawal rules; interest calculation is a strategy applied by a scheduled job.",
      parts: [
        ["Customer", "id, accounts."],
        ["Account (abstract)", "number, balance, transactions; deposit(); withdraw() calls canWithdraw()."],
        ["SavingsAccount", "Minimum balance rule; interest strategy."],
        ["CurrentAccount", "Overdraft limit."],
        ["Transaction", "type, amount, time, balanceAfter."],
        ["InterestStrategy", "Simple daily-balance interest."],
        ["BankService", "open, transfer (ordered locks), monthly interest job."],
      ],
      flow: [
        ["Customer", "Account.withdraw(1000)", "canWithdraw() per account type"],
        ["Account", "Transaction log", "Record and update balance"],
        ["Customer", "BankService.transfer(a, b, 500)", "Lock both, withdraw from a, deposit to b"],
        ["Scheduler", "InterestStrategy", "Credit monthly interest to savings accounts"],
      ],
      decisions: [
        "Template method: shared withdraw flow, account-specific canWithdraw().",
        "Transactions are immutable records; balance can be recomputed from them.",
      ],
    },
  },
};
