# Visit Collector — AI Instructions

1. When making code changes,
Never verify or test or build the code, 
just make minimal code changes and let the user look at the code diff and verify themselves before they commit.

2. Always try your best to structure code and imports like this:

code line 1
code line 2 - A
code line 3 - ABC

^ should be like a christmas tree where shortest line length is at the top going down to longest line length.

^ try your best to keep this structure its ok if it differs sometimes.

3. try to use SCSS over CSS whenever possible

4. in html or tsx or jsx, all elements should have a descriptive className and ID, especially if its rendered in a for loop or map. the ID can be like the Class but with the id or index of the element.
User should be able to inspect any element and see its class and then give that back to AI as reference.

5. when making buttons or clickable items, try your best to put icon text together. or icon only.

6. when making transitions, always prefer smooth transitions over flat static transitions.