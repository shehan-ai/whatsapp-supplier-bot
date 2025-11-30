/**
 * Simple in-memory session manager
 * Stores user state and temporary data during the conversation
 */

const sessions = new Map();

// Session states
const STATES = {
  INITIAL: 'INITIAL',
  WAITING_FOR_ROLE: 'WAITING_FOR_ROLE',
  
  // Supplier Flow
  SUPPLIER_WAITING_AREAS: 'SUPPLIER_WAITING_AREAS',
  SUPPLIER_WAITING_TYPES: 'SUPPLIER_WAITING_TYPES',
  
  // Requester Flow
  REQUESTER_WAITING_LOCATION: 'REQUESTER_WAITING_LOCATION',
  REQUESTER_SELECTING_PROVINCE: 'REQUESTER_SELECTING_PROVINCE',
  REQUESTER_SELECTING_DISTRICT: 'REQUESTER_SELECTING_DISTRICT',
  REQUESTER_SELECTING_CITY: 'REQUESTER_SELECTING_CITY'
};

/**
 * Get session for a user, or create if not exists
 * @param {string} userId - Phone number
 */
function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      state: STATES.INITIAL,
      data: {},
      lastInteraction: Date.now()
    });
  }
  return sessions.get(userId);
}

/**
 * Update user state
 * @param {string} userId 
 * @param {string} newState 
 */
function updateState(userId, newState) {
  const session = getSession(userId);
  session.state = newState;
  session.lastInteraction = Date.now();
  sessions.set(userId, session);
}

/**
 * Update session data
 * @param {string} userId 
 * @param {Object} data 
 */
function updateData(userId, data) {
  const session = getSession(userId);
  session.data = { ...session.data, ...data };
  session.lastInteraction = Date.now();
  sessions.set(userId, session);
}

/**
 * Clear session (reset to initial)
 * @param {string} userId 
 */
function clearSession(userId) {
  sessions.delete(userId);
}

module.exports = {
  STATES,
  getSession,
  updateState,
  updateData,
  clearSession
};
