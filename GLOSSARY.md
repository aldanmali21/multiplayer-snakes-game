# Snakes

A mobile multiplayer snake game where 1 to 4 players race on a shared board to reach a target Growth Score.

## Language

**Player**:
A person controlling one Snake in a Match.
_Avoid_: User, gamer

**Snake**:
The moving, growing line a Player steers around the Board.
_Avoid_: Worm, character

**Board**:
The walled grid that all Snakes in a Match share.
_Avoid_: Map, arena, field

**Wall**:
The Board's boundary; a Snake that touches it dies.
_Avoid_: Border, edge

**Fruit**:
An edible that appears on the Board and grants Growth when a Snake eats it.
_Avoid_: Food, edible, apple

**Growth Score**:
The number of Fruit a Snake has eaten in the current Match, equal to how much it has grown.
_Avoid_: Points, length

**Target Score**:
The Growth Score that wins the Match for the first Snake to reach it.
_Avoid_: Goal, win score

**Match**:
One round of play on a Board, from start until a Snake reaches the Target Score or no Snakes remain alive.
_Avoid_: Game, round, session

**Room**:
A lobby, joined with a short code, where 1 to 4 Players gather before a Match starts.
_Avoid_: Lobby, party

**Host**:
The Player whose phone creates the Room and runs the Match that the other phones join.
_Avoid_: Server, admin, owner

**Winner**:
The Player whose Snake first reaches the Target Score, or the longest Snake if all Snakes die first.
_Avoid_: Champion

**Species**:
Which of the 8 snake looks a Player plays as. In a Room each Species can be taken by only one Player.
_Avoid_: Skin, colour

**Match Settings**:
The Host's choices for a Match: the Target Score, how many Fruit are on the Board at once (1 to 10), whether walls kill, and whether Snakes crash into each other. When walls are off, a Snake leaving one edge comes back on the opposite edge. A Snake running into its own body always dies.
_Avoid_: Options, difficulty

**Pause**:
Any Player can stop a running Match for everyone; resuming runs a 3-second countdown first.
_Avoid_: Freeze
