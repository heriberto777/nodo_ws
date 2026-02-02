const { getOrCreateConversation, touchConversation, updateConversationStatus } = require("../models/conversation.model");
const { getStateByConversation, upsertState } = require("../models/botstate.model");
const { getFlowById, getFirstActiveFlow } = require("../models/botflow.model");

const pauseKeywords = ["humano", "agente", "stop", "pausa"];

const matchTrigger = (trigger, text) => {
  if (!trigger) return false;
  if (trigger.contains && text.includes(String(trigger.contains).toLowerCase())) return true;
  if (trigger.equals && text === String(trigger.equals).toLowerCase()) return true;
  if (trigger.regex) {
    try {
      const re = new RegExp(trigger.regex, "i");
      return re.test(text);
    } catch (error) {
      return false;
    }
  }
  return false;
};

const evaluateFlow = (definition, text, currentState) => {
  if (!definition) return null;
  const lower = text.toLowerCase();
  const resolvedState = currentState || definition.initialState || null;
  const stateTriggers = resolvedState && definition.states ? definition.states[resolvedState] : null;
  const triggers = Array.isArray(stateTriggers)
    ? stateTriggers
    : Array.isArray(definition.triggers)
      ? definition.triggers
      : [];

  for (const trigger of triggers) {
    if (matchTrigger(trigger, lower)) {
      return {
        reply: trigger.reply || null,
        nextState: trigger.setState || resolvedState || null,
        pause: Boolean(trigger.pause)
      };
    }
  }

  if (definition.defaultReply) {
    return { reply: definition.defaultReply, nextState: resolvedState || null, pause: false };
  }

  return null;
};

const handleInboundMessage = async ({ lineId, from, body, displayName }) => {
  const conversation = await getOrCreateConversation({
    lineId,
    contact: from,
    displayName
  });
  await touchConversation(conversation.id);

  const text = (body || "").toLowerCase();
  if (pauseKeywords.some((keyword) => text.includes(keyword))) {
    const updated = await updateConversationStatus(conversation.id, "PAUSED");
    await upsertState({ conversationId: conversation.id, state: "PAUSED" });
    return { conversation: updated, paused: true };
  }

  if (conversation.status === "PAUSED") {
    return { conversation, paused: true };
  }

  const state = await getStateByConversation(conversation.id);
  const flow = state?.flow_id ? await getFlowById(state.flow_id) : await getFirstActiveFlow();

  if (!flow) {
    if (!state) {
      await upsertState({ conversationId: conversation.id, state: "NEW" });
    }
    return { conversation, paused: false, reply: null };
  }

  const result = evaluateFlow(flow.definition || {}, body || "", state?.state || null);
  if (result?.pause) {
    const updated = await updateConversationStatus(conversation.id, "PAUSED");
    await upsertState({ conversationId: conversation.id, state: "PAUSED", flowId: flow.id });
    return { conversation: updated, paused: true, reply: result.reply || null };
  }
  if (result?.nextState || !state) {
    await upsertState({
      conversationId: conversation.id,
      flowId: flow.id,
      state: result?.nextState || state?.state || flow.definition?.initialState || "ACTIVE",
      data: state?.data || null
    });
  }

  return { conversation, paused: false, reply: result?.reply || null };
};

module.exports = { handleInboundMessage };
