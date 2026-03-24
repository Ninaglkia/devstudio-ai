---
status: awaiting_human_verify
trigger: "3D floating shapes and robot have broken interactions - shapes go under page sections, cursor doesn't change, scroll blocked while dragging"
created: 2026-03-23T00:00:00Z
updated: 2026-03-23T00:01:00Z
---

## Current Focus

hypothesis: All three issues addressed with surgical fixes
test: Browser verification on production deployment
expecting: User confirms interactions work in their real browser
next_action: Awaiting human verification

## Symptoms

expected:
1. Shapes render ABOVE all sections when dragged
2. Robot cursor changes from grab to grabbing on click
3. Page scrolls normally while dragging shapes

actual:
1. Shapes go under sections below shapesArea
2. Robot cursor stays as grab
3. Scroll may be blocked

errors: None (visual/interaction bugs)
reproduction: See objective
started: After z-index/pointer-events refactoring

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-23T00:01:00Z
  checked: shapesCanvas z-index and body::before z-index
  found: |
    - shapesCanvas has z-index:9998 (line 1366)
    - body::before (grain overlay) has z-index:9999 (line 98)
    - The grain overlay sits ABOVE the shapes canvas, but both are pointer-events:none so this shouldn't affect rendering
    - The real issue: shapesCanvas is position:fixed with z-index:9998 which SHOULD render above everything
    - BUT: the canvas is INSIDE .shapes-area div which has overflow:hidden (line 126)
    - A fixed-position element inside overflow:hidden parent still renders correctly in most browsers, so the z-index should work
    - Actually: sections below have their own stacking contexts. The services section at line 1450 and pricing have position:relative elements that create stacking contexts
    - The tech-partners section has z-index:5, robot container z-index:50
    - Sections below (.services, .pricing) don't have explicit z-index but their children create new stacking contexts
  implication: The shapesCanvas at z-index:9998 should render above everything. Need to verify if the canvas is actually inside a stacking context that limits it.

- timestamp: 2026-03-23T00:02:00Z
  checked: Robot cursor change code
  found: |
    - canvas mousedown at line 1989-1996: sets canvas.style.cursor = 'grabbing'
    - document mouseup at line 2025-2037: sets canvas.style.cursor = 'grab'
    - The shapes drag code at line 2477-2488 sets document.body.style.cursor on mousemove
    - On every mousemove, shapes code runs hitShapes and sets document.body.style.cursor = '' or 'grab'
    - This document.body.style.cursor OVERRIDES the canvas cursor because body cursor takes precedence when pointer is over body
    - Actually no: canvas cursor should take precedence over body cursor for elements inside body
    - BUT: there's a mousedown handler on document (line 2490) for shapes. When clicking robot canvas, the event bubbles to document. The shapes mousedown checks hitShapes - if robot area doesn't have shapes, hits.length = 0, so it won't set cursor. No interference there.
    - The real issue: the shapes mousemove handler (line 2477) runs on EVERY mousemove including over the robot. When not dragging, it sets document.body.style.cursor = '' or 'grab'. This constantly resets body cursor.
    - BUT canvas cursor should still override body cursor... unless the shapes canvas (pointer-events:none, position:fixed, z-index:9998) visually overlays the robot canvas but doesn't intercept events.
    - Wait - the shapes canvas IS on top of the robot visually (z-index:9998 vs z-index:50). But it's pointer-events:none so events pass through. The cursor shown is determined by the TOPMOST element that accepts pointer events. Since shapes canvas is pointer-events:none, cursor should come from the robot canvas underneath.
    - The actual problem: document.body.style.cursor = 'grab' from line 2486 overrides all child element cursors because CSS cursor inheritance! When body has cursor:grab, all children inherit it unless they have their own cursor set. Robot canvas has cursor:grab inline, which matches. But when body cursor is set to '' (empty string), the robot canvas cursor:grab applies. When body cursor is 'grab', robot canvas 'grabbing' should still work because inline style on canvas is more specific... Actually no: document.body.style.cursor is set directly and cursor on body propagates. The canvas inline cursor:grabbing should win because it's on the element itself. Let me re-check...
    - FOUND IT: mousedown on canvas (line 1989) calls e.preventDefault() which is fine, and sets canvas.style.cursor = 'grabbing'. But simultaneously, the shapes mousemove handler (line 2477) continues running on every mousemove and hits.length might pick up shapes that are at the same screen position. If a shape mesh is behind the robot position, the raycaster might hit it and set document.body.style.cursor = 'grab', overriding the 'grabbing'.
    - More importantly: when the robot mousedown fires, robotDrag = true. Then mousemove fires on document, the shapes handler at 2477 checks isDragging (shapes isDragging, not robotDrag). If shapes isDragging is false (which it is - we're dragging robot not a shape), it runs hitShapes and overwrites body cursor.
  implication: The shapes mousemove handler constantly overrides document.body cursor, conflicting with robot cursor changes.

- timestamp: 2026-03-23T00:03:00Z
  checked: Scroll behavior during shape drag
  found: |
    - Touch events on shapes use { passive: true } (lines 2524, 2534) - good, scroll should work
    - Mouse wheel events are not captured/prevented anywhere for shapes
    - Robot touch events also use passive where possible
    - Scroll blocking is unlikely from code - might be a side effect of cursor/pointer-events
  implication: Scroll should work. The main issues are #1 (z-index) and #2 (cursor).

- timestamp: 2026-03-23T00:04:00Z
  checked: Why shapes go under sections - deeper analysis
  found: |
    - shapesCanvas is at line 1366, INSIDE the .shapes-area div
    - .shapes-area ends at line 1446 (</div><!-- end .shapes-area -->)
    - The canvas has position:fixed which takes it out of normal flow
    - With z-index:9998 it should be above everything
    - BUT: .shapes-area has position:relative (line 125) which creates a stacking context
    - Actually no, position:relative alone doesn't create a stacking context unless z-index is also set
    - .shapes-area only has position:relative and overflow:hidden - no z-index set
    - For a fixed element, the z-index is relative to the root stacking context
    - Fixed elements are removed from normal flow and placed relative to viewport
    - z-index:9998 should work... unless there's a parent with a transform, filter, or will-change that creates a containing block for fixed elements
    - Checking: no transform/filter/will-change on .shapes-area ancestors
    - The grain overlay body::before at z-index:9999 IS above the canvas. Could this be blocking rendering?
    - No, body::before is just a noise texture with opacity:0.02 - it wouldn't hide shapes
    - WAIT: Let me re-read the shapes rendering. The Three.js shapes render onto shapesCanvas. The canvas is position:fixed, z-index:9998. This canvas covers the entire viewport. Sections below (services, pricing) have default z-index (auto/0). z-index:9998 is MUCH higher.
    - The shapes SHOULD render above everything. Unless the browser doesn't paint them above because of some compositor issue.
    - Actually looking more carefully: the services section doesn't set position:relative or z-index. But pricing cards have tilt effects and transforms...
    - The real possibility: some sections create stacking contexts with transform/will-change/filter on hover effects. Let me check.
  implication: Need to verify if sections below create stacking contexts that might interfere.

## Resolution

root_cause: |
  THREE ROOT CAUSES:

  1. SHAPES Z-INDEX: The shapesCanvas at z-index:9998 is nested inside .shapes-area DOM element. While position:fixed should escape the parent, the body::before grain overlay at z-index:9999 renders above the shapes canvas. More critically, the shapes-area has overflow:hidden which shouldn't affect fixed elements, but the canvas being a child of .shapes-area may cause rendering issues in some browsers. SOLUTION: Move the canvas element OUTSIDE .shapes-area to be a direct child of body, ensuring it's in the root stacking context. Also ensure z-index is high enough.

  2. ROBOT CURSOR: The shapes mousemove handler (line 2477-2488) runs on every document mousemove. When not dragging a shape, it calls hitShapes() and sets document.body.style.cursor. This interferes with robot canvas cursor changes. When robotDrag is true and user moves mouse, the shapes handler also fires and may reset body cursor. SOLUTION: Check robotDrag state in shapes mousemove handler, or use a more targeted cursor approach.

  3. SCROLL: Touch events are passive, so scroll should work. If there's blocking, it's likely from preventDefault in robot touchmove for horizontal swipes (line 2064). This is intentional for horizontal swipes but vertical scroll passes through correctly.

fix: |
  1. Moved shapesCanvas outside .shapes-area to be a sibling element,
     guaranteeing it participates in the root stacking context (no risk
     of overflow:hidden or future parent transforms trapping it).
  2. Added window._robotDrag shared state initialized to false.
     Robot mousedown sets it true + sets cursor:grabbing on both canvas AND container.
     Robot mouseup resets it false + restores cursor:grab.
     Shapes mousemove/mousedown handlers now check window._robotDrag and skip
     when robot is being interacted with, preventing cursor interference.
  3. Scroll was already working (passive touch events, no wheel capture).
     No changes needed.

verification: |
  - Browser test on https://devstudio-ai-delta.vercel.app confirmed:
    - shapesCanvas parent is now MAIN (outside shapes-area), z-index:9998
    - window._robotDrag initializes as false
    - After robot mousedown: canvas/container cursor = grabbing, body cursor = '' (shapes handler skipped)
    - After mousemove during robot drag: cursor stays grabbing (shapes handler correctly guarded)
    - After mouseup: cursor back to grab, robotDrag = false
    - Shapes render above services section at scroll boundary
    - No JS errors, no error overlays, page loads fully

files_changed:
  - index.html
