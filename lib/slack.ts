import { Block, ChatPostMessageResponse, MessageAttachment, WebClient } from '@slack/web-api';
import { User } from '@slack/web-api/dist/types/response/UsersLookupByEmailResponse';
import metrics from '@/metrics';

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

interface SlackMessageOptions {
  text: string;
  blocks?: Block[]; // Slack block kit blocks
  attachments?: MessageAttachment[]; // Slack message attachments
  thread_ts?: string; // Thread timestamp for replies
}

/**
 * Send a message to a Slack channel
 * @param channelId The ID of the channel to send the message to (e.g., 'C1234567890')
 * @param options Message options including text, blocks, and attachments
 * @returns The Slack API response
 */
export async function sendChannelMessage(
  channelId: string,
  options: SlackMessageOptions,
): Promise<ChatPostMessageResponse> {
  try {
    const result = await slack.chat.postMessage({
      channel: channelId,
      text: options.text,
      blocks: options.blocks,
      attachments: options.attachments,
      thread_ts: options.thread_ts,
    });

    metrics.increment('sucess.send_channel_msg', 1);
    return result;
  } catch (error) {
    metrics.increment('errors.send_channel_msg', 1);
    console.error('Error sending message to Slack channel:', error);
    throw error;
  }
}

/**
 * Send a direct message to a Slack user
 * @param userId The ID of the user to send the message to (e.g., 'U1234567890')
 * @param options Message options including text, blocks, and attachments
 * @returns The Slack API response
 */
export async function sendUserMessage(
  userId: string,
  options: SlackMessageOptions,
): Promise<ChatPostMessageResponse> {
  try {
    // First, open a direct message channel with the user
    const conversation = await slack.conversations.open({
      users: userId,
    });

    if (!conversation.channel?.id) {
      throw new Error('Failed to open conversation with user');
    }

    // Then send the message to the DM channel
    const result = await slack.chat.postMessage({
      channel: conversation.channel.id,
      text: options.text,
      blocks: options.blocks,
      attachments: options.attachments,
      thread_ts: options.thread_ts,
    });

    metrics.increment('success.send_user_msg', 1);
    return result;
  } catch (error) {
    metrics.increment('errors.send_user_msg', 1);
    console.error('Error sending message to Slack user:', error);
    throw error;
  }
}

/**
 * Helper to create a simple text block for Slack messages
 */
export function createTextBlock(text: string) {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: text,
    },
  };
}

/**
 * Helper to create a button block for Slack messages
 */
export function createButtonBlock(text: string, actionId: string, value: string) {
  return {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: text,
        },
        action_id: actionId,
        value: value,
      },
    ],
  };
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const lookup = await slack.users.lookupByEmail({ email: email });
  return lookup.user;
}

export async function checkSlackUserExists(email: string): Promise<boolean> {
  try {
    await getUserByEmail(email);
    metrics.increment('success.check_slack_user_exists', 1);
    return true;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    metrics.increment('errors.check_slack_user_exists', 1);
    return false;
  }
}
