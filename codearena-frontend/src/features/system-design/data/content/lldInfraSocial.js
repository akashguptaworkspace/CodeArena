// LLD content: In-memory infrastructure + Social & collaboration.

export default {
  "lld-lru-cache": {
    scenario:
      "Implement an in-memory cache with a fixed capacity. When it's full and a new item is added, the least recently used item is evicted. Other teams will use it for any key and value types.",
    requirements: ["get(key) returns the value or nothing", "put(key, value) inserts or updates", "Evict the least recently used entry when full", "Generic keys and values"],
    constraints: ["get and put must be O(1)", "Reading an entry counts as using it", "The eviction policy may change later (e.g. LFU)"],
    solution: {
      summary: "A hash map from key to node plus a doubly linked list ordered by recency; the eviction policy sits behind an interface.",
      parts: [
        ["Cache<K, V>", "Public API: get, put; capacity; delegates ordering to the policy."],
        ["Node<K, V>", "key, value, prev, next."],
        ["DoublyLinkedList", "addToFront, remove(node), removeLast — all O(1) with sentinel head/tail."],
        ["HashMap<K, Node>", "O(1) lookup of the node."],
        ["EvictionPolicy (interface)", "keyAccessed(key), evictKey(); LRUPolicy, LFUPolicy."],
      ],
      flow: [
        ["Caller", "Cache.get(k)", "Look up node in map; miss → null"],
        ["Cache", "List", "Hit: move node to front, return value"],
        ["Caller", "Cache.put(k, v)", "Existing: update value, move to front"],
        ["Cache", "List + Map", "New and full: remove tail node and its map entry, then add new node at front"],
      ],
      decisions: [
        "Map gives O(1) find; linked list gives O(1) reorder and eviction.",
        "Sentinel nodes remove null edge cases.",
        "For concurrent use, guard with a lock (or segment the cache).",
      ],
    },
  },

  "lld-kv-store-ttl": {
    scenario:
      "Implement an in-memory key-value store like a mini Redis. Keys can expire after a time-to-live, and clients can group commands into transactions that they commit or roll back, including nested transactions.",
    requirements: ["SET key value [ttl], GET, DELETE", "Keys expire after their TTL", "BEGIN, COMMIT, ROLLBACK with nesting", "Optional snapshot to disk"],
    constraints: ["Expired keys must never be returned", "ROLLBACK undoes only the innermost transaction", "Operations should be O(1) apart from expiry cleanup"],
    solution: {
      summary:
        "A map of key → entry (value + expiresAt) with lazy expiry on read plus periodic cleanup; transactions are a stack of change-logs so each level can be rolled back independently.",
      parts: [
        ["KeyValueStore", "Public API; owns data map, clock and transaction stack."],
        ["Entry", "value, expiresAt (nullable)."],
        ["Clock (interface)", "now(); injectable for tests."],
        ["ExpiryCleaner", "Periodically samples keys and removes expired ones (or uses a min-heap of expiry times)."],
        ["Transaction", "Map of key → previous Entry (or 'absent') to restore on rollback."],
        ["TransactionStack", "Nested transactions; COMMIT merges into the parent."],
      ],
      flow: [
        ["Client", "Store.get(k)", "If entry expired → delete and return null (lazy expiry)"],
        ["Client", "Store.begin()", "Push new Transaction"],
        ["Client", "Store.set(k, v)", "If in a transaction, record k's old entry once; then write"],
        ["Client", "Store.rollback()", "Pop transaction; restore recorded old entries"],
        ["Client", "Store.commit()", "Pop; merge its undo log into parent (or discard if outermost)"],
      ],
      decisions: [
        "Lazy + active expiry together keep memory bounded without scanning everything.",
        "Undo logs (not full copies) keep transactions cheap.",
        "Injected clock makes TTL tests instant.",
      ],
    },
  },

  "lld-rate-limiter": {
    scenario:
      "Write an in-memory rate limiter library that an API server can call before handling each request: isAllowed(userId, api). Different APIs and user plans have different limits.",
    requirements: ["isAllowed(userId, api) returns true or false", "Limits configured per API and per plan", "Support at least two algorithms (token bucket, sliding window)", "Thread-safe"],
    constraints: ["Choosing the algorithm per API must not change calling code", "Limits can be updated at runtime", "Memory for idle users should be reclaimed"],
    solution: {
      summary: "A RateLimiter facade looks up the rule for (plan, api) and delegates to a limiter object per user created by a factory from the rule's algorithm.",
      parts: [
        ["RateLimiter (facade)", "isAllowed(userId, api)."],
        ["RuleProvider", "(plan, api) → Rule { algorithm, limit, window }; reloadable."],
        ["Limiter (interface)", "tryAcquire(now)."],
        ["TokenBucketLimiter", "capacity, refillRate, tokens, lastRefill."],
        ["SlidingWindowLimiter", "Queue of timestamps (or two-bucket counter)."],
        ["LimiterFactory", "Creates the right Limiter from a Rule."],
        ["LimiterRegistry", "ConcurrentMap<userId:api, Limiter> with idle eviction."],
      ],
      flow: [
        ["API server", "RateLimiter.isAllowed(u, '/search')", "Request check"],
        ["RateLimiter", "RuleProvider", "Rule for the user's plan and API"],
        ["RateLimiter", "LimiterRegistry", "Get or create the limiter via LimiterFactory"],
        ["RateLimiter", "Limiter.tryAcquire(now)", "Refill/slide window, then allow or deny (synchronised per limiter)"],
      ],
      decisions: [
        "Strategy (Limiter interface) + Factory keep algorithms pluggable.",
        "Lock per limiter instance, not a global lock, for concurrency.",
        "Clock injected for testing.",
      ],
    },
  },

  "lld-logger": {
    scenario:
      "Build a logging library for your services. Code calls logger.info(), logger.error() and so on; logs should go to the console, a file and optionally a remote server, with a configurable minimum level and format.",
    requirements: ["Levels: DEBUG, INFO, WARN, ERROR", "Multiple outputs (console, file, remote)", "Configurable minimum level per output", "Custom message format (timestamp, level, message, context)"],
    constraints: ["Logging must not noticeably slow the application", "Adding a new output must not change existing classes", "One logger instance shared across the app"],
    solution: {
      summary:
        "A Logger (singleton or injected) builds LogRecords and hands them to a list of appenders (sinks); each appender has its own level filter and formatter; slow appenders are wrapped to write asynchronously.",
      parts: [
        ["Logger", "debug/info/warn/error; creates LogRecord; forwards to appenders."],
        ["LogRecord", "timestamp, level, message, context."],
        ["Appender (interface)", "append(record); ConsoleAppender, FileAppender, RemoteAppender."],
        ["LevelFilter", "Per appender minimum level."],
        ["Formatter (interface)", "PlainTextFormatter, JsonFormatter."],
        ["AsyncAppender (decorator)", "Queues records; background thread writes to the wrapped appender."],
      ],
      flow: [
        ["App code", "Logger.error(msg, ctx)", "Create LogRecord"],
        ["Logger", "Each Appender", "append(record)"],
        ["Appender", "LevelFilter", "Skip if below its level"],
        ["Appender", "Formatter", "Format and write (async for file/remote)"],
      ],
      decisions: [
        "Observer/Chain style: logger broadcasts to independent appenders.",
        "Decorator for async keeps each appender simple.",
        "Flush the async queue on shutdown to avoid losing logs.",
      ],
    },
  },

  "lld-pub-sub": {
    scenario:
      "Implement an in-memory publish/subscribe message queue. Publishers send messages to named topics; each subscriber of a topic receives every message, at its own pace, in order.",
    requirements: ["Create topics; publish messages", "Subscribe/unsubscribe to topics", "Each subscriber gets all messages in order", "A new subscriber can start from the latest or from the beginning"],
    constraints: ["A slow subscriber must not block others or the publisher", "Retry a failed message a few times, then move it aside"],
    solution: {
      summary:
        "Each topic keeps an append-only list of messages; each subscription tracks its own offset and is processed by its own worker, so subscribers progress independently.",
      parts: [
        ["Broker / QueueService", "createTopic, publish, subscribe."],
        ["Topic", "name, List<Message> (append-only), subscriptions."],
        ["Message", "id, payload, timestamp."],
        ["Subscriber (interface)", "consume(message)."],
        ["Subscription", "subscriber, offset, retry count; worker thread."],
        ["DeadLetterStore", "Messages that failed after max retries."],
      ],
      flow: [
        ["Publisher", "Broker.publish(topic, msg)", "Append to topic log"],
        ["Broker", "Subscriptions of topic", "Signal new data (wake workers)"],
        ["Subscription worker", "Topic log", "Read message at its offset"],
        ["Subscription worker", "Subscriber.consume", "Success → offset++; failure → retry, then dead-letter and move on"],
      ],
      decisions: [
        "Offsets per subscription give independence and replay (reset offset to 0).",
        "Push to wake up, pull to read: simple and back-pressure friendly.",
        "Old messages can be trimmed once every subscription has passed them.",
      ],
    },
  },

  "lld-task-scheduler": {
    scenario:
      "Write an in-process task scheduler: code can schedule a task to run once after a delay, at a fixed time, or repeatedly at an interval, and can cancel tasks. Tasks run on a limited pool of worker threads.",
    requirements: ["schedule(task, delay)", "scheduleAtFixedRate(task, interval)", "cancel(taskId)", "Run tasks on N workers"],
    constraints: ["Tasks run as close to their time as possible", "A long task must not delay others (other workers keep running)", "The scheduler must not busy-wait"],
    solution: {
      summary:
        "A priority queue ordered by next run time; a dispatcher thread waits until the earliest task is due (or a new earlier task arrives) and hands due tasks to a worker pool; recurring tasks are re-queued with their next time.",
      parts: [
        ["Scheduler", "Public API; owns queue, dispatcher, worker pool."],
        ["ScheduledTask", "id, runnable, nextRunAt, interval (nullable), cancelled flag."],
        ["DelayQueue / PriorityQueue", "Ordered by nextRunAt."],
        ["Dispatcher thread", "Waits on a condition until the head is due."],
        ["WorkerPool", "Fixed number of threads executing tasks."],
      ],
      flow: [
        ["Caller", "Scheduler.schedule(task, 5s)", "Insert into queue; signal dispatcher"],
        ["Dispatcher", "Queue head", "Sleep until nextRunAt (wakes early if a sooner task is added)"],
        ["Dispatcher", "WorkerPool", "Submit the due task (skip if cancelled)"],
        ["Dispatcher", "Queue", "Recurring? set nextRunAt += interval and re-insert"],
      ],
      decisions: [
        "Timed wait on a condition variable avoids busy-waiting.",
        "Cancellation is a flag checked at dispatch (O(1)) instead of removing from the heap.",
        "Fixed-rate vs fixed-delay semantics must be chosen and documented.",
      ],
    },
  },

  "lld-circuit-breaker": {
    scenario:
      "Your service calls a flaky payment provider. When the provider starts failing, you want to stop calling it for a while and return a fallback immediately, then test it again later. Implement a reusable circuit breaker.",
    requirements: ["Wrap any async call", "Open after too many failures in a window", "After a cool-down, allow a trial call", "Close again if trials succeed"],
    constraints: ["Thresholds configurable per downstream service", "Thread-safe", "Timeouts count as failures"],
    solution: {
      summary: "A State pattern breaker with Closed, Open and HalfOpen states, a sliding failure window, and a configurable fallback.",
      parts: [
        ["CircuitBreaker", "execute(call, fallback); holds config, state, metrics."],
        ["BreakerState", "ClosedState, OpenState, HalfOpenState."],
        ["FailureWindow", "Rolling count or rate of failures over the last N calls / seconds."],
        ["BreakerConfig", "failureThreshold, openDuration, halfOpenMaxCalls, timeout."],
        ["BreakerRegistry", "One breaker per downstream name."],
      ],
      flow: [
        ["Caller", "CircuitBreaker.execute(call)", "Closed: run the call with a timeout"],
        ["CircuitBreaker", "FailureWindow", "Record success/failure; threshold exceeded → Open"],
        ["Caller", "CircuitBreaker (Open)", "Return fallback immediately until openDuration passes"],
        ["CircuitBreaker", "HalfOpen", "Allow a few trial calls: success → Closed, failure → Open"],
      ],
      decisions: [
        "State pattern keeps transition rules explicit and testable.",
        "Failure rate (not just count) avoids tripping on low traffic.",
        "Only count failures that indicate the downstream is unhealthy (5xx, timeouts), not 4xx.",
      ],
    },
  },

  "lld-url-shortener": {
    scenario:
      "Write the core classes for a URL shortening library: create short codes for long URLs, look them up, support custom aliases and expiry, and count clicks. Storage will start in memory but move to a database later.",
    requirements: ["shorten(longUrl, options) returns a code", "resolve(code) returns the long URL", "Custom alias if available; optional expiry", "Count clicks per code"],
    constraints: ["Swapping in-memory storage for a DB must not change the service", "Code generation method should be swappable"],
    solution: {
      summary:
        "A ShortenerService coordinates a CodeGenerator strategy and a LinkRepository interface; expiry and alias rules live in the service; clicks are recorded through a separate counter.",
      parts: [
        ["ShortenerService", "shorten, resolve; validation and rules."],
        ["Link", "code, longUrl, createdAt, expiresAt, owner."],
        ["CodeGenerator (interface)", "Base62CounterGenerator, RandomGenerator."],
        ["LinkRepository (interface)", "save, findByCode, exists; InMemoryLinkRepository."],
        ["ClickCounter", "increment(code), count(code)."],
      ],
      flow: [
        ["Caller", "ShortenerService.shorten(url, {alias})", "Validate URL"],
        ["ShortenerService", "LinkRepository.exists(alias)", "Alias taken → error"],
        ["ShortenerService", "CodeGenerator", "No alias → generate code"],
        ["ShortenerService", "LinkRepository.save", "Store Link"],
        ["Caller", "resolve(code)", "Find link, check expiry, ClickCounter.increment"],
      ],
      decisions: [
        "Repository pattern isolates storage (Dependency Inversion).",
        "Generator as a strategy for testing and future changes.",
        "Alias reservation must be atomic when the store is shared.",
      ],
    },
  },

  "lld-file-system": {
    scenario:
      "Implement an in-memory file system with Unix-like commands: create directories, create and write files, list directory contents, change directory and read files, using absolute or relative paths.",
    requirements: ["mkdir -p, ls, cd, pwd", "Create, write, append, read files", "Absolute and relative paths (., ..)", "Size of a file or directory"],
    constraints: ["Names are unique within a directory", "ls on a file prints the file name", "Errors for missing paths"],
    solution: {
      summary: "Composite pattern: File and Directory share a common Node type; directories hold child nodes in a map; a path resolver walks the tree.",
      parts: [
        ["FileSystem", "root, current directory; command methods."],
        ["Node (abstract)", "name, parent, size(), path()."],
        ["File", "content (StringBuilder)."],
        ["Directory", "Map<name, Node> children (sorted for ls)."],
        ["PathResolver", "Splits path, handles '.', '..', absolute vs relative."],
      ],
      flow: [
        ["User", "FileSystem.mkdir('/a/b')", "Resolver walks from root, creating missing directories"],
        ["User", "FileSystem.write('notes.txt', 'hi')", "Resolve parent dir; create or update File"],
        ["User", "FileSystem.ls('/a')", "Directory → sorted child names; File → its name"],
        ["User", "Directory.size()", "Sum of children sizes (recursive)"],
      ],
      decisions: [
        "Composite lets size() and path() work uniformly on files and directories.",
        "Parent pointers make '..' and pwd simple.",
        "Permissions can later be added as a decorator or ACL on Node.",
      ],
    },
  },

  "lld-text-editor": {
    scenario:
      "Build the core of a text editor: insert and delete text at the cursor, move the cursor, select text, and undo/redo any number of edits.",
    requirements: ["Insert, delete, replace at cursor or selection", "Move cursor; select ranges", "Unlimited undo and redo", "Copy, cut, paste"],
    constraints: ["Undo must restore text and cursor exactly", "A new edit after undo clears the redo history"],
    solution: {
      summary:
        "Every edit is a Command object with execute() and undo(); the editor keeps undo and redo stacks; the text buffer handles efficient inserts and deletes.",
      parts: [
        ["Editor", "Buffer, cursor, selection, clipboard, history."],
        ["TextBuffer", "insert(pos, text), delete(pos, len); gap buffer or rope for efficiency."],
        ["Command (interface)", "execute(), undo()."],
        ["InsertCommand / DeleteCommand / ReplaceCommand", "Store what they need to reverse themselves."],
        ["History", "undoStack, redoStack."],
        ["Clipboard", "Last copied text."],
      ],
      flow: [
        ["User", "Editor.type('a')", "Create InsertCommand(pos, 'a')"],
        ["Editor", "Command.execute()", "Apply to buffer, move cursor"],
        ["Editor", "History", "Push to undo stack; clear redo stack"],
        ["User", "Editor.undo()", "Pop command → undo() → push to redo stack"],
      ],
      decisions: [
        "Command pattern is the textbook fit for undo/redo.",
        "Merge consecutive character inserts into one command so undo removes a word, not a letter.",
        "Commands store the cursor position to restore it on undo.",
      ],
    },
  },

  "lld-notification-service": {
    scenario:
      "Write a notification module that sends messages to users through email, SMS and push notifications using templates, respecting each user's channel preferences.",
    requirements: ["send(userId, templateId, data)", "Channels: email, SMS, push", "Templates with placeholders per channel", "Skip channels the user opted out of; retry failures"],
    constraints: ["Adding WhatsApp must not change senders or existing channels", "Channel providers can fail"],
    solution: {
      summary:
        "A NotificationService resolves the user's preferred channels and delegates to Channel implementations chosen through a registry; templates are rendered per channel; failures retry with backoff.",
      parts: [
        ["NotificationService", "send(): loads preferences, renders templates, dispatches."],
        ["Channel (interface)", "send(recipient, content); EmailChannel, SmsChannel, PushChannel."],
        ["ChannelRegistry", "type → Channel; new channels registered here."],
        ["TemplateEngine", "Render template text with data."],
        ["UserPreferences", "Enabled channels, contact details."],
        ["RetryPolicy", "Exponential backoff, max attempts."],
      ],
      flow: [
        ["Order module", "NotificationService.send(u, 'ORDER_SHIPPED', data)", "Request"],
        ["NotificationService", "UserPreferences", "Enabled channels: EMAIL, PUSH"],
        ["NotificationService", "TemplateEngine", "Render per channel"],
        ["NotificationService", "ChannelRegistry → Channel.send", "Send; on failure RetryPolicy"],
      ],
      decisions: [
        "Strategy + registry = Open/Closed for new channels.",
        "Templates per channel because SMS is short and email is rich.",
        "Async sending (queue) in production so callers aren't blocked.",
      ],
    },
  },

  "lld-hit-counter": {
    scenario:
      "Build a component that records hits to a web page or API endpoint and reports how many hits happened in the last 5 minutes, per endpoint.",
    requirements: ["hit(endpoint, timestamp)", "getHits(endpoint, timestamp) for the last 300 seconds", "Many endpoints"],
    constraints: ["Memory must stay bounded regardless of traffic", "Hits can arrive in bursts in the same second", "Thread-safe"],
    solution: {
      summary: "A circular buffer of 300 one-second buckets per endpoint, each storing a timestamp and count, so both operations are O(300) or O(1) with bounded memory.",
      parts: [
        ["HitCounterService", "Map<endpoint, HitCounter>."],
        ["HitCounter", "times[300], counts[300]."],
        ["Bucket index", "timestamp % 300; reset if the stored time is stale."],
        ["Lock per counter", "Guards updates."],
      ],
      flow: [
        ["API", "HitCounterService.hit(e, t)", "Get or create HitCounter for e"],
        ["HitCounter", "Bucket i = t % 300", "If times[i] != t: times[i] = t, counts[i] = 1; else counts[i]++"],
        ["Dashboard", "getHits(e, t)", "Sum counts[i] where t - times[i] < 300"],
      ],
      decisions: [
        "Fixed buckets trade per-second precision for constant memory.",
        "A queue of timestamps is simpler but grows with traffic.",
        "Keep a running total to make getHits O(1) if needed.",
      ],
    },
  },

  "lld-twitter": {
    scenario:
      "Design the classes for a simplified Twitter: users post tweets, follow and unfollow each other, and see a news feed of the 10 most recent tweets from themselves and people they follow.",
    requirements: ["postTweet(userId, text)", "follow / unfollow", "getNewsFeed(userId) → 10 most recent tweets", "Like and reply to tweets"],
    constraints: ["A user can't follow themselves", "Feed must be efficient even if a user follows thousands of people"],
    solution: {
      summary:
        "Users hold a followee set and their own tweets (newest first); the feed merges the tweet lists of the user and their followees with a max-heap, stopping after 10.",
      parts: [
        ["TwitterService", "postTweet, follow, unfollow, getNewsFeed."],
        ["User", "id, followees: Set, tweets: list newest first."],
        ["Tweet", "id, author, text, timestamp (global increasing counter), likes, replies."],
        ["FeedBuilder", "k-way merge using a max-heap of (tweet, list, index)."],
      ],
      flow: [
        ["User A", "TwitterService.postTweet", "Create Tweet with next timestamp; add to A.tweets front"],
        ["User B", "follow(A)", "B.followees.add(A)"],
        ["User B", "getNewsFeed", "Heap seeded with newest tweet of B and each followee"],
        ["FeedBuilder", "Heap", "Pop newest, push that user's next tweet; repeat 10 times"],
      ],
      decisions: [
        "Pull-based feed with a heap is O(10 log F); fine for an LLD round.",
        "Global counter instead of wall-clock time avoids ties.",
        "Retweets are separate objects that reference the original tweet.",
      ],
    },
  },

  "lld-stack-overflow": {
    scenario:
      "Design the core of a Q&A site like Stack Overflow: users ask questions with tags, answer them, comment, vote, and earn reputation; the asker can accept one answer.",
    requirements: ["Post questions (with tags), answers and comments", "Upvote/downvote questions and answers", "Accept an answer", "Reputation changes from votes and accepts; search by tag"],
    constraints: ["One vote per user per post; users can change their vote", "You can't vote on your own post", "Only the asker can accept an answer"],
    solution: {
      summary:
        "Question and Answer share a votable/commentable base; a Vote registry enforces one vote per user; reputation changes are handled by a listener reacting to vote and accept events.",
      parts: [
        ["User", "id, name, reputation."],
        ["Post (abstract)", "id, author, body, createdAt, votes, comments."],
        ["Question extends Post", "title, tags, answers, acceptedAnswer."],
        ["Answer extends Post", "question, isAccepted."],
        ["Comment", "author, text."],
        ["Vote", "(user, post) → UP/DOWN."],
        ["ReputationService", "Listener: +10 upvote on answer, +15 accepted, -2 downvote…"],
        ["TagIndex", "tag → questions."],
      ],
      flow: [
        ["User", "Question.vote(user, UP)", "Reject if own post; replace any previous vote"],
        ["Post", "Event bus", "Emit VoteChanged"],
        ["ReputationService", "Author", "Adjust reputation"],
        ["Asker", "Question.accept(answer)", "Check asker; mark accepted; emit AnswerAccepted"],
      ],
      decisions: [
        "Common Post base avoids duplicating vote/comment logic.",
        "Observer decouples reputation rules from posting logic.",
        "Reputation rules as a table so they can change without code edits.",
      ],
    },
  },

  "lld-cricket-scoreboard": {
    scenario:
      "Build a live cricket scoreboard like Cricbuzz. As each ball is bowled, the scorer records what happened, and the app updates the score, overs, batting and bowling figures, and notifies viewers.",
    requirements: ["Record each ball: runs, extras (wide, no-ball, bye), wickets", "Maintain team score, overs, run rate", "Batsman and bowler statistics", "Push updates to viewers"],
    constraints: ["Wides and no-balls don't count as legal deliveries", "Strike rotates on odd runs and at the end of each over", "Support T20 and ODI (different over limits)"],
    solution: {
      summary:
        "A match holds innings made of overs made of balls; each Ball event updates the innings and player stats through a scoring service; format rules live in a MatchFormat strategy; observers push updates.",
      parts: [
        ["Match", "teams, format, innings, status."],
        ["MatchFormat (interface)", "T20Format, OdiFormat: overs per innings, powerplay rules."],
        ["Innings", "battingTeam, score, wickets, overs, striker, nonStriker, currentBowler."],
        ["Over", "number, bowler, balls."],
        ["Ball", "runs, extraType, wicket (type, player)."],
        ["BattingStats / BowlingStats", "Per player per innings."],
        ["ScoreObserver", "Viewers, commentary, notifications."],
      ],
      flow: [
        ["Scorer", "ScoringService.recordBall(ball)", "Validate against current state"],
        ["ScoringService", "Innings", "Add runs/extras; legal ball → balls count++"],
        ["ScoringService", "Stats", "Update batsman and bowler"],
        ["ScoringService", "Innings", "Odd runs → swap strike; over complete → swap strike, new over"],
        ["ScoringService", "ScoreObservers", "Notify with the new score"],
      ],
      decisions: [
        "Ball is the event; everything else is derived from balls, which also allows undo.",
        "Format strategy isolates T20/ODI/Test differences.",
        "Observer for live updates.",
      ],
    },
  },

  "lld-poll-system": {
    scenario:
      "Build an online polling feature: a user creates a poll with a question and options, others vote, and everyone can see live results. The creator can close the poll.",
    requirements: ["Create a poll with 2–10 options", "Vote once per user (optionally change vote)", "Live results with counts and percentages", "Close the poll; optional end time"],
    constraints: ["No voting after the poll closes", "Thread-safe counting", "Support single-choice and multiple-choice polls"],
    solution: {
      summary: "Poll, Option and Vote entities; a voting service validates and records votes atomically; results are computed from counts and pushed to observers.",
      parts: [
        ["Poll", "id, question, options, type (SINGLE/MULTI), status, endsAt."],
        ["Option", "id, text, count."],
        ["Vote", "pollId, userId, optionIds."],
        ["VotingService", "vote, changeVote, close; enforces rules."],
        ["VoteValidator (strategy)", "SingleChoiceValidator, MultiChoiceValidator."],
        ["ResultObserver", "Push live results."],
      ],
      flow: [
        ["User", "VotingService.vote(poll, [opt2])", "Poll open?"],
        ["VotingService", "VoteValidator", "Valid selection for this poll type?"],
        ["VotingService", "Vote store", "Existing vote? replace it (adjust counts)"],
        ["VotingService", "ResultObservers", "Broadcast updated counts"],
      ],
      decisions: [
        "Per-poll lock (or atomic counters) keeps counts correct under concurrency.",
        "Validation as a strategy makes ranked-choice an addition, not a rewrite.",
      ],
    },
  },

  "lld-chat-app": {
    scenario:
      "Design the classes for a chat application: one-to-one and group conversations, sending messages, delivery and read status, and editing or deleting messages.",
    requirements: ["Create 1:1 and group conversations", "Send messages; list conversation history", "Sent / delivered / read status per recipient", "Edit and delete messages"],
    constraints: ["Only the sender can edit or delete", "Group admins can add or remove members", "Messages in a conversation stay in order"],
    solution: {
      summary:
        "Conversation is the central entity (DirectConversation, GroupConversation); messages carry per-recipient receipts; a ChatService validates actions and notifies online users through observers.",
      parts: [
        ["User", "id, name, online status."],
        ["Conversation (abstract)", "id, participants, messages (ordered)."],
        ["DirectConversation / GroupConversation", "Group adds name and admins."],
        ["Message", "id, sender, content, sentAt, editedAt, deleted, receipts."],
        ["Receipt", "userId → SENT/DELIVERED/READ."],
        ["ChatService", "createConversation, sendMessage, markRead, edit, delete."],
        ["MessageListener (observer)", "Deliver to online participants."],
      ],
      flow: [
        ["Alice", "ChatService.sendMessage(conv, text)", "Check Alice is a participant"],
        ["ChatService", "Conversation", "Append message with next sequence number"],
        ["ChatService", "Listeners", "Deliver to online members → receipts DELIVERED"],
        ["Bob", "ChatService.markRead(conv, upToMsg)", "Receipts → READ; notify Alice"],
      ],
      decisions: [
        "Per-recipient receipts are needed for groups.",
        "Delete = soft delete ('This message was deleted').",
        "Sequence numbers per conversation guarantee ordering.",
      ],
    },
  },

  "lld-kanban": {
    scenario:
      "Build the core of a Trello-like Kanban board: boards contain lists (To do, Doing, Done), lists contain cards, and team members move cards, assign people and add labels.",
    requirements: ["Create boards, lists and cards", "Move and reorder cards between lists", "Assign members, add labels and due dates", "Activity log of changes"],
    constraints: ["Only board members can edit", "Card order within a list must be preserved", "Optional work-in-progress limit per list"],
    solution: {
      summary:
        "Board → List → Card hierarchy with ordered collections; all changes go through a BoardService that checks permissions, enforces WIP limits, and records Activity entries.",
      parts: [
        ["Board", "id, name, members (roles), lists (ordered)."],
        ["BoardList", "id, name, cards (ordered), wipLimit."],
        ["Card", "id, title, description, assignees, labels, dueDate."],
        ["BoardService", "createCard, moveCard(cardId, toList, position), assign…"],
        ["PermissionChecker", "Member role checks."],
        ["Activity", "who, what, when; appended on every change."],
      ],
      flow: [
        ["User", "BoardService.moveCard(c, 'Doing', 0)", "PermissionChecker: is a member?"],
        ["BoardService", "Target list", "WIP limit reached? reject"],
        ["BoardService", "Lists", "Remove from source, insert at position"],
        ["BoardService", "Activity log", "Record 'moved card c to Doing'"],
      ],
      decisions: [
        "Fractional/position indexes (e.g. LexoRank) avoid renumbering every card on move in a real DB.",
        "Command objects for changes would give undo for free.",
      ],
    },
  },
};
