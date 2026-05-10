import { useMemo, useState } from "react";
import type { GoogleAccountUser } from "../types";
import {
  type AssignmentPermission,
  type TeamMember,
  type UserProfile,
  getCurrentUserProfile,
  getTeamMemberForGoogleUser,
  saveTeamMembers,
  saveUserProfiles
} from "../utils/assignments";
import { CustomSelect } from "./CustomSelect";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { Icon } from "./Icon";

interface ProfilePageProps {
  currentUser: GoogleAccountUser;
  teamMembers: TeamMember[];
  profiles: UserProfile[];
  onTeamMembersChange: (members: TeamMember[]) => void;
  onProfilesChange: (profiles: UserProfile[]) => void;
  onOpenQuestDashboard: () => void;
  onBack: () => void;
}

const permissions: AssignmentPermission[] = ["owner", "admin", "editor", "viewer"];

export function ProfilePage({
  currentUser,
  teamMembers,
  profiles,
  onTeamMembersChange,
  onProfilesChange,
  onOpenQuestDashboard,
  onBack
}: ProfilePageProps) {
  const currentMember = getTeamMemberForGoogleUser(currentUser, teamMembers);
  const profile = useMemo(
    () => getCurrentUserProfile(currentUser, teamMembers, profiles),
    [currentUser, profiles, teamMembers]
  );
  const [draft, setDraft] = useState(profile);
  const canManageTeam = currentMember.permission === "owner" || currentMember.permission === "admin";

  const saveProfile = () => {
    const next = [
      ...profiles.filter((item) => item.email !== draft.email),
      draft
    ];
    saveUserProfiles(next);
    onProfilesChange(next);
  };

  const updateTeamMember = (memberId: string, patch: Partial<TeamMember>) => {
    const next = teamMembers.map((member) => member.id === memberId ? { ...member, ...patch } : member);
    saveTeamMembers(next);
    onTeamMembersChange(next);
  };

  const addTeamMember = () => {
    const next = [
      ...teamMembers,
      {
        id: `team-${Date.now()}`,
        name: "New Teammate",
        email: "",
        role: "Editor",
        avatar: "",
        permission: "viewer" as AssignmentPermission,
        department: ""
      }
    ];
    saveTeamMembers(next);
    onTeamMembersChange(next);
  };

  const removeTeamMember = (memberId: string) => {
    if (memberId === currentMember.id) return;
    const next = teamMembers.filter((member) => member.id !== memberId);
    saveTeamMembers(next);
    onTeamMembersChange(next);
  };

  return (
    <div className="profile-page">
      <button className="button-frame quest-back-button" onClick={onBack}>
        <Icon name="ChevronDown" className="h-4 w-4 rotate-90" />
        Back
      </button>

      <section className="profile-header-panel">
        <div className="quest-profile-avatar large">
          {draft.picture ? <img src={draft.picture} alt="" /> : <Icon name="UserRound" className="h-10 w-10" />}
        </div>
        <div>
          <p>Profile</p>
          <h1 className="font-display">{draft.displayName}</h1>
          <span>{draft.role || currentUser.role}</span>
        </div>
        <button className="button-frame primary" onClick={onOpenQuestDashboard}>
          Personal Quest Dashboard
        </button>
      </section>

      <section className="profile-edit-panel">
        <h2 className="font-display">My Profile</h2>
        <div className="profile-form-grid">
          <label>
            <span>Display name</span>
            <input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
          </label>
          <label>
            <span>Role/title</span>
            <input value={draft.role} placeholder="Producer, Writer, Animator..." onChange={(event) => setDraft({ ...draft, role: event.target.value })} />
          </label>
          <label>
            <span>Profile picture</span>
            <DriveImageSourceControls
              value={draft.picture}
              label={`${draft.displayName || "Profile"} picture`}
              title="Choose Profile Picture"
              compact
              onChange={(picture) => setDraft({ ...draft, picture })}
            />
          </label>
          <label>
            <span>Department</span>
            <input value={draft.department} placeholder="Art, Writing, Engineering..." onChange={(event) => setDraft({ ...draft, department: event.target.value })} />
          </label>
          <label className="wide">
            <span>Bio</span>
            <textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} />
          </label>
        </div>
        <button className="button-frame primary" onClick={saveProfile}>
          Save Profile
        </button>
      </section>

      {canManageTeam && (
        <section className="profile-edit-panel">
          <header className="profile-panel-header">
            <div>
              <p>Owner/Admin</p>
              <h2 className="font-display">Team Members</h2>
            </div>
            <button className="button-frame" onClick={addTeamMember}>
              <Icon name="Plus" className="h-4 w-4" />
              Add Teammate
            </button>
          </header>
          <div className="team-member-list">
            {teamMembers.map((member) => (
              <article key={member.id} className="team-member-row">
                <input value={member.name} placeholder="Name" onChange={(event) => updateTeamMember(member.id, { name: event.target.value })} />
                <input value={member.email} placeholder="email@example.com" onChange={(event) => updateTeamMember(member.id, { email: event.target.value })} />
                <input value={member.role} placeholder="Role" onChange={(event) => updateTeamMember(member.id, { role: event.target.value })} />
                <DriveImageSourceControls
                  value={member.avatar}
                  label={`${member.name || "Teammate"} avatar`}
                  title="Choose Teammate Avatar"
                  compact
                  onChange={(avatar) => updateTeamMember(member.id, { avatar })}
                />
                <CustomSelect
                  value={member.permission}
                  onChange={(value) => updateTeamMember(member.id, { permission: value as AssignmentPermission })}
                  options={permissions}
                />
                <button className="button-frame danger" onClick={() => removeTeamMember(member.id)} disabled={member.id === currentMember.id}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
