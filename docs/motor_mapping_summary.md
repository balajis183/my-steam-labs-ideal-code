# Motor Mapping & Lock-on-Generate — Team Summary

**Purpose**
This document summarizes the client requirements and the implementation plan for motor mapping and locking behavior when users generate code in the Blockly editor. Use this as the definitive text to share with the team.

---

## 1) High-level requirement
- When the user clicks **Generate**, the system must:
  - Resolve logical motor IDs (M1..M4) to concrete hardware mapping (motor driver channel + ESP32 GPIO pins).
  - Embed that mapping into the generated code as a clear, machine- and human-readable block (marked `DO NOT EDIT`).
  - Immediately lock motor-related blocks in the Blockly editor (non-editable, non-movable, non-deletable) so the mapping cannot be altered by the user.

## 2) Hardware wiring notes (client guidance)
- Each motor connector uses two wires in this design: SIGNAL and GROUND.
- Connect the motor GROUND directly to the ESP32 ground (GND).
- Connect the motor SIGNAL only to the motor driver input pin (driver input). Do not connect signal to power pins.
- Do NOT reverse signal and ground — this can damage the board.
- Typical wire colors: red = signal, black = ground. Always verify with the diagram the client provided.
- Follow the client schematic exactly when wiring the motors and drivers.

## 3) Mapping definition
- Mapping = authoritative table that maps each logical motor ID to the physical pins.
- Example mapping row format:

Motor ID | Driver (e.g., L293D U#) | Driver Channel | ESP32 GPIO A | ESP32 GPIO B | Enable / PWM | Notes
---|---:|---:|---:|---:|---:|---
M1 | U5 (L293D) | 1A/1Y | GPIO25 | GPIO26 | EN1 -> GPIO14 (PWM) | invert direction = true
M2 |  |  |  |  |  | 
M3 |  |  |  |  |  | 
M4 |  |  |  |  |  | 

- The mapping is used by the generators to produce constants/defines at the top of the generated code.

## 4) Generated code layout (recommended)
1. Header comment / metadata (generated-by, timestamp, DO NOT EDIT note for mapping)
2. Libraries / imports / includes
3. MAPPING BLOCK (DO NOT EDIT) — constants or #defines for each motor mapping
4. Library initialization / pin setup using mapping constants
5. Application code (setup/loop/main)

**Rationale**: Imports first, mapping next so init code can reference mapping constants, then initialization and main.

## 5) UI locking behavior
- Immediately after generation:
  - Call a helper (`lockMotorBlocks(true)`) to make motor blocks non-movable, non-deletable, and non-editable.
  - Render a visible cue (greyed block color or lock icon) and write a terminal message: `Mapping applied — M1 -> GPIOxx; Motor blocks locked.`
- Persistence: Save mapping and locked state with the project so reload preserves them.
- Unlock policy: Recommend **Soft Unlock** (explicit confirm/unlock action) unless the client requires a permanent lock.

## 6) Error handling and edge cases
- If mapping for a motor is missing at generate time: prompt the user to choose mapping (or abort — team to decide).
- If hardware wiring changes later: require unlock → edit mapping → regenerate to reapply mapping and re-lock.
- Provide a clear unlock audit (log change and reason) for safety.

## 7) Acceptance criteria (QA checklist)
1. Create a `dc_motor` block selecting M1; click **Generate**.
2. Generated code contains a mapping header/block with constants for M1.
3. Motor blocks in the Blockly workspace are locked: cannot modify M1->M2, cannot drag or delete motor blocks.
4. Save project and reload — mapping and locked state persist.
5. Unlock flow (if soft unlock enabled) requires explicit confirmation.

## 8) Files to update (developer notes)
- `ui/scripts/blockly_page.js` — add `lockMotorBlocks(lock)` helper and call it after generation; show terminal messages.
- `blockly/generators/*/index.js` — update generators to insert mapping header/constants into generated output (after imports).
- Project save/load code — persist mapping and locked state in project XML/JSON so reload preserves mapping.

## 9) Next steps / items to get from client
1. Provide canonical per‑motor mapping table (fill the table in section 3). Example row: `M1 | L293D U5 | 1A/1Y | GPIO25 | GPIO26 | EN1->GPIO14 | invert=true`.
2. Confirm lock policy: **Soft Unlock** or **Permanent Lock**.
3. Confirm where mapping should be displayed: terminal only, terminal + toolbar, or terminal + top-of-file constants (recommended includes constants).

---

If you want, I can also produce an HTML and PDF-ready version of this document in the `docs/` folder so you can export it to PDF and share with the team.

