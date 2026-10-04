# AROHA --- Master Product Specification & Build Prompt

## 1. Product Identity

**Product:** AROHA

**Core idea:**

> **AROHA is an AI-powered real-life personal growth and progression
> system that turns everyday life into an evolving RPG.**

AROHA is designed for **people in general**, not only students.
Students, professionals, creators, entrepreneurs, athletes, learners, or
anyone who wants to improve can use the same underlying system.

AROHA should not be positioned primarily as:

-   a student app
-   a job portal
-   a productivity app
-   a habit tracker
-   a learning platform
-   a meditation app
-   a social media app
-   a conventional fitness app
-   a traditional video game

Those can be components or use cases.

The core product is a **personal growth operating system** where the
user's real life becomes the game.

### Core philosophy

> **The game is your real life. AROHA gives you the quests, path,
> mentor, feedback, progression, and motivation to live it better.**

The system should encourage users to:

**Move → Think → Learn → Create → Connect → Explore → Accomplish →
Reflect → Grow**

------------------------------------------------------------------------

# 2. Core Product Loop

The fundamental AROHA loop is:

``` text
PERSON
  ↓
PERSONAL IDENTITY
  ↓
GOALS + INTERESTS + CURRENT STATE
  ↓
AI UNDERSTANDING
  ↓
PERSONAL ROADMAP
  ↓
DAILY QUESTS
  ↓
REAL-WORLD ACTION
  ↓
COMPLETION / EVIDENCE
  ↓
XP
  ↓
STATS + SKILLS
  ↓
LEVELS + ACHIEVEMENTS
  ↓
CHARACTER EVOLUTION
  ↓
AI REFLECTION + ANALYSIS
  ↓
ADAPTIVE NEXT QUESTS
  ↓
CONTINUOUS PERSONAL GROWTH
  ↺
```

The **Daily Quest system is the heart of AROHA**.

Everything else should support, enrich, or explain this loop.

------------------------------------------------------------------------

# 3. Daily Quest System --- Highest Priority

Every day AROHA should create a personalized set of quests.

The core categories are:

## 💪 PHYSICAL

Examples:

-   Gym workout
-   Home workout
-   Running
-   Walking
-   Cycling
-   Sports
-   Stretching
-   Mobility
-   Outdoor activity
-   Basic movement

Example:

> **Move Your Body**\
> Complete a 30-minute workout.\
> **+40 XP**

The system must adapt to the person's ability, preferences, available
time, and recent activity.

A gym user may receive a gym quest.

Someone who does not have access to a gym may receive:

> 30-minute home workout

or:

> 30-minute walk

The objective is physical development, not forcing one specific
lifestyle.

------------------------------------------------------------------------

## 🧠 MENTAL

Examples:

-   Meditation
-   Breathing exercises
-   Mindfulness
-   Journaling
-   Reflection
-   Quiet time
-   Digital break
-   Gratitude
-   Mental reset

Example:

> **Clear Your Mind**\
> Meditate for 10 minutes.\
> **+25 XP**

Mental quests should be supportive and should not be framed as medical
treatment or diagnosis.

------------------------------------------------------------------------

## 📚 LEARNING

Every day should provide an opportunity to learn something.

Possible quests:

-   Read 10--20 pages of a book
-   Complete a lesson
-   Practice a skill
-   Learn a new concept
-   Study a subject
-   Explore a new topic
-   Watch an educational resource
-   Complete a small practical exercise

### AROHA AI Learning Fallback

If the user does not want to read, has no book, or does not have a
suitable learning activity, AROHA's AI Mentor should provide a short
learning experience.

Examples:

-   Why do humans dream?
-   How does compound interest work?
-   How do neural networks learn?
-   How does memory work?
-   Why do we procrastinate?
-   How do black holes form?
-   How does a startup make money?
-   How does the immune system work?

The AI should personalize learning according to:

-   interests
-   existing knowledge
-   goals
-   previous topics
-   curiosity
-   skill level

Learning should become a progressive knowledge journey rather than a
random collection of facts.

------------------------------------------------------------------------

## 🤝 SOCIAL

Examples:

-   Call a friend
-   Talk to family
-   Have a meaningful conversation
-   Talk to someone new
-   Thank someone
-   Help someone
-   Meet someone offline
-   Participate in a group activity
-   Spend time with someone without constantly checking the phone

Example:

> **Human Connection**\
> Have a meaningful 15-minute conversation without checking your phone.\
> **+30 XP**

The social system should encourage genuine human connection and must not
become another infinite-scroll social network.

------------------------------------------------------------------------

## 🎯 PERSONAL GOAL

Every user should have meaningful personal goals.

Examples:

-   Learn programming
-   Learn guitar
-   Build an application
-   Start a business
-   Improve communication
-   Become fitter
-   Learn photography
-   Write a book
-   Learn a language
-   Prepare for an exam
-   Build a portfolio
-   Travel
-   Improve discipline

AROHA converts a large goal into a small actionable quest for today.

Example:

**Goal:** Build an app

Today's quest:

> Spend 45 minutes implementing the authentication screen.

**Goal:** Learn guitar

Today's quest:

> Practice three chords for 20 minutes.

**Goal:** Start a business

Today's quest:

> Interview one potential customer.

This is the connection between the user's long-term ambitions and
today's real-world actions.

------------------------------------------------------------------------

# 4. Balanced Daily Quest Generation

AROHA should not simply give the user dozens of tasks.

The AI should generate a **balanced, achievable daily experience**.

A typical day might contain:

``` text
💪 PHYSICAL
30-minute workout

🧠 MENTAL
10-minute meditation

📚 LEARNING
Read 15 pages

🤝 SOCIAL
Call someone you care about

🎯 PERSONAL GOAL
45 minutes toward your major goal
```

On another day it may include creativity or experience quests as
optional or additional quests.

The AI should consider:

-   goals
-   available time
-   recent activity
-   energy/preferences supplied by the user
-   current progress
-   missed quests
-   active challenges
-   skills
-   interests
-   recent workload
-   reflection history
-   weak life areas
-   strong life areas
-   current streaks
-   Shadow Debt
-   recent achievements

The system should prioritize **quality and balance over quantity**.

------------------------------------------------------------------------

# 5. AI Mentor

The AI Mentor is the intelligence layer across AROHA.

It should understand the user's long-term journey.

It should be able to:

-   understand goals
-   generate roadmaps
-   generate daily quests
-   teach concepts
-   recommend activities
-   explain difficult topics
-   analyze progress
-   identify skill gaps
-   adjust difficulty
-   suggest experiments
-   recommend new interests
-   generate reflections
-   identify behavioral patterns
-   help users prioritize
-   adapt future quests

The AI should feel like a **personal mentor and guide**, not merely a
chatbot.

Example:

> "You've focused heavily on your personal goal this week, but your
> physical activity has dropped. Let's make today's physical quest
> simple and achievable."

Another:

> "You completed the fundamentals of Python. Instead of another
> tutorial, today's learning quest will be a small project."

------------------------------------------------------------------------

# 6. AI Architecture Rule

The AI should **recommend and generate**, but the application backend
must control authoritative game state.

The AI must NOT directly decide:

-   final XP balances
-   level values
-   achievement unlocks
-   database ownership
-   security permissions
-   authoritative quest completion
-   user identity
-   core progression calculations

Use deterministic application logic for these.

Recommended flow:

``` text
AI generates structured quest recommendation
        ↓
Backend validates schema
        ↓
Backend applies product rules
        ↓
User completes quest
        ↓
Backend validates completion
        ↓
Backend awards XP
        ↓
Backend updates stats
        ↓
Backend checks achievements
        ↓
Backend updates progression
```

This prevents AI hallucinations from corrupting game state.

------------------------------------------------------------------------

# 7. Personal Identity / Character

Each user has a living AROHA character.

It contains:

-   name
-   avatar
-   interests
-   goals
-   skills
-   achievements
-   experiences
-   stats
-   completed quests
-   active challenges
-   projects
-   reflections
-   progression history

The character should evolve with the user's real-world progress.

The profile should communicate:

> **"This is who I am and what I have become through my actions."**

------------------------------------------------------------------------

# 8. Goal System

Users can create goals across any life area.

Each goal should support:

-   title
-   description
-   category
-   motivation
-   target
-   deadline, if applicable
-   milestones
-   required skills
-   current progress
-   roadmap
-   related quests
-   status

Goals should be broken down into:

``` text
Goal
 ↓
Milestones
 ↓
Missions
 ↓
Daily Actions
 ↓
Completion
```

------------------------------------------------------------------------

# 9. AI Personal Roadmap

For meaningful goals, AROHA should create a personalized roadmap.

Example:

``` text
Goal: Become a programmer

Fundamentals
 ↓
Programming language
 ↓
Problem solving
 ↓
Tools
 ↓
Projects
 ↓
Advanced skills
 ↓
Mastery
```

The roadmap should be adaptive.

If the user already knows something, skip or compress it.

If the user struggles, add foundational practice.

If the user progresses rapidly, increase difficulty.

------------------------------------------------------------------------

# 10. Missions

Missions are medium-sized objectives inside a larger goal.

Example:

**Goal: Build an app**

-   Mission 1: Learn frontend fundamentals
-   Mission 2: Build the interface
-   Mission 3: Add authentication
-   Mission 4: Build backend
-   Mission 5: Add database
-   Mission 6: Deploy
-   Mission 7: Publish

Missions bridge the gap between long-term goals and daily quests.

------------------------------------------------------------------------

# 11. Quests and Challenges

AROHA supports both normal daily quests and temporary challenges.

Examples:

-   7-Day Reading Challenge
-   30-Day Fitness Challenge
-   14-Day Coding Challenge
-   30-Day Meditation Challenge
-   Build Something in 48 Hours
-   Explore Something New
-   Digital Break Challenge

Challenges can award:

-   XP
-   achievements
-   titles
-   character progression
-   skill progress

------------------------------------------------------------------------

# 12. XP System

XP represents real-world progress.

Example values:

  Action                Example XP
  ------------------- ------------
  Small quest                  +10
  Meditation                   +20
  Reading                      +25
  Learning                     +25
  Social quest                 +30
  Workout                      +40
  Difficult mission            +75
  Project                     +100
  Major goal                  +500

These are example values, not fixed requirements.

The system should reward **meaningful actions**, not app usage.

Do not allow users to farm XP by repeatedly opening screens or
performing meaningless actions.

------------------------------------------------------------------------

# 13. Levels

XP contributes to character levels.

Example:

-   Level 1 --- Beginner
-   Level 10 --- Explorer
-   Level 25 --- Practitioner
-   Level 50 --- Advanced
-   Level 100 --- Master

Levels can unlock:

-   new quest types
-   challenges
-   visual character changes
-   titles
-   skill paths
-   achievements

Levels are representations of progression inside AROHA, not a judgment
of human worth.

------------------------------------------------------------------------

# 14. Stats / Attributes

AROHA should represent multiple dimensions of growth.

Suggested attributes:

### 🧠 Intellect

Learning, reasoning, knowledge, problem solving.

### 💪 Strength

Physical development and fitness.

### 🗣️ Social

Communication, relationships and social confidence.

### 🎨 Creativity

Creation, art, design and creative thinking.

### 🎯 Discipline

Consistency, follow-through and completing difficult objectives.

### 🛠️ Skills

Practical abilities developed through learning and practice.

Stats should be influenced by meaningful activity and should not pretend
to measure complex human qualities with scientific precision.

------------------------------------------------------------------------

# 15. Skill Trees

Skills should have visual progression trees.

Example:

``` text
PROGRAMMING
├── Fundamentals
├── Python
│   ├── Syntax
│   ├── OOP
│   └── Advanced Python
├── Web Development
├── Backend
├── Databases
└── AI / ML
```

Other possible trees:

-   Fitness
-   Music
-   Photography
-   Business
-   Writing
-   Languages
-   Cooking
-   Art
-   Leadership
-   Communication

Users should be able to see:

> What I know → What I've unlocked → What I can learn next.

------------------------------------------------------------------------

# 16. Unlock System

Progress should unlock new experiences.

Example:

``` text
Basic Photography
 ↓
Intermediate Photography
 ↓
Advanced Photography
 ↓
Photography Projects
 ↓
Mastery Challenges
```

Unlocks should feel meaningful and connected to demonstrated progress.

------------------------------------------------------------------------

# 17. Achievements

AROHA should record meaningful milestones.

Examples:

-   First Quest
-   First Project
-   First Book Completed
-   7-Day Challenge
-   30-Day Challenge
-   100 Quests Completed
-   First App Built
-   First Public Performance
-   First Major Goal
-   Skill Mastery

Achievements become part of the user's growth history.

------------------------------------------------------------------------

# 18. Streaks

Track consistency for appropriate activities.

Examples:

-   Reading --- 14 days
-   Meditation --- 21 days
-   Exercise --- 8 days

But:

> **Streaks are secondary. Progress is primary.**

Missing a day must not erase all meaningful progress or create
unnecessary guilt.

------------------------------------------------------------------------

# 19. Projects

Users should build real things.

Examples:

-   Programming → application
-   Writing → article/book
-   Photography → portfolio
-   Music → recording
-   Art → collection
-   Business → product
-   Learning → practical demonstration

Projects create evidence of capability.

------------------------------------------------------------------------

# 20. Proof of Skill

AROHA should distinguish:

> "I say I know this."

from:

> "I have demonstrated this."

Evidence can include:

-   projects
-   assessments
-   completed challenges
-   practice
-   achievements
-   experiences

The system should increasingly emphasize:

**Proof \> Claims**

------------------------------------------------------------------------

# 21. Skill Passport

The Skill Passport is the user's living record of capability.

It can contain:

-   skills
-   levels
-   projects
-   achievements
-   assessments
-   challenges
-   experiences
-   milestones
-   mastery areas

It should evolve continuously.

------------------------------------------------------------------------

# 22. Life Areas

AROHA must support the whole person.

Potential life areas:

-   💪 Physical
-   🧠 Mental
-   📚 Learning
-   🎨 Creativity
-   🤝 Social
-   🎯 Personal Goals
-   🌎 Experiences
-   💼 Career
-   💰 Financial development
-   🛠️ Skills
-   ❤️ Relationships
-   🌱 Personal development

These areas should feed into Daily Quest generation.

Career is only one life area, not the definition of AROHA.

------------------------------------------------------------------------

# 23. Multiple Life Paths

Users can pursue several areas at once.

Example:

``` text
Career: Software Development
Health: Fitness
Knowledge: Psychology
Creativity: Music
Social: Communication
Personal: Discipline
```

AROHA should help users balance these paths.

------------------------------------------------------------------------

# 24. Adaptive Difficulty

Quest difficulty should adapt.

If a task is too easy:

→ increase challenge.

If it is too hard:

→ break it down.

If the user repeatedly fails:

→ identify obstacles and redesign the task.

If the user progresses rapidly:

→ increase complexity.

The objective is an appropriate challenge, not maximum difficulty.

------------------------------------------------------------------------

# 25. Assessments

AROHA should periodically test genuine improvement.

Possible assessment types:

-   quizzes
-   practical tasks
-   projects
-   simulations
-   challenges
-   self-assessments
-   AI-assisted evaluations

Completing a lesson should not automatically equal mastery.

------------------------------------------------------------------------

# 26. Skill Gap Analysis

Compare:

**Current capability**

against:

**Desired capability**

Example:

``` text
Goal: Full-stack development

JavaScript   70%
React        45%
Backend      30%
Database     40%
```

AROHA identifies the most useful next skills.

------------------------------------------------------------------------

# 27. Daily Planner

The planner converts long-term goals into today's actions.

Instead of:

> "Become a better programmer."

AROHA provides:

``` text
Today's Personal Goal Quest

☐ Study JavaScript for 30 minutes
☐ Solve 3 problems
☐ Work on project for 30 minutes
```

The planner must remain lightweight and connected to the Daily Quest
system.

------------------------------------------------------------------------

# 28. Habit System

AROHA can support recurring behaviors:

-   exercise
-   reading
-   meditation
-   guitar practice
-   coding
-   sleep routine
-   other user-defined habits

But habits are only one part of the system.

AROHA should not become just a habit tracker.

------------------------------------------------------------------------

# 29. Shadow Debt

Shadow Debt is AROHA's accountability mechanic.

When users repeatedly commit to quests and leave them unfinished, the
system can track unresolved commitments as Shadow Debt.

Purpose:

> **Help users recognize when they are committing to more than they can
> realistically complete.**

It should not be punitive or psychologically manipulative.

AROHA should use it to encourage:

-   better planning
-   realistic commitments
-   completion
-   reflection
-   reducing unnecessary commitments

------------------------------------------------------------------------

# 30. Character Evolution

The character/avatar should evolve through progression.

Example:

``` text
Novice
 ↓
Explorer
 ↓
Builder
 ↓
Master
```

Evolution can reflect:

-   XP
-   levels
-   achievements
-   skills
-   milestones
-   experiences

The visual character becomes a representation of the journey.

------------------------------------------------------------------------

# 31. Rank System

Different skills can have independent ranks.

Example:

``` text
Programming → Expert
Guitar → Beginner
Fitness → Intermediate
Photography → Advanced
```

Do not reduce the user to a single universal score.

A person is multidimensional.

------------------------------------------------------------------------

# 32. Real-World Quests

AROHA should regularly encourage users to experience life outside the
app.

Examples:

-   visit somewhere new
-   try a new sport
-   talk to someone new
-   attend an event
-   learn from another person
-   explore a new place
-   spend time outdoors
-   try a new activity

The app should encourage **real life over screen time** whenever
appropriate.

------------------------------------------------------------------------

# 33. Social Layer

Users can eventually connect around goals and interests.

Examples:

-   people learning programming
-   people learning music
-   people training for a marathon
-   people reading the same book
-   people completing the same challenge

The social layer should prioritize:

**Connection → Collaboration → Accountability → Real-world action**

It should not become an infinite-scroll social network.

------------------------------------------------------------------------

# 34. Guilds / Teams

Users can eventually form groups around shared quests.

Examples:

### Fitness Guild

People completing a fitness challenge.

### Coding Guild

People building projects together.

### Reading Guild

People reading the same book.

### Startup Guild

People exploring entrepreneurship.

Possible functionality:

-   shared quests
-   team XP
-   group challenges
-   team achievements
-   progress boards

For the first version, these should use realistic seeded/mock data
rather than requiring genuine multiplayer accounts.

------------------------------------------------------------------------

# 35. Leaderboards

Optional competitive views may display:

-   XP
-   completed challenges
-   achievements
-   progress
-   contributions

The design principle is:

> **You vs. your previous self should matter more than you vs. everyone
> else.**

Leaderboards should never become the central experience.

------------------------------------------------------------------------

# 36. Mentorship

Experienced users can eventually mentor others.

Example:

``` text
Expert
 ↓
Mentor
 ↓
Beginner
```

This can create:

**Learn → Master → Help Others → Grow**

For the first version, mentorship can be represented through seeded/mock
data if necessary.

------------------------------------------------------------------------

# 37. Personal Analytics

AROHA should show development over time.

Example:

``` text
6 MONTH PROGRESS

Programming      █████████░ 90%
Fitness          ███████░░░ 70%
Communication    ██████░░░░ 60%
Creativity       ████████░░ 80%
Discipline       ███████░░░ 70%
```

The numbers are product-level progress indicators, not clinical or
scientific measurements.

AI should explain:

-   what improved
-   what declined
-   which goals progressed
-   which areas were neglected
-   what behaviors appeared useful
-   what the user may want to change

------------------------------------------------------------------------

# 38. AI Life Analysis

AROHA should identify useful patterns.

Examples:

> "You complete difficult tasks more consistently in the morning."

> "Your programming progress increased after you started building
> projects."

> "You have five active goals but are only consistently progressing on
> two."

> "Your physical activity has decreased over the last three weeks."

The purpose is self-awareness and better decision-making.

------------------------------------------------------------------------

# 39. AI Recommendations

AROHA can proactively suggest:

> "You might enjoy learning photography."

> "You're ready for a harder programming challenge."

> "You've completed the fundamentals. Build something next."

> "You have too many active goals. Consider focusing on your top two."

Recommendations must be based on the user's context and history rather
than generic spam.

------------------------------------------------------------------------

# 40. Life Direction Discovery

AROHA should help people who do not know what they want.

Use:

-   interests
-   strengths
-   experiences
-   assessments
-   experiments
-   reflections
-   performance

Flow:

``` text
Explore
 ↓
Try
 ↓
Reflect
 ↓
Discover
 ↓
Choose
 ↓
Pursue
```

The system should not claim to scientifically determine a person's one
"true purpose."

It should help them discover possibilities through action and
reflection.

------------------------------------------------------------------------

# 41. Experiment Mode

Users can temporarily explore an area without making a permanent
commitment.

Examples:

-   Try coding for 14 days
-   Try photography for 7 days
-   Try entrepreneurship for 30 days
-   Try meditation for 10 days
-   Try writing for 14 days

After the experiment, ask:

-   Did you enjoy it?
-   Were you interested?
-   Did you improve?
-   Do you want to continue?
-   What did you learn?

This makes self-discovery practical.

------------------------------------------------------------------------

# 42. Journal / Reflection

After meaningful quests or at the end of the day, AROHA can ask:

-   What did you learn today?
-   What was difficult?
-   What are you proud of?
-   What would you do differently?
-   How did today's progress feel?

The AI can use reflections to improve future recommendations.

------------------------------------------------------------------------

# 43. Life Timeline

AROHA should maintain a chronological record of meaningful growth.

Example:

``` text
2026

• Learned Python
• Built first application
• Started exercising
• Completed a 30-day challenge
• Read 12 books
• Joined a project

2027

• Launched a product
• Learned guitar
• Completed major fitness challenge
• Built a major project
```

This becomes:

> **The story of the user's growth.**

------------------------------------------------------------------------

# 44. The AROHA Daily Experience

When the user opens AROHA, the primary experience should immediately
show today's journey.

Example:

``` text
GOOD MORNING 👋

Your journey continues.

Today's focus:
Become 1% better.

━━━━━━━━━━━━━━━━━━

💪 PHYSICAL
30 min workout
+40 XP

🧠 MENTAL
10 min meditation
+25 XP

📚 LEARNING
Read 15 pages
+25 XP

🤝 SOCIAL
Call someone you care about
+30 XP

🎯 PERSONAL GOAL
Work 45 min on your project
+50 XP

━━━━━━━━━━━━━━━━━━

POTENTIAL XP
+170 XP

LEVEL 18
███████░░░ 72%

"Small actions become extraordinary lives."
```

The exact quests must change based on the user's state.

------------------------------------------------------------------------

# 45. End-of-Day Reflection

At the end of the day, AROHA should provide a simple reflection
experience.

Example:

``` text
TODAY'S JOURNEY

Completed: 4 / 5

+145 XP

💪 Physical      ✓
🧠 Mental        ✓
📚 Learning      ✓
🤝 Social        ✓
🎯 Personal      —

What went well?
What did you learn?
What should tomorrow look like?
```

The AI can summarize the day and use the information to improve
tomorrow's quests.

------------------------------------------------------------------------

# 46. Weekly / Long-Term Review

AROHA should periodically summarize progress.

Example:

``` text
YOUR WEEK

Quests completed: 27
XP earned: 640
New skills: 2
Goals progressed: 3
Challenges completed: 1

Strongest area:
Learning

Needs attention:
Physical

AI insight:
"You made strong progress on your programming goal,
but your physical activity dropped. Next week we'll
reduce the size of your coding quests slightly and
add realistic movement goals."
```

------------------------------------------------------------------------

# 47. Architecture Direction

For the first version, use:

### Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   shadcn/ui

### Backend

-   Next.js App Router
-   Server Actions / API routes
-   Prisma ORM
-   PostgreSQL

### AI

-   API-based AI model
-   Structured outputs
-   Dedicated AI service layer
-   Provider abstraction so the model can be changed later

### Authentication

For the first MVP:

-   Keep the experience single-user/no-login if appropriate.
-   Do not spend the majority of development effort on authentication.
-   Keep the architecture modular so real accounts can be introduced
    later.

------------------------------------------------------------------------

# 48. MVP Multi-User Decision

For the first implementation:

> **Stay single-user and mock the social parts.**

Do not implement genuine multiplayer accounts yet.

Social features such as:

-   social profiles
-   guilds
-   leaderboards
-   mentorship

can use realistic seeded data to demonstrate the UI and product
direction.

However, the architecture should avoid decisions that make future
multi-user support unnecessarily difficult.

------------------------------------------------------------------------

# 49. Development Strategy

Use:

> **Breadth first, then iterate.**

AROHA has many interconnected feature areas.

The first pass should provide functional foundations across the major
areas rather than spending all development time polishing one feature.

However:

> **Breadth does NOT mean shallow fake features.**

The core AROHA loop must be deep and real.

### Highest priority

1.  Daily Quest system
2.  AI Mentor
3.  Physical quests
4.  Mental quests
5.  Learning quests
6.  Social quests
7.  Personal Goal quests
8.  Goals
9.  Roadmaps
10. XP
11. Stats
12. Levels
13. Skills
14. Achievements
15. Streaks
16. Character progression
17. Reflection
18. Adaptive recommendations
19. Analytics

Secondary features can initially be simpler but must have proper
foundations.

------------------------------------------------------------------------

# 50. What NOT To Build Yet

Do NOT spend significant effort on:

-   real job marketplace
-   opportunity marketplace
-   organization/company platform
-   genuine multi-user authentication
-   complex multiplayer infrastructure
-   advanced guild backend
-   production-grade leaderboard infrastructure
-   complex mentorship marketplace

These are intentionally deferred.

The first version should prove that the **individual AROHA experience is
valuable and engaging**.

------------------------------------------------------------------------

# 51. Product Quality Rule

Do not create 40 beautiful screens with fake buttons.

Each feature should be classified as:

### Functional

Actually works and persists meaningful state.

### Seeded / Demonstration

Used only where the feature is intentionally deferred.

### Future

Architected conceptually but not implemented.

Never claim a feature is complete if it is only a visual placeholder.

------------------------------------------------------------------------

# 52. Data Model Direction

The database should be designed around the core entities.

Potential entities:

``` text
User / Profile
Goals
Goal Milestones
Roadmaps
Missions
Quests
Quest Completions
Daily Quest Sets
Skills
Skill Trees
Skill Progress
Stats
XP Transactions
Levels
Achievements
User Achievements
Streaks
Challenges
Projects
Assessments
Experiments
Journal Entries
Reflections
Life Timeline Events
Analytics Snapshots
AI Recommendations
Shadow Debt
Character / Avatar
```

The schema should keep progression auditable.

For example, XP should preferably be represented through
transactions/events rather than only storing one unexplained total.

------------------------------------------------------------------------

# 53. Quest Completion and Evidence

Quest completion should be meaningful.

Depending on the quest, the user may:

-   manually mark completion
-   provide a reflection
-   enter a result
-   attach evidence where appropriate
-   complete an in-app assessment
-   record a measurable result

Do not require intrusive verification for every normal life activity.

AROHA should balance trust, usability, and meaningful progress.

------------------------------------------------------------------------

# 54. Personalization

AROHA should become more personalized over time.

It should learn from:

-   completed quests
-   skipped quests
-   abandoned quests
-   user feedback
-   reflections
-   interests
-   goal changes
-   difficulty feedback
-   learning history
-   project history
-   preferred activities

The AI should use this information to improve future quests.

------------------------------------------------------------------------

# 55. Recovery and Flexibility

AROHA should understand that life is not perfectly consistent.

If a user is busy or exhausted:

``` text
Normal day:
30 min workout

Low-energy day:
10 min walk
```

If a user misses a quest:

Do not shame them.

Instead:

> "No problem. What got in the way?"

Then adjust the next plan.

The system should encourage sustainable growth rather than compulsive
completion.

------------------------------------------------------------------------

# 56. Screen-Time Philosophy

AROHA should not require users to spend large amounts of time inside
AROHA.

The ideal interaction is:

``` text
Open AROHA
 ↓
Understand today's quests
 ↓
Leave the app
 ↓
Live life
 ↓
Complete real-world actions
 ↓
Return to record/refelect
 ↓
Grow
```

The app should be the **guide and dashboard**, not the destination.

------------------------------------------------------------------------

# 57. Design Philosophy

The UI should feel:

-   modern
-   immersive
-   motivating
-   clean
-   slightly game-like
-   personal
-   premium
-   approachable
-   not childish
-   not corporate
-   not overwhelming

The RPG elements should enhance the experience without making AROHA look
like a conventional fantasy game.

The user should feel:

> "This is my life dashboard."

not:

> "I'm playing a fictional game."

------------------------------------------------------------------------

# 58. Navigation Concept

A possible primary navigation:

``` text
HOME
  ↓
TODAY'S QUESTS

GOALS
  ↓
ROADMAPS / MISSIONS

CHARACTER
  ↓
LEVEL / XP / STATS / SKILLS

JOURNEY
  ↓
TIMELINE / ACHIEVEMENTS / PROJECTS

DISCOVER
  ↓
LEARNING / EXPERIMENTS / NEW EXPERIENCES

MENTOR
  ↓
AI CONVERSATION / INSIGHTS / RECOMMENDATIONS
```

The exact navigation can be refined during implementation.

------------------------------------------------------------------------

# 59. Core User Experience

A new user should experience:

``` text
ONBOARDING
 ↓
Tell AROHA about yourself
 ↓
Choose interests
 ↓
Choose life areas
 ↓
Create or discover goals
 ↓
AI creates initial roadmap
 ↓
AROHA generates first Daily Quest
 ↓
User completes real-world action
 ↓
XP earned
 ↓
Stats updated
 ↓
Character progresses
 ↓
AI reflects
 ↓
Tomorrow becomes personalized
```

The onboarding should not be unnecessarily long.

------------------------------------------------------------------------

# 60. First-Time User Example

User says:

> "I want to become healthier, learn programming, read more and improve
> my confidence."

AROHA creates:

### Goals

-   Health
-   Programming
-   Reading
-   Confidence

### Today's quests

💪 **Physical**\
20-minute walk

🧠 **Mental**\
5-minute meditation

📚 **Learning**\
Read 10 pages or complete a 10-minute AI programming lesson

🤝 **Social**\
Start one conversation with someone

🎯 **Personal Goal**\
Complete 20 minutes of programming practice

At the end:

> **4/5 completed**

AROHA awards XP, updates stats, records the activity, asks for
reflection, and adapts tomorrow's quests.

------------------------------------------------------------------------

# 61. AROHA's Fundamental Principles

1.  **Real life is the game.**
2.  **Action is more important than intention.**
3.  **Skills are more valuable than claims.**
4.  **Proof is better than empty credentials.**
5.  **Building is better than passive consumption.**
6.  **Consistency is better than perfection.**
7.  **Progress matters more than comparison.**
8.  **Curiosity should be encouraged.**
9.  **The app should lead users into real life, not trap them inside
    it.**
10. **Personalization is more important than one-size-fits-all
    routines.**
11. **Users should be able to explore before committing.**
12. **The system should adapt to real life rather than punish people for
    having one.**
13. **The user controls their life; AROHA provides guidance.**

------------------------------------------------------------------------

# 62. AROHA in One Sentence

> **AROHA is an AI-powered real-life RPG that turns personal growth into
> a personalized daily quest journey across physical health, mental
> well-being, learning, social connection, creativity, experiences,
> skills, and personal goals.**

------------------------------------------------------------------------

# 63. AROHA in One Short Pitch

> **AROHA turns your life into a game---but the rewards happen in real
> life.**

------------------------------------------------------------------------

# 64. MASTER BUILD PROMPT

Use the following as the direct instruction to an AI coding agent:

------------------------------------------------------------------------

## BUILD AROHA

Build **AROHA**, an AI-powered real-life personal growth and progression
system.

AROHA is NOT student-only. It is for anyone who wants to grow across
different areas of life.

The core idea is:

> **The game is your real life. AROHA gives you the quests, mentor,
> progression, feedback, and structure to become a better version of
> yourself.**

The **Daily Quest system is the central product experience**.

Every day, AROHA should generate a personalized set of quests covering:

-   💪 PHYSICAL
-   🧠 MENTAL
-   📚 LEARNING
-   🤝 SOCIAL
-   🎯 PERSONAL GOAL

Additional life areas such as creativity, experiences, career, skills,
finance, relationships, and personal development should be supported and
can appear as optional/additional quests where appropriate.

### Daily Quest examples

💪 PHYSICAL: - Gym - Workout - Walk - Run - Stretch - Sport

🧠 MENTAL: - Meditation - Breathing - Reflection - Journaling - Digital
break

📚 LEARNING: - Read 10--20 pages - Practice a skill - Learn a concept -
Complete a lesson - Or, if the user does not have a learning activity,
let the AI Mentor teach them something new and useful

🤝 SOCIAL: - Call a friend - Talk to family - Meet someone - Have a
meaningful conversation - Help someone

🎯 PERSONAL GOAL: Generate one actionable step toward the user's current
major goal.

The AI should dynamically choose appropriate quests based on the user's
goals, history, preferences, progress, available time, recent activity,
missed quests, interests, and reflections.

Do not generate a huge checklist. Create a balanced and achievable day.

------------------------------------------------------------------------

## AI MENTOR

Implement an AI Mentor that handles:

-   personalized roadmap generation
-   daily quest generation
-   learning experiences
-   progress analysis
-   skill-gap analysis
-   adaptive difficulty
-   recommendations
-   reflection summaries
-   life-direction exploration
-   experiment recommendations

Use structured outputs and validate AI responses.

Keep the AI provider behind a dedicated service abstraction so it can be
changed later.

IMPORTANT:

The AI generates recommendations, but the backend owns authoritative
game logic.

The backend must deterministically calculate:

-   XP
-   levels
-   stats
-   achievements
-   streaks
-   quest completion
-   progression
-   unlocks

Never allow the AI to directly modify authoritative progression state.

------------------------------------------------------------------------

## CORE RPG SYSTEM

Implement:

-   XP
-   levels
-   stats
-   skills
-   skill trees
-   achievements
-   streaks
-   challenges
-   character evolution
-   ranks
-   unlocks

Progress must be connected to meaningful real-world activity.

------------------------------------------------------------------------

## PERSONAL DEVELOPMENT SYSTEM

Implement:

-   personal identity
-   goals
-   milestones
-   missions
-   AI roadmaps
-   projects
-   assessments
-   skill-gap analysis
-   Skill Passport
-   experiments
-   journal/reflection
-   life timeline
-   personal analytics
-   AI insights
-   recommendations
-   Shadow Debt

------------------------------------------------------------------------

## DAILY EXPERIENCE

The Home screen must prioritize today's quests.

The user should immediately understand:

-   what today's quests are
-   why they were selected
-   how much XP they can earn
-   their current level
-   their progress
-   their major goal
-   what they have already completed

The user should be able to complete a quest quickly and return to real
life.

------------------------------------------------------------------------

## END-OF-DAY EXPERIENCE

Provide:

-   completed quests
-   XP earned
-   progress
-   reflection
-   AI summary
-   suggestions for tomorrow

Use reflections and results to improve future quest generation.

------------------------------------------------------------------------

## ARCHITECTURE

Use:

-   Next.js App Router
-   React
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Next.js Server Actions/API routes
-   Prisma
-   PostgreSQL
-   API-based AI with structured outputs

Use a modular architecture.

Separate:

-   UI
-   business logic
-   database
-   progression engine
-   AI services
-   quest generation
-   analytics

Do not tightly couple AI code to UI components.

------------------------------------------------------------------------

## FIRST VERSION SCOPE

For this version:

-   Focus on a strong single-user experience.
-   Do NOT implement real multi-user authentication yet.
-   Social Layer, Guilds, Leaderboards, and Mentorship may use realistic
    seeded/mock data.
-   Do NOT build the Opportunity Marketplace.
-   Do NOT build the Organizations/company platform.
-   Keep future multi-user expansion possible.

Use breadth-first development, but give the deepest implementation to:

1.  Daily Quest system
2.  AI Mentor
3.  Physical quests
4.  Mental quests
5.  Learning quests
6.  Social quests
7.  Personal Goal quests
8.  Goals
9.  Roadmaps
10. XP
11. Stats
12. Levels
13. Skills
14. Achievements
15. Streaks
16. Character progression
17. Reflection
18. Analytics
19. Adaptive recommendations

Do not create fake functionality merely to make a feature appear
complete.

------------------------------------------------------------------------

## PRODUCT QUALITY

Prioritize a complete working loop over a large number of disconnected
pages.

The critical loop is:

``` text
USER
 ↓
GOALS
 ↓
AI UNDERSTANDS USER
 ↓
DAILY QUESTS
 ↓
REAL-WORLD ACTION
 ↓
COMPLETE
 ↓
XP
 ↓
STATS
 ↓
LEVEL
 ↓
SKILLS / ACHIEVEMENTS
 ↓
REFLECTION
 ↓
AI ADAPTATION
 ↓
NEXT DAY
```

Make this loop feel polished, motivating, responsive, and meaningful.

------------------------------------------------------------------------

## IMPORTANT UX PRINCIPLE

Do not turn AROHA into a productivity checklist.

The user should NOT feel:

> "I have 20 tasks to finish."

The user should feel:

> **"What can I do today that makes me a little better than
> yesterday?"**

The app should encourage:

**movement + mental clarity + curiosity + learning + human connection +
personal progress + real-world experiences.**

The ultimate goal is not maximizing app engagement.

The ultimate goal is:

> **Helping the user live a better, richer, more capable real life.**

------------------------------------------------------------------------

# FINAL PRODUCT STATEMENT

**AROHA is a real-life RPG powered by AI.**

The user chooses or discovers where they want to grow.

AROHA understands them.

AROHA creates the path.

AROHA gives them today's quests.

The user goes into the real world and completes them.

Their progress becomes XP, skills, stats, achievements, experiences, and
character evolution.

The AI learns from their journey.

Tomorrow's quests become smarter.

Over time:

> **The user does not simply level up inside AROHA. They level up in
> real life.**
