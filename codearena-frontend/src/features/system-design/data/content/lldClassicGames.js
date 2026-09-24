// LLD content: Classic OOP + Games.
// For LLD, `constraints` are the rules the program must follow.
// `solution.parts` are the classes; flow rows are [caller, callee, what happens].

export default {
  "lld-parking-lot": {
    scenario:
      "Write the software for a multi-storey parking lot. Cars, bikes and trucks enter through gates, get a ticket for a spot that fits them, and pay when they leave based on how long they stayed.",
    requirements: ["Several floors, each with spots of different sizes", "Assign a suitable free spot on entry and issue a ticket", "Calculate the fee on exit and free the spot", "Show free spots per floor and type"],
    constraints: ["A bike can use a bike or car spot; a car can't use a bike spot; trucks need large spots", "Hourly pricing that can differ by vehicle type", "Two gates may assign spots at the same time"],
    solution: {
      summary:
        "Model the lot as floors of typed spots; keep allocation and pricing behind strategy interfaces so new rules don't change core classes; synchronise spot assignment.",
      parts: [
        ["ParkingLot (singleton)", "Holds floors, entry/exit gates; entry point for park/unpark."],
        ["Floor", "Holds spots; answers 'free spots of type X'."],
        ["ParkingSpot", "id, type (SMALL/MEDIUM/LARGE), vehicle or null."],
        ["Vehicle (abstract) → Bike, Car, Truck", "Knows which spot types it can fit."],
        ["Ticket", "id, vehicle, spot, entryTime, exitTime, amount."],
        ["SpotAllocationStrategy", "Interface: findSpot(vehicle); e.g. NearestFirst."],
        ["PricingStrategy", "Interface: fee(ticket); e.g. HourlyPricing with rates per type."],
      ],
      flow: [
        ["EntryGate", "ParkingLot.park(vehicle)", "Request a spot"],
        ["ParkingLot", "SpotAllocationStrategy", "findSpot(vehicle) across floors (synchronised)"],
        ["ParkingLot", "ParkingSpot", "assign(vehicle); create Ticket"],
        ["ExitGate", "ParkingLot.unpark(ticket)", "Vehicle leaving"],
        ["ParkingLot", "PricingStrategy", "fee(ticket); free the spot"],
      ],
      decisions: [
        "Strategy pattern for allocation and pricing (Open/Closed).",
        "Vehicle → allowed spot types mapping avoids if/else chains on type.",
        "Lock around find + assign so two gates can't take the same spot.",
      ],
    },
  },

  "lld-elevator": {
    scenario:
      "Design the control software for a building with several elevators. People press up/down buttons on floors and floor buttons inside a car; the system decides which elevator serves each request and moves them efficiently.",
    requirements: ["Handle hall calls (floor + direction) and car calls (destination floor)", "Assign each hall call to one elevator", "Move elevators and open/close doors", "Show each elevator's current floor and direction"],
    constraints: ["N elevators, M floors", "An elevator keeps going in its direction while it has requests that way", "Overweight or door-blocked elevators don't move"],
    solution: {
      summary:
        "A controller dispatches hall calls to elevators using a pluggable scheduling strategy; each elevator is a state machine that serves its own sorted stops in its direction of travel (SCAN/LOOK).",
      parts: [
        ["ElevatorController", "Receives requests; picks an elevator via the strategy."],
        ["Elevator", "id, currentFloor, direction, state, up-stops and down-stops (sorted sets)."],
        ["ElevatorState (State pattern)", "Idle, MovingUp, MovingDown, DoorsOpen, Maintenance."],
        ["Request", "floor, direction (hall) or destination (car)."],
        ["DispatchStrategy", "Interface; e.g. NearestSuitableElevator."],
        ["Display / Button", "Observers of elevator position."],
      ],
      flow: [
        ["Hall button (floor 7, UP)", "ElevatorController", "Hall request"],
        ["ElevatorController", "DispatchStrategy", "Choose the closest elevator moving up below 7, or an idle one"],
        ["ElevatorController", "Elevator", "addStop(7)"],
        ["Elevator (tick)", "State", "Move one floor; at a stop → DoorsOpen"],
        ["Passenger", "Elevator", "Car button 12 → addStop(12)"],
      ],
      decisions: [
        "State pattern keeps door/movement rules out of if/else blocks.",
        "SCAN (serve all stops in one direction, then reverse) avoids starvation.",
        "Dispatch strategy is swappable (e.g. for peak-hour zoning).",
      ],
    },
  },

  "lld-vending-machine": {
    scenario:
      "Program a snack vending machine. A customer inserts coins or notes, selects a product, receives it and any change, or cancels to get their money back. An operator restocks products and collects cash.",
    requirements: ["Accept coins/notes and show the balance", "Select a product; dispense if paid enough", "Return change; cancel and refund", "Restock products and see inventory"],
    constraints: ["Refuse a selection that's out of stock or underpaid", "Return change using the available coins; refuse the sale if exact change can't be made", "No actions accepted while dispensing"],
    solution: {
      summary: "A State pattern machine (Idle → HasMoney → Dispensing) with inventory and a coin box; each state decides which actions are valid.",
      parts: [
        ["VendingMachine", "Context: holds current state, inventory, coin box, balance."],
        ["State (interface)", "insertMoney, selectProduct, dispense, cancel."],
        ["IdleState / HasMoneyState / DispensingState", "Each implements what's allowed in that state."],
        ["Inventory", "slot → Product + quantity."],
        ["CoinBox", "Denomination counts; computes change (greedy with availability)."],
        ["Product", "code, name, price."],
      ],
      flow: [
        ["Customer", "VendingMachine.insertMoney(₹20)", "IdleState → balance 20, go to HasMoneyState"],
        ["Customer", "selectProduct('B3')", "HasMoneyState checks stock and price"],
        ["HasMoneyState", "CoinBox", "Can we make change? If not, refuse"],
        ["VendingMachine", "DispensingState", "Dispense product, return change, reduce stock"],
        ["DispensingState", "IdleState", "Reset balance"],
      ],
      decisions: [
        "State pattern: invalid actions are handled by the state, not scattered checks.",
        "Check change is possible before dispensing, not after.",
        "Payment methods (cash, UPI) can be added as strategies.",
      ],
    },
  },

  "lld-atm": {
    scenario:
      "Write the software for an ATM. A customer inserts a card, enters a PIN, and can check balance, withdraw cash or deposit. The ATM talks to the bank to authorise transactions and dispenses notes of different denominations.",
    requirements: ["Card + PIN authentication", "Balance enquiry, withdrawal, deposit", "Dispense the requested amount using available notes", "Print or show a receipt"],
    constraints: ["3 wrong PINs block the card", "Withdrawal only in multiples of ₹100 and within daily limit", "If the ATM can't dispense the exact amount, nothing is debited"],
    solution: {
      summary:
        "An ATM state machine drives the session; transactions are command objects sent to a bank service interface; the cash dispenser is a chain of denomination handlers.",
      parts: [
        ["ATM", "Context with current state, card reader, keypad, screen, dispenser."],
        ["ATMState", "Idle, CardInserted, Authenticated, TransactionInProgress."],
        ["Transaction (abstract)", "BalanceEnquiry, Withdrawal, Deposit; execute()."],
        ["BankService (interface)", "authenticate, getBalance, debit, credit."],
        ["CashDispenser", "Chain of NoteHandler(2000) → (500) → (100)."],
        ["Card, Account", "Card number, linked account."],
      ],
      flow: [
        ["Customer", "ATM", "Insert card → CardInserted"],
        ["ATM", "BankService", "authenticate(card, pin) → Authenticated"],
        ["Customer", "Withdrawal.execute(₹2,600)", "Check limit and multiples"],
        ["Withdrawal", "CashDispenser", "Can dispense 2000 + 500 + 100?"],
        ["Withdrawal", "BankService", "debit; then dispense notes"],
      ],
      decisions: [
        "Chain of Responsibility for denominations makes adding a ₹200 note trivial.",
        "Check dispensability before debiting; if dispensing fails after debit, issue a reversal.",
        "Bank behind an interface so it can be mocked in tests.",
      ],
    },
  },

  "lld-library-management": {
    scenario:
      "Build a system for a public library. Members search the catalogue, borrow and return books, and reserve books that are currently out. Librarians add books and manage members; late returns are fined.",
    requirements: ["Search books by title, author or subject", "Borrow and return copies", "Reserve a book that's fully borrowed", "Calculate fines for late returns"],
    constraints: ["A book can have many physical copies", "Members can borrow at most 5 books for 14 days", "A reserved copy is held for the first person in the queue for 2 days"],
    solution: {
      summary: "Separate the catalogue entry (Book) from physical copies (BookItem); loans and reservations are their own entities; fines use a pluggable policy.",
      parts: [
        ["Book", "ISBN, title, authors, subject."],
        ["BookItem", "barcode, book, status (AVAILABLE, LOANED, RESERVED, LOST)."],
        ["Member", "id, active loans, reservations."],
        ["Loan", "bookItem, member, issuedOn, dueOn, returnedOn."],
        ["Reservation", "book, member, createdAt, status; FIFO per book."],
        ["Catalog", "Search indexes by title/author/subject."],
        ["FinePolicy", "Interface; PerDayFine."],
      ],
      flow: [
        ["Member", "LibraryService.borrow(barcode)", "Check limit and item available"],
        ["LibraryService", "Loan", "Create loan, item → LOANED"],
        ["Member", "LibraryService.return(barcode)", "Close loan; FinePolicy.calculate()"],
        ["LibraryService", "ReservationQueue", "If reserved: item → RESERVED, notify next member"],
      ],
      decisions: [
        "Book vs BookItem is the key modelling insight.",
        "Observer to notify members when a reserved book is ready.",
        "Fine policy as a strategy (per day, capped, holidays excluded).",
      ],
    },
  },

  "lld-traffic-signal": {
    scenario:
      "Write the controller for a traffic junction where four roads meet. Each road has a signal that cycles green, yellow and red, the timings are configurable, and emergency vehicles can get priority.",
    requirements: ["Cycle signals through green → yellow → red", "Only non-conflicting roads are green at once", "Configurable durations per signal", "Emergency override for a chosen road"],
    constraints: ["Never two conflicting greens", "Yellow always comes before red", "After an emergency, resume the normal cycle"],
    solution: {
      summary:
        "Each signal is a state machine; a junction controller runs phases (sets of roads that can be green together) on a timer, and an emergency command temporarily switches to a special phase.",
      parts: [
        ["Junction / TrafficController", "Owns roads, phases and the cycle timer."],
        ["Road", "id, signal."],
        ["Signal", "Current state + durations."],
        ["SignalState", "Green, Yellow, Red; next() transitions."],
        ["Phase", "Set of roads green together + duration."],
        ["SignalObserver", "Displays / pedestrian lights listening for changes."],
      ],
      flow: [
        ["Timer", "TrafficController", "Phase duration ended"],
        ["TrafficController", "Current phase signals", "Green → Yellow; after yellow → Red"],
        ["TrafficController", "Next phase signals", "Red → Green"],
        ["Emergency sensor", "TrafficController.override(road)", "Finish current yellow safely, then make that road green"],
      ],
      decisions: [
        "Phases guarantee conflicting roads are never green together.",
        "State pattern encodes legal transitions.",
        "Observer lets displays and logging react without coupling.",
      ],
    },
  },

  "lld-coffee-machine": {
    scenario:
      "Program a coffee machine that makes several drinks (espresso, latte, cappuccino) with optional add-ons like extra shot, sugar or oat milk. It tracks ingredient levels and warns when something is running low.",
    requirements: ["Menu of drinks with recipes", "Optional add-ons that change ingredients and price", "Refuse a drink if ingredients are insufficient", "Low-ingredient alerts; refill"],
    constraints: ["New drinks should be added without changing existing code", "Multiple outlets may run concurrently"],
    solution: {
      summary:
        "Recipes are data (ingredient → quantity); add-ons wrap a drink with the Decorator pattern; an inventory checks and deducts ingredients atomically and notifies observers when low.",
      parts: [
        ["Beverage (interface)", "cost(), ingredients(), description()."],
        ["BaseDrink", "Built from a Recipe (Espresso, Latte…)."],
        ["AddOnDecorator → ExtraShot, Sugar, OatMilk", "Wraps a Beverage, adds cost and ingredients."],
        ["Recipe", "Map of ingredient → quantity."],
        ["IngredientInventory", "Levels; reserve-and-deduct (synchronised)."],
        ["LowStockObserver", "Alert when below threshold."],
        ["CoffeeMachine", "Takes an order, checks inventory, brews."],
      ],
      flow: [
        ["Customer", "CoffeeMachine.order('latte', [ExtraShot])", "Build Beverage"],
        ["CoffeeMachine", "Decorators", "new ExtraShot(new BaseDrink(latteRecipe))"],
        ["CoffeeMachine", "IngredientInventory", "Check and deduct all ingredients atomically"],
        ["IngredientInventory", "LowStockObserver", "Notify if any ingredient is low"],
        ["CoffeeMachine", "Customer", "Serve drink, charge cost()"],
      ],
      decisions: [
        "Recipes as data: new drinks are configuration, not classes.",
        "Decorator for add-ons avoids LatteWithExtraShotAndSugar-style class explosion.",
        "Atomic deduction so two outlets can't both use the last milk.",
      ],
    },
  },

  "lld-tic-tac-toe": {
    scenario:
      "Build a Tic-Tac-Toe game that two players can play in the terminal. After every move the game checks whether someone has won or the board is full.",
    requirements: ["Players take turns placing their symbol", "Reject invalid moves", "Detect win or draw after each move", "Support an N × N board"],
    constraints: ["Win check should be fast even for large boards", "It should be easy to add a computer player"],
    solution: {
      summary: "Board, Player and Game classes; the game loop asks the current player for a move; wins are detected in O(1) using row, column and diagonal counters.",
      parts: [
        ["Game", "Board, players, current turn, status; play loop."],
        ["Board", "N × N cells; place(row, col, symbol); isFull()."],
        ["Player (interface)", "nextMove(board); HumanPlayer, ComputerPlayer."],
        ["WinChecker", "rowCount[n], colCount[n], diag, antiDiag per player (+1 / -1)."],
        ["Move", "row, col, player."],
        ["GameStatus", "IN_PROGRESS, WON, DRAW."],
      ],
      flow: [
        ["Game", "Current Player", "nextMove(board)"],
        ["Game", "Board", "Validate cell is inside and empty; place symbol"],
        ["Game", "WinChecker", "Update counters; |count| == N → winner"],
        ["Game", "Board", "isFull → DRAW"],
        ["Game", "Turn", "Switch to next player"],
      ],
      decisions: [
        "Counters make each win check O(1) instead of scanning the board.",
        "Player interface lets a computer player (random or minimax) drop in.",
        "Keeping a move history makes undo easy.",
      ],
    },
  },

  "lld-snake-and-ladder": {
    scenario:
      "Build a Snake and Ladder game for 2–4 players. Players roll a dice in turns and move along a 100-square board; snakes send them down, ladders take them up, and the first to reach 100 wins.",
    requirements: ["Configurable board with snakes and ladders", "Players take turns rolling a dice", "Apply snakes and ladders after moving", "Declare the winner"],
    constraints: ["A player must land exactly on 100; overshooting means no move", "Dice behaviour should be swappable (normal, loaded for tests)"],
    solution: {
      summary: "A Board maps start → end for snakes and ladders (both are just 'jumps'); the Game loop uses a Dice interface and a queue of players.",
      parts: [
        ["Game", "Board, Dice, queue of players, winner."],
        ["Board", "size, jumps: Map<start, end>."],
        ["Jump", "start, end (snake if end < start, ladder if end > start)."],
        ["Player", "name, position."],
        ["Dice (interface)", "roll(); NormalDice, CrookedDice (only even numbers)."],
      ],
      flow: [
        ["Game", "Players queue", "Take the next player"],
        ["Game", "Dice", "roll() → 5"],
        ["Game", "Board", "newPos = pos + 5; if > 100, stay"],
        ["Game", "Board.jumps", "If newPos has a jump, move to its end"],
        ["Game", "Players queue", "If position == 100 → winner; else re-queue player"],
      ],
      decisions: [
        "Snakes and ladders unified as jumps: one map, no special cases.",
        "Dice as an interface for testability and variants.",
        "Queue of players makes turn order trivial.",
      ],
    },
  },

  "lld-chess": {
    scenario:
      "Build a two-player chess game. The program must enforce every piece's legal moves, detect check, checkmate and stalemate, and support special moves.",
    requirements: ["Standard board and pieces", "Validate moves for each piece type", "Detect check, checkmate, stalemate", "Castling, en passant, pawn promotion"],
    constraints: ["A move that leaves your own king in check is illegal", "Keep a full move history"],
    solution: {
      summary:
        "Each piece type knows its movement pattern; the game generates candidate moves, filters out those that leave the king in check by simulating them, and records moves for history and special rules.",
      parts: [
        ["Game", "Board, players, turn, status, move history."],
        ["Board", "8 × 8 squares; getPiece, movePiece, clone/undo."],
        ["Piece (abstract) → King, Queen, Rook, Bishop, Knight, Pawn", "candidateMoves(board, from)."],
        ["Move", "from, to, piece, captured, special (castle, en passant, promotion)."],
        ["MoveValidator", "Filters moves that leave own king in check."],
        ["GameStatus", "ACTIVE, CHECK, CHECKMATE, STALEMATE, RESIGNED."],
      ],
      flow: [
        ["Player", "Game.makeMove(e2, e4)", "Request"],
        ["Game", "Piece.candidateMoves", "Is e4 reachable for this pawn?"],
        ["Game", "MoveValidator", "Simulate; reject if own king would be attacked"],
        ["Game", "Board + History", "Apply move, record it"],
        ["Game", "Status check", "Opponent in check? Any legal moves left? → checkmate/stalemate"],
      ],
      decisions: [
        "Polymorphic pieces keep movement rules local to each piece.",
        "Move history is required for en passant, castling rights and undo.",
        "Sliding pieces share a helper for walking in a direction until blocked.",
      ],
    },
  },

  "lld-minesweeper": {
    scenario:
      "Build Minesweeper. The board hides mines; the player reveals cells, and revealed cells show how many neighbouring mines there are. Revealing an empty area opens up all connected empty cells. Players can flag suspected mines.",
    requirements: ["Configurable board size and mine count", "Reveal and flag cells", "Show neighbour mine counts", "Auto-reveal connected empty cells; detect win/loss"],
    constraints: ["The first click is never a mine", "Win when all non-mine cells are revealed"],
    solution: {
      summary: "Place mines after the first click (excluding that cell), precompute neighbour counts, and use BFS/DFS flood fill to reveal empty regions.",
      parts: [
        ["Game", "Board, status, first-move flag."],
        ["Board", "Grid of cells; placeMines(excluding), neighbours(r, c)."],
        ["Cell", "isMine, adjacentMines, state (HIDDEN, REVEALED, FLAGGED)."],
        ["MinePlacer", "Random placement; swappable for tests."],
        ["GameStatus", "PLAYING, WON, LOST."],
      ],
      flow: [
        ["Player", "Game.reveal(r, c)", "First move? place mines avoiding (r, c), compute counts"],
        ["Game", "Cell", "Mine → LOST"],
        ["Game", "Board", "Count 0 → flood fill neighbours (BFS)"],
        ["Game", "Status", "All safe cells revealed → WON"],
      ],
      decisions: [
        "Deferring mine placement guarantees a safe first click.",
        "Iterative BFS avoids stack overflow on large empty areas.",
        "Injecting the mine placer makes tests deterministic.",
      ],
    },
  },

  "lld-snake-game": {
    scenario:
      "Build the classic Snake game. The snake moves continuously on a grid, the player changes its direction, it grows when it eats food, and the game ends if it hits a wall or itself.",
    requirements: ["Snake moves one cell per tick", "Change direction (no instant reversal)", "Eat food to grow; new food appears", "Game over on wall or self collision; track score"],
    constraints: ["Each move should be O(1)", "Food never spawns on the snake"],
    solution: {
      summary: "The snake is a deque of positions plus a set for O(1) collision checks; each tick adds a new head and removes the tail unless food was eaten.",
      parts: [
        ["Game", "Board, snake, food, score, tick()."],
        ["Snake", "Deque<Position> body, Set<Position> occupied, direction."],
        ["Position", "row, col (value object)."],
        ["Direction", "UP, DOWN, LEFT, RIGHT; opposite()."],
        ["FoodSpawner", "Random free cell; swappable for tests."],
      ],
      flow: [
        ["Timer", "Game.tick()", "Compute next head from direction"],
        ["Game", "Board / Snake", "Out of bounds or hits body (excluding tail that will move) → game over"],
        ["Game", "Snake", "addFirst(newHead)"],
        ["Game", "Food", "If head == food: score++, spawn new food; else removeLast()"],
      ],
      decisions: [
        "Deque + set gives O(1) moves and collision checks.",
        "Ignore a direction change that is the opposite of the current one.",
        "Tick interval shortens with level for difficulty.",
      ],
    },
  },

  "lld-card-game": {
    scenario:
      "Build a small framework for card games using a standard 52-card deck, then use it to implement Blackjack. It should be possible to add other games like Rummy later without rewriting the basics.",
    requirements: ["Deck with shuffle and deal", "Players with hands", "Game-specific rules and scoring", "Blackjack: hit, stand, dealer plays to 17, bust"],
    constraints: ["Core classes (Card, Deck, Hand) must not know any game's rules", "Aces count as 1 or 11 in Blackjack"],
    solution: {
      summary:
        "Generic Card/Deck/Hand classes plus a Game template that defines the turn structure; each game supplies its own rules and scoring through subclasses or strategies.",
      parts: [
        ["Card", "Suit, Rank (enums)."],
        ["Deck", "52 cards; shuffle(random), deal()."],
        ["Hand", "List of cards."],
        ["Player", "name, hand; DealerPlayer for Blackjack."],
        ["CardGame (abstract, Template Method)", "setup(), playTurn(player), isOver(), winner()."],
        ["BlackjackGame", "Implements rules; BlackjackScorer handles aces."],
      ],
      flow: [
        ["BlackjackGame.setup()", "Deck", "Shuffle, deal 2 cards each"],
        ["Player", "BlackjackGame", "hit() → deal a card; bust if score > 21"],
        ["Player", "BlackjackGame", "stand()"],
        ["Dealer", "BlackjackGame", "Draw until score ≥ 17"],
        ["BlackjackGame", "BlackjackScorer", "Compare scores; declare results"],
      ],
      decisions: [
        "Template Method fixes the game loop while games vary the steps.",
        "Scoring separated from Hand so the same hand works for different games.",
        "Injecting Random into shuffle makes tests deterministic.",
      ],
    },
  },
};
