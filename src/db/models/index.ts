import User from './User';
import Project from './Project';
import Bug from './Bug';
import ProjectMember from './ProjectMember';
import AccessRequest from './AccessRequest';
import Invitation from './Invitation';
import WidgetToken from './WidgetToken';
import GitHubIntegration from './GitHubIntegration';
import GitHubRepo from './GitHubRepo';
import AgentConfig from './AgentConfig';

// User -> Projects (Owner)
User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User -> Bugs (Reporter)
User.hasMany(Bug, { foreignKey: 'reporterId', as: 'reportedBugs' });
Bug.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

// Project -> Bugs
Project.hasMany(Bug, { foreignKey: 'projectId', as: 'bugs' });
Bug.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// Project <-> User (Members)
Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'projectId', as: 'members' });
User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'userId', as: 'memberProjects' });

// Project -> ProjectMember
Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'projectMembers' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User -> ProjectMember
User.hasMany(ProjectMember, { foreignKey: 'userId', as: 'memberships' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Project -> AccessRequests
Project.hasMany(AccessRequest, { foreignKey: 'projectId', as: 'accessRequests' });
AccessRequest.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User -> AccessRequests
User.hasMany(AccessRequest, { foreignKey: 'userId', as: 'accessRequests' });
AccessRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Project -> Invitations
Project.hasMany(Invitation, { foreignKey: 'projectId', as: 'invitations' });
Invitation.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User -> Invitations (inviter)
User.hasMany(Invitation, { foreignKey: 'invitedBy', as: 'sentInvitations' });
Invitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' });

// Project -> WidgetToken (one-to-one)
Project.hasOne(WidgetToken, { foreignKey: 'projectId', as: 'widgetToken' });
WidgetToken.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// Project -> GitHubIntegration (one-to-one)
Project.hasOne(GitHubIntegration, { foreignKey: 'projectId', as: 'githubIntegration' });
GitHubIntegration.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User -> GitHubIntegration (connected by)
User.hasMany(GitHubIntegration, { foreignKey: 'connectedBy', as: 'githubIntegrations' });
GitHubIntegration.belongsTo(User, { foreignKey: 'connectedBy', as: 'connectedByUser' });

// GitHubIntegration -> GitHubRepo (one-to-many)
GitHubIntegration.hasMany(GitHubRepo, { foreignKey: 'integrationId', as: 'repos' });
GitHubRepo.belongsTo(GitHubIntegration, { foreignKey: 'integrationId', as: 'integration' });

// Project -> AgentConfig (one-to-one)
Project.hasOne(AgentConfig, { foreignKey: 'projectId', as: 'agentConfig' });
AgentConfig.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

export { User, Project, Bug, ProjectMember, AccessRequest, Invitation, WidgetToken, GitHubIntegration, GitHubRepo, AgentConfig };
