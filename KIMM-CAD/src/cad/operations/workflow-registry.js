import { partCommands } from '../../workbenches/part/commands.js';
import { partDesignCommands } from '../../workbenches/part-design/commands.js';
import { sketcherCommands } from '../../workbenches/sketcher/commands.js';

/** Shared read-only registry composed from workbench-owned command definitions. */
export const workflowCommands = [
  ...partDesignCommands.map((command) => ({ ...command, workbench: 'Part Design' })),
  ...sketcherCommands.map((command) => ({ ...command, workbench: 'Sketcher' })),
  ...partCommands.map((command) => ({ ...command, workbench: 'Part' })),
];

export const commandById = new Map(workflowCommands.map((command) => [command.id, command]));
