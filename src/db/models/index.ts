import User from './User';
import Project from './Project';
import Bug from './Bug';
import ProjectMember from './ProjectMember';
import AccessRequest from './AccessRequest';

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

export { User, Project, Bug, ProjectMember, AccessRequest };
