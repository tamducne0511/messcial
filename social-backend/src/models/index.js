const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const Reaction = require('./Reaction');
const Session = require('./Session');
const PostMedia = require('./PostMedia');
const Friend = require('./Friend');
const Notification = require('./Notification');
const Message = require('./Message');
const Conversation = require('./Conversation');
const ConversationMembers = require('./ConversationMembers')
// User
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(ConversationMembers, { foreignKey: 'userId', as: 'joinedConversations' });

// Conversation
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Conversation.hasMany(ConversationMembers, { foreignKey: 'conversationId', as: 'members' });

// Message
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// ConversationMembers
ConversationMembers.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ConversationMembers.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

Post.belongsTo(Post, { as: 'SharedPost', foreignKey: 'sharedPostId' });
Post.hasMany(Post, { as: 'SharedByPosts', foreignKey: 'sharedPostId' });

module.exports = { User, Session, Post, PostMedia, Comment, Reaction, Friend, Notification, Message, Conversation, ConversationMembers };