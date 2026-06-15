import { useMemo, useState } from "react";
import type { AccessRole, AccessUserPermission, GoogleAccountUser } from "../types";
import {
  type TeamMember,
  type UserProfile,
  getCurrentUserProfile,
  getTeamMemberForGoogleUser,
  saveTeamMembers,
  saveUserProfiles
} from "../utils/assignments";
import { DriveAwareImage } from "./DriveAwareImage";
import { DriveImageSourceControls } from "./DriveImageSourceControls";
import { Icon } from "./Icon";

interface ProfilePageProps {
  currentUser: GoogleAccountUser;
  accessUsers: AccessUserPermission[];
  teamMembers: TeamMember[];
  profiles: UserProfile[];
  onTeamMembersChange: (members: TeamMember[]) => void;
  onProfilesChange: (profiles: UserProfile[]) => void;
  onOpenQuestDashboard?: () => void;
  onBack: () => void;
}

export function ProfilePage({
  currentUser,
  accessUsers,
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
  const accessByEmail = useMemo(
    () => new Map(accessUsers.map((user) => [normalizeEmail(user.email), user] as const)),
    [accessUsers]
  );
  const [draft, setDraft] = useState(profile);
  const canManageTeam = currentUser.role === "admin";

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
    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: "New Teammate",
      email: "",
      role: "Editor",
      avatar: "",
      permission: "viewer",
      department: ""
    };
    const next = [
      ...teamMembers,
      newMember
    ];
    saveTeamMembers(next);
    onTeamMembersChange(next);
  };

  const removeTeamMember = (memberId: string) => {
    const member = teamMembers.find((item) => item.id === memberId);
    if (memberId === currentMember.id || accessByEmail.has(normalizeEmail(member?.email || ""))) return;
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
          {draft.picture ? <DriveAwareImage src={draft.picture} alt="" /> : <Icon name="UserRound" className="h-10 w-10" />}
        </div>
        <div>
          <p>Profile</p>
          <h1 className="font-display">{draft.displayName}</h1>
          <span>{accessRoleLabel(currentUser.role)}{draft.role ? ` / ${draft.role}` : ""}</span>
        </div>
        {onOpenQuestDashboard && (
          <button className="button-frame primary" onClick={onOpenQuestDashboard}>
            Personal Quest Dashboard
          </button>
        )}
      </section>

      <section className="profile-edit-panel">
        <h2 className="font-display">My Profile</h2>
        <div className="profile-form-grid">
          <label>
            <span>Display name</span>
            <input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
          </label>
          <label>
            <span>Job title</span>
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
              <p>Settings-synced roster</p>
              <h2 className="font-display">Team Profiles</h2>
              <span>Access roles come from Settings &gt; Team Access. This page only manages names, avatars, departments, and assignment-only contacts.</span>
            </div>
            <button className="button-frame" onClick={addTeamMember}>
              <Icon name="Plus" className="h-4 w-4" />
              Add Assignment Contact
            </button>
          </header>
          <div className="team-member-list">
            {teamMembers.map((member) => {
              const access = accessByEmail.get(normalizeEmail(member.email));
              const accessManaged = Boolean(access);
              return (
                <article key={member.id} className="team-member-row">
                  <input value={member.name} placeholder="Name" onChange={(event) => updateTeamMember(member.id, { name: event.target.value })} />
                  <input
                    value={member.email}
                    placeholder="email@example.com"
                    disabled={accessManaged}
                    title={accessManaged ? "Change access emails in Settings > Team Access." : "Assignment-only contact email"}
                    onChange={(event) => updateTeamMember(member.id, { email: event.target.value })}
                  />
                  <input value={member.role} placeholder="Role/title" onChange={(event) => updateTeamMember(member.id, { role: event.target.value })} />
                  <DriveImageSourceControls
                    value={member.avatar}
                    label={`${member.name || "Teammate"} avatar`}
                    title="Choose Teammate Avatar"
                    compact
                    onChange={(avatar) => updateTeamMember(member.id, { avatar })}
                  />
                  <span className={`team-access-badge ${access?.role || "assignment-only"}`}>
                    {access ? accessRoleLabel(access.role) : "Assignment Only"}
                  </span>
                  <button
                    className="button-frame danger"
                    onClick={() => removeTeamMember(member.id)}
                    disabled={member.id === currentMember.id || accessManaged}
                    title={accessManaged ? "Remove Gmail access in Settings > Team Access." : "Remove assignment-only contact"}
                  >
                    Remove
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function accessRoleLabel(role: AccessRole) {
  if (role === "admin") return "Admin Access";
  if (role === "editor") return "Editor Access";
  if (role === "freelancer") return "Freelancer Access";
  return "Viewer Access";
}
