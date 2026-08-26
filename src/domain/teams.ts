import { z } from "zod";

export const teamIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const wikiPageIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);

export const teamConnectionSchema = z.object({
  reason: z.string().trim().min(1).max(180),
  teamId: teamIdSchema,
});

export const teamContentSchema = z.object({
  currentFocus: z.string().trim().min(1).max(220),
  icon: z.string().trim().min(1).max(8),
  leadUserId: z.string().min(1).max(128).nullable(),
  name: z.string().trim().min(2).max(80),
  order: z.number().int().min(0).max(1000),
  owns: z.array(z.string().trim().min(1).max(100)).min(1).max(12),
  purpose: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(1).max(180),
  wikiPageId: wikiPageIdSchema.nullable(),
  connections: z.array(teamConnectionSchema).max(12).superRefine((connections, context) => {
    const seen = new Set<string>();
    connections.forEach((connection, index) => {
      if (seen.has(connection.teamId)) {
        context.addIssue({ code: "custom", message: "Each connected team can appear once", path: [index, "teamId"] });
      }
      seen.add(connection.teamId);
    });
  }),
});

export const teamViewSchema = teamContentSchema.extend({
  id: teamIdSchema,
  revision: z.number().int().min(0),
  updatedAt: z.iso.datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type TeamView = z.infer<typeof teamViewSchema>;

export function createDefaultTeams(societyName: string): z.infer<typeof teamContentSchema>[] {
  const team = (
    name: string,
    icon: string,
    summary: string,
    purpose: string,
    currentFocus: string,
    owns: string[],
    order: number,
    wikiPageId: string | null,
    connections: Array<[string, string]>,
  ): z.infer<typeof teamContentSchema> => teamContentSchema.parse({
    connections: connections.map(([teamId, reason]) => ({ teamId, reason })),
    currentFocus,
    icon,
    leadUserId: null,
    name,
    order,
    owns,
    purpose,
    summary,
    wikiPageId,
  });

  return [
    team("Software", "⌁", "The control, telemetry and tools that let the pod think and communicate.", `Software turns ${societyName}’s system decisions into reliable code and useful test data.`, "Make the telemetry path dependable from pod sensors to the test-day dashboard.", ["Embedded control", "Telemetry", "Operator dashboard", "Software test infrastructure"], 0, "telemetry_board", [["electrical", "Receives sensor signals and sends safe commands through the pod electronics."], ["dynamics", "Turns models into control behaviour and returns data that validates those models."], ["systems", "Implements shared requirements and provides evidence for integration tests."]]),
    team("Dynamics", "↝", "The models and evidence behind how the pod moves, brakes and performs.", "Dynamics predicts pod behaviour so design choices can be made before hardware is put at risk.", "Close the gap between the braking model and measured performance from the next test campaign.", ["Vehicle modelling", "Braking performance", "Simulation", "Test-data analysis"], 1, "concepts", [["software", "Defines control assumptions and uses telemetry to validate the models."], ["mechanical", "Provides loads, tolerances and performance targets for physical design."], ["systems", "Turns competition goals into measurable performance requirements."]]),
    team("Mechanical", "⚙", "The structures, mechanisms and manufacturing that make the pod physical.", "Mechanical turns the system design into safe hardware that can be built, inspected and maintained.", "Prepare the chassis and braking assembly for the next integrated test.", ["Chassis", "Braking hardware", "Manufacturing", "Mechanical safety"], 2, "boards_overview", [["dynamics", "Uses predicted forces and feeds back real dimensions and test limits."], ["electrical", "Provides mounting, protection and cooling for electrical hardware."], ["systems", "Demonstrates that physical assemblies meet the pod-level requirements."]]),
    team("Electrical", "ϟ", "Power, sensors and electronics connecting every physical and digital system.", "Electrical gives the pod safe power, trustworthy sensing and a dependable route between hardware and software.", "Validate the low-voltage system and sensor chain before integration day.", ["Low-voltage power", "Sensor interfaces", "PCB design", "Electrical safety"], 3, "boards_overview", [["software", "Supplies trustworthy data and carries control commands to hardware."], ["mechanical", "Agrees packaging, mounting, cooling and access for every board and cable."], ["systems", "Proves power and sensing behaviour against shared safety requirements."]]),
    team("Systems", "◎", "The shared requirements, interfaces and tests that keep one pod from becoming separate projects.", "Systems holds the whole pod in view and makes every team’s decisions fit the same outcome.", "Turn the next test objective into an integration plan with named owners and evidence.", ["System architecture", "Requirements", "Interfaces", "Integration testing"], 4, "general_overview", [["software", "Aligns control and telemetry interfaces with the overall architecture."], ["dynamics", "Sets measurable performance targets and accepts model evidence."], ["mechanical", "Coordinates physical interfaces and integrated safety evidence."], ["electrical", "Coordinates power, signal and safety interfaces across the pod."]]),
    team("People & Operations", "✦", "The environment, access and practical support that let members do ambitious work together.", "People & Operations makes sure members understand the mission, meet one another and have what they need to contribute.", "Make the first two weeks welcoming, useful and consistent across every team.", ["Onboarding", "Society culture", "Events and socials", "Access and logistics"], 5, "Home", [["software", "Helps new software members meet their lead and reach a meaningful starter task."], ["dynamics", "Makes specialist knowledge approachable to members arriving with different experience."], ["mechanical", "Coordinates workshop access, inductions and safe ways to get involved."], ["electrical", "Connects new members with practical training and supervised first work."]]),
  ];
}
