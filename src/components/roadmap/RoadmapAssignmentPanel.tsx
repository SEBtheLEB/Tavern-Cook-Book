import type { TeamMember } from "../../utils/assignments";

interface RoadmapAssignmentPanelProps {
  assignedTo: string;
  reviewer: string;
  teamMembers: TeamMember[];
  disabled?: boolean;
  onAssign: (teammateId: string) => void;
  onReviewerChange: (teammateId: string) => void;
}

export function RoadmapAssignmentPanel({
  assignedTo,
  reviewer,
  teamMembers,
  disabled,
  onAssign,
  onReviewerChange
}: RoadmapAssignmentPanelProps) {
  return (
    <div className="roadmap-assignment-panel">
      <label>
        <span>Assigned</span>
        <select value={assignedTo} disabled={disabled} onChange={(event) => onAssign(event.target.value)}>
          <option value="">Unassigned</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Reviewer</span>
        <select value={reviewer} disabled={disabled} onChange={(event) => onReviewerChange(event.target.value)}>
          <option value="">No reviewer</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
